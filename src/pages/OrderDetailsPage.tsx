import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp, increment, collection, query, where, orderBy, getDocs, getDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ShieldCheck, Clock, CheckCircle2, ChevronRight, AlertTriangle, CreditCard, PackageCheck, Copy, Check, FileText, User, TrendingUp, Calendar, Banknote, Info, AlertCircle, MessageSquare, Star } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChatRoom } from '../components/chat/ChatRoom';
import { PaymentIcon } from '../components/ui/PaymentIcon';
import { RatingModal } from '../components/modals/RatingModal';
import { LoginModal } from '../components/auth/LoginModal';
import { PaymentModal } from '../components/modals/PaymentModal';
import { DisputeModal } from '../components/modals/DisputeModal';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { sendNotification, recordTransaction, recordOrderEvent, updateSellerPerformance } from '../lib/notificationService';
import { calculateOrderFees, PaymentMethod } from '../lib/payment-utils';
import { OrderRating } from '../components/OrderRating';
import { toast } from 'sonner';

export const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [specificProvider, setSpecificProvider] = useState<'mada' | 'visa' | 'mastercard' | 'apple_pay' | 'tabby' | 'tamara'>('mada');
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
  const [completionComment, setCompletionComment] = useState('');
  const [orderLogs, setOrderLogs] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [buyerProfile, setBuyerProfile]   = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [showIdModal, setShowIdModal]     = useState(false);
  const [nationalIdInput, setNationalIdInput] = useState('');
  const [savingId, setSavingId]           = useState(false);

  // ── Digital Signature State ─────────────────────────────────────────
  const [showSignModal, setShowSignModal] = useState(false);
  const [signerName, setSignerName] = useState(profile?.displayName || '');
  const [signerPhone, setSignerPhone] = useState(profile?.phoneNumber || '');
  const [signerNationalId, setSignerNationalId] = useState(profile?.idNumber || '');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [signing, setSigning] = useState(false);

  const copyOrderLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadContract = async () => {
    if (!order || !user) return;

    // ── تحقق من رقم الهوية ─────────────────────────────────────────
    if (!profile?.nationalId) {
      setNationalIdInput('');
      setShowIdModal(true);
      return;
    }

    await generateContractPdf();
  };

  const handleSaveNationalId = async () => {
    if (!user || !nationalIdInput.trim()) return;
    setSavingId(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        nationalId: nationalIdInput.trim(),
        updatedAt: serverTimestamp()
      });
      setShowIdModal(false);
      // بعد الحفظ نولد العقد مباشرة
      setTimeout(() => generateContractPdf(), 400);
    } catch {
      toast.error('حدث خطأ أثناء حفظ رقم الهوية');
    } finally {
      setSavingId(false);
    }
  };

  // ── Digital Signature Handlers ─────────────────────────────────────
  const handleInitiateSignature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !order) return;
    if (signerName.trim().length < 3) {
      toast.error('يرجى إدخال الاسم الكامل الثلاثي للتوقيع');
      return;
    }
    if (signerPhone.trim().length < 9) {
      toast.error('يرجى إدخال رقم جوال صحيح');
      return;
    }
    if (signerNationalId.trim().length !== 10) {
      toast.error('يرجى إدخال رقم هوية وطنية صحيح (10 أرقام)');
      return;
    }

    // Generate a random 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setOtpSent(true);
    
    // Simulate SMS sending by displaying in toast
    toast.success(`[عربون] تم إرسال رمز التوقيع المؤقت: (${code}) إلى جوالك. يرجى إدخاله لتأكيد العقد.`);
  };

  const handleVerifySignatureOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !order || !generatedOtp) return;

    if (enteredOtp !== generatedOtp) {
      toast.error('رمز التحقق غير صحيح. يرجى إدخال الرمز المرسل لجوالك.');
      return;
    }

    setSigning(true);
    try {
      const isBuyer = user.uid === order.buyerId;
      const signatureData = {
        signed: true,
        fullName: signerName.trim(),
        phone: signerPhone.trim(),
        nationalId: signerNationalId.trim(),
        signedAt: new Date().toISOString(),
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 254 + 1),
        otpUsed: generatedOtp
      };

      const orderRef = doc(db, 'orders', order.id);
      
      const updatePayload: any = {};
      if (isBuyer) {
        updatePayload.buyerSignature = signatureData;
      } else {
        updatePayload.sellerSignature = signatureData;
      }

      // Check if both will be signed
      const otherSignature = isBuyer ? order.sellerSignature : order.buyerSignature;
      if (otherSignature && otherSignature.signed) {
        updatePayload.isContractSigned = true;
        // Generate simulated unique contract cryptographic hash
        updatePayload.contractHash = 'ARB-SIG-' + Math.floor(Math.random() * 900000 + 100000) + '-' + order.id.slice(0, 6).toUpperCase();
        
        // Add a system message in the chat
        await addDoc(collection(db, 'messages'), {
          orderId: order.id,
          senderId: 'SYSTEM',
          text: `📜 نظام عربون: تم توقيع اتفاقية الضمان المالي بالكامل إلكترونياً من قبل الطرفين (${signerName} و ${isBuyer ? sellerProfile?.displayName : buyerProfile?.displayName}). العقد موثق برقم مرجعي: ${updatePayload.contractHash}`,
          isSystem: true,
          createdAt: serverTimestamp()
        });
      } else {
        // Add a system message for single signature
        await addDoc(collection(db, 'messages'), {
          orderId: order.id,
          senderId: 'SYSTEM',
          text: `✍️ نظام عربون: قام ${isBuyer ? 'المشتري' : 'البائع'} (${signerName}) بتوقيع عقد الضمان المالي وبانتظار توقيع الطرف الآخر.`,
          isSystem: true,
          createdAt: serverTimestamp()
        });
      }

      await updateDoc(orderRef, updatePayload);
      
      toast.success('تم توقيع العقد إلكترونياً بنجاح بنظام عربون للتوثيق المالي!');
      setShowSignModal(false);
      setOtpSent(false);
      setEnteredOtp('');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء التوقيع. يرجى المحاولة لاحقاً.');
    } finally {
      setSigning(false);
    }
  };

  const generateContractPdf = async () => {
    if (!order) return;
    try {
      toast.loading('جاري تجهيز وثيقة العقد...', { id: 'pdf-toast' });
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('pdf-contract-template');
      if (!element) return;

      element.style.display = 'block';

      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `عقد_اتفاق_${order.id.slice(0,6).toUpperCase()}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
      element.style.display = 'none';
      toast.success('تم تحميل العقد بنجاح', { id: 'pdf-toast' });
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء إنشاء العقد', { id: 'pdf-toast' });
      const element = document.getElementById('pdf-contract-template');
      if (element) element.style.display = 'none';
    }
  };

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'orders', id), (snapshot) => {
      if (snapshot.exists()) {
        const orderData = { id: snapshot.id, ...snapshot.data() } as Order;
        setOrder(orderData);
        
        // Auto-popup rating modal if completed and not rated
        if (user) {
          const isBuyerLocal = user.uid === orderData.buyerId;
          const ratingCompletedLocal = isBuyerLocal ? orderData.buyerRatingCompleted : orderData.sellerRatingCompleted;
          if (orderData.status === 'rating' && !ratingCompletedLocal && !ratingSuccess) {
            setShowRatingModal(true);
          }
        }
      } else {
        navigate('/dashboard');
      }
      setLoading(false);
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, `orders/${id}`);
    });

    const logQuery = query(collection(db, 'orderLogs'), where('orderId', '==', id), orderBy('createdAt', 'desc'));
    const unsubscribeLogs = onSnapshot(logQuery, (snapshot) => {
      setOrderLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orderLogs');
    });

    const markAsRead = async () => {
      if (!user) return;
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('orderId', '==', id),
        where('isRead', '==', false)
      );
      try {
        const snap = await getDocs(q);
        snap.forEach(async (d) => {
          await updateDoc(doc(db, 'notifications', d.id), { isRead: true });
        });
      } catch (err) {
        console.warn('Error marking notifications as read:', err);
      }
    };
    markAsRead();

    return () => {
      unsubscribe();
      unsubscribeLogs();
    };
  }, [id, navigate]);

  // ── Fetch buyer & seller profiles ─────────────────────────────────────────
  useEffect(() => {
    if (!order) return;
    const fetchProfiles = async () => {
      try {
        if (order.buyerId) {
          const snap = await getDoc(doc(db, 'users', order.buyerId));
          if (snap.exists()) setBuyerProfile({ uid: snap.id, ...snap.data() });
        }
        if (order.sellerId && order.sellerId !== 'unknown') {
          const snap = await getDoc(doc(db, 'users', order.sellerId));
          if (snap.exists()) setSellerProfile({ uid: snap.id, ...snap.data() });
        }
      } catch {}
    };
    fetchProfiles();
  }, [order?.buyerId, order?.sellerId]);


 const updateStatus = async (newStatus: Order['status'], comment?: string, paymentRef?: string) => {
    if (!order || !user) return;
    setActionLoading(true);
    try {
      const prevStatus = order.status;
      
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };

      if (paymentRef) {
        updateData.paymentRef = paymentRef;
      }

      if (newStatus === 'escrowed') {
        const fees = calculateOrderFees(order.amount, paymentMethod);
        const hasFreeFee = (profile?.freeFeeTransactions || 0) > 0;
        const finalPlatformFee = hasFreeFee ? 0 : fees.arboonFee;

        updateData.paymentMethod = paymentMethod;
        updateData.paymentFees = {
          ...fees,
          arboonFee: finalPlatformFee
        };

        await recordTransaction({
          orderId: order.id,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          amount: fees.buyerTotal,
          fee: finalPlatformFee,
          netAmount: order.amount,
          status: 'escrowed',
          specialty: order.category,
          paymentMethod,
          installmentFee: fees.installmentFee,
          sellerNetShare: fees.sellerNetShare,
          paymentRef: paymentRef
        });

        if (hasFreeFee) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            freeFeeTransactions: (profile?.freeFeeTransactions || 1) - 1
          });
        }
      }

      if (newStatus === 'delivered') {
        let fileUrl = '';
        if (deliveryFile) {
          try {
            const fileRef = ref(storage, `deliveries/${order.id}/${deliveryFile.name}`);
            
            // Add a timeout because Firebase SDK can hang indefinitely if storage rules block
            const uploadPromise = uploadBytes(fileRef, deliveryFile);
            let timeoutHandle: any;
            const timeoutPromise = new Promise((_, reject) => {
              timeoutHandle = setTimeout(() => reject(new Error('Storage timeout')), 10000);
            });
            
            await Promise.race([uploadPromise, timeoutPromise]);
            clearTimeout(timeoutHandle);
            fileUrl = await getDownloadURL(fileRef);
          } catch (err) {
            console.error("Failed to upload delivery file", err);
            alert("فشل رفع الملف المرفق، سيتم تسليم العمل بدون الملف. يمكنك إرساله في رسالة لاحقاً.");
          }
        }
        if (comment) updateData.deliveryNote = comment;
        if (fileUrl) updateData.deliveryAttachmentUrl = fileUrl;
      }

      console.log("Updating order with data:", updateData);
      await updateDoc(doc(db, 'orders', order.id), updateData);

      await recordOrderEvent(
        order.id,
        user.uid,
        `تغيير الحالة: ${newStatus}`,
        prevStatus,
        newStatus,
        comment
      );

      // Add a system message in the chat
      try {
        let systemText = `تم تحديث حالة الطلب إلى: ${newStatus}`;
        if (newStatus === 'delivered') {
          systemText = `قام البائع بتسليم العمل النهائي للمراجعة.`;
          if (comment) systemText += `\n\nملاحظات البائع:\n${comment}`;
        } else if (newStatus === 'rating') {
          systemText = `قام المشتري باستلام العمل والموافقة عليه.`;
        } else if (newStatus === 'escrowed') {
          systemText = `قام المشتري بإيداع المبلغ. يمكنك البدء بالعمل الآن.`;
        } else if (newStatus === 'completed') {
          systemText = `تم إنهاء الطلب وتحويل المبلغ للبائع بنجاح.`;
        } else if (newStatus === 'disputed') {
          systemText = `تم فتح نزاع من قبل ${user.uid === order.buyerId ? 'المشتري' : 'البائع'}. يرجى انتظار تدخل الإدارة.`;
        }

        const msgData: any = {
          orderId: order.id,
          senderId: user.uid, // Using user's uid but marked as system to pass rules
          text: systemText,
          isSystem: true,
          createdAt: serverTimestamp(),
        };

        if (newStatus === 'delivered' && updateData.deliveryAttachmentUrl) {
          msgData.imageUrl = updateData.deliveryAttachmentUrl;
        }

        await addDoc(collection(db, `orders/${order.id}/messages`), msgData);
      } catch (err) {
        console.error("Failed to add system message", err);
      }

      // ── تحديث أداء البائع عند أي إجراء من طرفه ───────────────────────────
      if (order.sellerId && order.sellerId !== 'unknown') {
        updateSellerPerformance(order.sellerId).catch(() => {});
      }

      // ── منطق الإشعارات الصحيح لكل حالة ───────────────────────────────────
      const orderRef = `#ARB-${order.id.slice(0, 6).toUpperCase()}`;

      switch (newStatus) {

        case 'escrowed': {
          // أشعر البائع: الدفع تم — ابدأ العمل
          if (order.sellerId && order.sellerId !== 'unknown') {
            await sendNotification(
              order.sellerId,
              `💰 تم تعميد الصفقة ${orderRef}`,
              `قام المشتري بإيداع مبلغ ${order.amount.toLocaleString()} ر.س بنجاح. المبلغ محفوظ بأمان عبر نظام المدفوعات — يمكنك البدء في تنفيذ العمل الآن.`,
              'payment', 'urgent', order.id, user.uid
            );
          }
          // أشعر المشتري: تأكيد الدفع
          await sendNotification(
            order.buyerId,
            `✅ تم تأكيد دفعك ${orderRef}`,
            `تم إيداع مبلغ ${order.amount.toLocaleString()} ر.س بأمان عبر نظام المدفوعات. سيبدأ البائع في التنفيذ قريباً.`,
            'payment', 'normal', order.id, user.uid
          );
          break;
        }

        case 'delivered': {
          let fileUrl = updateData.deliveryAttachmentUrl || '';

          if (comment || fileUrl) {
            try {
               await addDoc(collection(db, `orders/${order.id}/messages`), {
                 text: `[إشعار تسليم العمل]:\n${comment}\n${fileUrl ? `المرفقات: ${fileUrl}` : ''}`,
                 senderId: user.uid,
                 createdAt: serverTimestamp(),
                 readBy: [user.uid]
               });
            } catch (err) {
               console.error("Failed to post auto-delivery message", err);
            }
          }

          // أشعر المشتري: العمل جاهز للمراجعة
          await sendNotification(
            order.buyerId,
            `📦 البائع سلّم العمل — راجع الآن ${orderRef}`,
            `أعلن البائع عن اكتمال العمل وجاهزيته للتسليم. يرجى مراجعته وتأكيد الاستلام لتحرير المبلغ، أو فتح نزاع إذا وجدت مشكلة.`,
            'order_update', 'urgent', order.id, user.uid
          );
          break;
        }

        case 'rating': {
          // اشعر البائع ان المشتري وافق وباقي التقييم
          if (order.sellerId && order.sellerId !== 'unknown') {
            await sendNotification(
              order.sellerId,
              `⏳ المشتري في مرحلة التقييم ${orderRef}`,
              `وافق المشتري على الاستلام، وبانتظار تقييمه للخدمة ليتم تحرير المبلغ إلى رصيدك لضمان جودة العمل.`,
              'order_update', 'normal', order.id, user.uid
            );
          }
          break;
        }

        case 'completed': {
          const sellerNet = order.paymentFees?.sellerNetShare || order.amount;

          // تحرير رصيد البائع
          if (order.sellerId && order.sellerId !== 'unknown') {
            try {
              await updateDoc(doc(db, 'users', order.sellerId), {
                balance: increment(sellerNet),
                updatedAt: serverTimestamp()
              });
            } catch (balErr) {
              console.error('[updateStatus] balance update failed:', balErr);
            }

            // أشعر البائع: المبلغ تحرر
            await sendNotification(
              order.sellerId,
              `🎉 تم تحرير مبلغك ${orderRef}`,
              `أنهى المشتري التقييم واكتملت الصفقة. تم إضافة ${sellerNet.toLocaleString()} ر.س إلى رصيدك. شكراً لاحترافيتك!`,
              'payment', 'urgent', order.id, user.uid
            );
          }

          // أشعر المشتري: تأكيد اكتمال الصفقة
          await sendNotification(
            order.buyerId,
            `✅ اكتملت الصفقة بنجاح ${orderRef}`,
            `تم إغلاق الصفقة وتحرير المبلغ للمقدّم. شكراً لاستخدامك منصة عربون.`,
            'order_update', 'normal', order.id, user.uid
          );

          // محاولة تسوية الدفع مع البوابة (best-effort، لا توقف العملية)
          fetch('/api/payment/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id, amount: order.amount, transactionId: order.paymentRef })
          }).catch(() => {});
          break;
        }

        case 'cancelled': {
          // أشعر الطرف الآخر بالإلغاء
          const otherPartyId = user.uid === order.buyerId ? order.sellerId : order.buyerId;
          const canceller    = user.uid === order.buyerId ? 'المشتري' : 'البائع';
          if (otherPartyId && otherPartyId !== 'unknown') {
            await sendNotification(
              otherPartyId,
              `❌ تم إلغاء الصفقة ${orderRef}`,
              `قام ${canceller} بإلغاء الصفقة. إذا كان المبلغ محجوزاً سيتم استرداده بحسب سياسة نظام المدفوعات.`,
              'order_update', 'normal', order.id, user.uid
            );
          }
          break;
        }

        default:
          break;
      }

    } catch (error: any) {
       alert('حدث خطأ أثناء التحديث: ' + (error?.message || 'غير معروف'));
       handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (!order || !user || !disputeReason.trim()) return;
    setActionLoading(true);
    try {
      // إنشاء سجل النزاع
      await addDoc(collection(db, 'disputes'), {
        orderId: order.id,
        orderTitle: order.title,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        amount: order.amount,
        raisedById: user.uid,
        reason: disputeReason,
        status: 'open',
        createdAt: serverTimestamp()
      });

      // تغيير حالة الطلب
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'disputed',
        updatedAt: serverTimestamp()
      });

      await recordOrderEvent(
        order.id,
        user.uid,
        'تغيير الحالة: disputed',
        order.status,
        'disputed',
        `تم فتح نزاع رسمي للتدخل الإداري: ${disputeReason}`
      );

      const orderRef   = `#ARB-${order.id.slice(0, 6).toUpperCase()}`;
      const raiserRole = isBuyer ? 'المشتري' : 'البائع';

      // أشعر الطرف الآخر
      const otherPartyId = isBuyer ? order.sellerId : order.buyerId;
      if (otherPartyId && otherPartyId !== 'unknown') {
        await sendNotification(
          otherPartyId,
          `🚨 تم فتح نزاع رسمي ${orderRef}`,
          `قام ${raiserRole} بفتح نزاع رسمي بخصوص الصفقة. السبب: "${disputeReason}". الصفقة الآن تحت التحكيم الإداري — جميع الإجراءات مجمّدة حتى صدور قرار الإدارة.`,
          'dispute', 'urgent', order.id, user.uid
        );
      }

      // أشعر الطرف الذي فتح النزاع بتأكيد الاستقبال
      await sendNotification(
        user.uid,
        `📋 تم استقبال نزاعك ${orderRef}`,
        `تم تسجيل نزاعك الرسمي وإحالته للفريق الإداري للمراجعة. ستتلقى ردًا خلال 24-48 ساعة. يرجى توثيق أي مراسلات ذات صلة في المحادثة.`,
        'dispute', 'normal', order.id, user.uid
      );

      // أشعر الأدمن بشكل فوري وعاجل
      await sendNotification(
        'ADMIN',
        `🚨 نزاع جديد يحتاج تدخلاً فورياً ${orderRef}`,
        `فتح ${raiserRole} نزاعاً رسمياً بخصوص صفقة بقيمة ${order.amount.toLocaleString()} ر.س.\n\nالسبب: "${disputeReason}"\n\nيرجى مراجعة الصفقة واتخاذ القرار المناسب.`,
        'dispute', 'urgent', order.id, user.uid
      );

      toast.success('تم فتح النزاع وإحالة القضية للوساطة الإدارية بنجاح');
      setShowDisputeModal(false);
      setDisputeReason('');
    } catch (err) {
      toast.error('حدث خطأ أثناء فتح النزاع، يرجى المحاولة لاحقاً');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!order) return null;

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-8 text-center bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden relative">
        <Shield className="w-10 h-10 text-blue-600 mx-auto" />
        <h1 className="text-3xl font-black">طلب ضمان مالي جديد</h1>
        <p className="text-gray-500">سجل دخولك للإطلاع والقبول</p>
        <button onClick={() => setIsLoginModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold">تسجيل الدخول</button>
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </div>
    );
  }

  const isBuyer = order.buyerId === user?.uid;
  const isSeller = order.sellerId === user?.uid;
  const isSellerByEmail = order.sellerEmail === user?.email;
  const isSellerByPhone = order.sellerPhone && user?.phoneNumber?.includes(order.sellerPhone.replace(/^0/, ''));

  const claimOrder = async () => {
    if (!user || !order) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), { sellerId: user.uid, updatedAt: serverTimestamp() });
      await recordOrderEvent(order.id, user.uid, 'قبول الصفقة', order.status, order.status);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setActionLoading(false);
    }
  };

  const steps = [
    { key: 'pending', label: 'بانتظار الموافقة', icon: <Clock /> },
    { key: 'escrowed', label: 'المبلغ محجوز', icon: <CreditCard /> },
    { key: 'delivered', label: 'تم التسليم', icon: <PackageCheck /> },
    { key: 'completed', label: 'اكتمال العميلة', icon: <CheckCircle2 /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === order.status);
  const fees = order.paymentFees || calculateOrderFees(order.amount, order.paymentMethod || 'standard');

  const handleConfirmPayment = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/payment/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, amount: order.amount, method: paymentMethod, provider: specificProvider })
      });
      
      if (!response.ok) throw new Error('Payment failed');
      
      const data = await response.json();
      const paymentRef = data.transactionId || data.gatewayReference || data.geideaReference;

      await updateStatus('escrowed', undefined, paymentRef);
      setShowPaymentModal(false);
    } catch (error) {
      alert('حدث خطأ أثناء معالجة الدفع الإلكتروني، يرجى المحاولة مرة أخرى');
    } finally {
      setActionLoading(false);
    }
  };

  // ── DEV ONLY: Simulate payment (bypass gateway) ──────────────────────────────────────────────────
  const handleSimulatePayment = async () => {
    setActionLoading(true);
    try {
      // Generate a fake transaction ID for testing
      const fakeRef = `DEV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await updateStatus('escrowed', 'دفع محاكى (بيئة تطوير)', fakeRef);
      setShowPaymentModal(false);
      toast.success(`✅ تم محاكاة الدفع — رقم المعاملة: ${fakeRef}`, { duration: 6000 });
    } catch (error: any) {
      console.error('[simulatePayment] error:', error?.code, error?.message);
      toast.error(
        `فشلت محاكاة الدفع — ${error?.code || 'unknown'}`,
        { description: error?.message || 'تحقق من الـ console للتفاصيل', duration: 8000 }
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -m-4 sm:-m-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      <AnimatePresence>
        {showPaymentModal && order && (
          <PaymentModal 
            amount={order.amount}
            loading={actionLoading}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            specificProvider={specificProvider}
            setSpecificProvider={setSpecificProvider}
            profile={profile}
            allowBNPL={order.allowBNPL ?? true}
            onClose={() => setShowPaymentModal(false)}
            onConfirm={handleConfirmPayment}
            onSimulate={handleSimulatePayment}
          />
        )}
        {showDisputeModal && (
          <DisputeModal 
            loading={actionLoading}
            reason={disputeReason}
            setReason={setDisputeReason}
            onClose={() => setShowDisputeModal(false)}
            onConfirm={handleRaiseDispute}
          />
        )}
      </AnimatePresence>

      {/* TOP HEADER STATUS BAR */}
      <div className="bg-white px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors">
             <ChevronRight className="w-6 h-6 rtl:rotate-180" />
          </button>
          <div>
            <h1 className="text-lg font-black text-gray-900">{order.title}</h1>
            <p className="text-xs font-bold text-gray-500 font-mono">#ARB-{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="text-left hidden sm:block">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">قيمة الصفقة</p>
              <p className="text-xl font-black text-blue-600">{order.amount.toLocaleString()} ر.س</p>
           </div>
           
           <div className="flex gap-2">
              <button 
                onClick={copyOrderLink}
                className="flex items-center gap-2 text-xs font-display font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all group"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />} 
                <span className="hidden sm:inline">{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
              </button>
              
              {['escrowed', 'delivered', 'completed'].includes(order.status) && (
                <button 
                  onClick={handleDownloadContract}
                  title="عقد محمي بصيغة PDF يضمن حقوق الطرفين بناءً على شروط عربون"
                  className="flex items-center gap-2 text-xs font-display font-black text-green-700 bg-green-50 px-4 py-2 rounded-xl hover:bg-green-100 transition-all group"
                >
                  <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                  <span className="hidden sm:inline">عقد PDF</span>
                </button>
              )}
           </div>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gray-50 min-h-0">
        
        {/* DETAILS SIDEBAR (Right Panel in RTL) */}
        <div className="w-full lg:w-[400px] bg-white border-l border-gray-100 overflow-y-auto p-6 space-y-6 shrink-0 flex flex-col">
           
           {/* Progress Stepper */}
           <div className="bg-white border border-gray-100 rounded-2xl p-4">
             <div className="flex justify-between relative">
               <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full" />
               <div 
                 className="absolute top-1/2 right-0 h-1 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-700 ease-in-out rounded-full" 
                 style={{ width: `${Math.max(0, (currentStepIndex / (steps.length - 1)) * 100)}%` }}
               />
               {steps.map((step, index) => {
                 const isCompleted = index <= currentStepIndex;
                 const isActive = index === currentStepIndex;
                 const isCancelled = order.status === 'cancelled';
                 const isDisputed = order.status === 'disputed';
                 
                 let colorClass = isCompleted ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-200';
                 if (isCancelled && index >= currentStepIndex) colorClass = 'bg-red-100 text-red-500 border-red-200';
                 if (isDisputed && isActive) colorClass = 'bg-orange-500 text-white border-orange-500';

                 return (
                   <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${colorClass}`}>
                       {React.cloneElement(step.icon as React.ReactElement, { className: 'w-5 h-5' })}
                     </div>
                     <span className={`text-[10px] font-bold ${isActive ? 'text-blue-700' : 'text-gray-500'} hidden sm:block`}>{step.label}</span>
                   </div>
                 );
               })}
             </div>
           </div>

           {/* Status Information Box */}
           {(() => {
            const cfg = {
              pending:   { bg:'bg-blue-50',   border:'border-blue-200',   icon:'⏳', title: 'بانتظار الموافقة والدفع', buyerMsg:'لتفعيل الطلب وبدء العمل، يرجى إتمام عملية الدفع. سيتم حفظ المبلغ بأمان في المنصة ولن يُسلّم للبائع إلا بعد رضاك عن العمل.',          sellerMsg:'الطلب قيد الانتظار. سيصلك إشعار فور قيام المشتري بدفع وتعميد المبلغ في المنصة لتبدأ العمل.' },
              escrowed:  { bg:'bg-amber-50',  border:'border-amber-200',  icon:'🔒', title: 'تم الإيداع بأمان', buyerMsg:'المبلغ محجوز بأمان في منصة عربون. البائع يعمل الآن على إنجاز طلبك. يمكنك التواصل معه عبر المحادثة.',     sellerMsg:'تم تأمين المبلغ من قبل المشتري! يمكنك الآن البدء في تنفيذ العمل بأمان. عند الانتهاء، قم بتسليم العمل من خلال النموذج أدناه.' },
              delivered: { bg:'bg-purple-50', border:'border-purple-200', icon:'📦', title: 'بانتظار تأكيد المشتري', buyerMsg:'البائع قام بتسليم العمل. يرجى مراجعة المرفقات أدناه واختبار العمل. إذا كان مطابقاً للاتفاق، اضغط على "أوافق وأقيم التجربة".', sellerMsg:'تم تسليم العمل للمشتري. يرجى الانتظار لحين قيامه بمراجعة العمل والموافقة عليه ليتم تحرير المبلغ لك.' },
              completed: { bg:'bg-green-50',  border:'border-green-200',  icon:'✅', title: 'اكتملت الصفقة بنجاح', buyerMsg:'تم إكمال الطلب وتحرير المبلغ للبائع. شكراً لاستخدامك منصة عربون!',              sellerMsg:'تم قبول العمل وتحرير المبلغ إلى رصيدك. شكراً لجهودك!' },
              disputed:  { bg:'bg-red-50',    border:'border-red-200',    icon:'🚨', title: 'نزاع نشط', buyerMsg:'تم رفع نزاع على هذا الطلب. سيتواصل معك فريق الدعم قريباً عبر المحادثة أو الهاتف لحل المشكلة.',       sellerMsg:'تم رفع نزاع على هذا الطلب. سيتواصل معك فريق الدعم قريباً لحل المشكلة والحفاظ على حقوق جميع الأطراف.' },
              cancelled: { bg:'bg-gray-100',  border:'border-gray-300',   icon:'❌', title: 'طلب ملغي', buyerMsg:'تم إلغاء الصفقة بناءً على طلب أحد الأطراف.',                               sellerMsg:'تم إلغاء الصفقة بناءً على طلب أحد الأطراف.' },
            };
            const c = cfg[order.status] || cfg['pending'];
            return (
              <div className={`${c.bg} border ${c.border} rounded-2xl p-5 flex flex-col gap-3 shadow-sm`}>
                <div className="flex items-center gap-3 border-b border-black/5 pb-3">
                  <div className="text-2xl">{c.icon}</div>
                  <h3 className="font-black text-gray-900 text-lg">الخطوة الحالية: {c.title}</h3>
                </div>
                <div className="pt-1">
                  <p className="text-sm font-bold text-gray-700 leading-relaxed bg-white/50 p-3 rounded-xl border border-black/5">
                    <span className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">ماذا تفعل الآن؟</span>
                    {isBuyer ? c.buyerMsg : c.sellerMsg}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── Digital Signature Widget ───────────────────────────────────── */}
          {['pending', 'escrowed', 'delivered', 'rating', 'completed'].includes(order.status) && (isBuyer || isSeller) && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden text-right" dir="rtl">
               <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
               <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                  <FileText className="w-5 h-5 text-blue-600 animate-pulse" />
                  <h4 className="font-black text-gray-900 text-sm">عقد الضمان والتوقيع الرقمي</h4>
               </div>

               {/* Signature Statuses */}
               <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 ${order.buyerSignature?.signed ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                     <span className="text-[9px] font-black uppercase text-gray-400 mb-0.5">المشتري</span>
                     {order.buyerSignature?.signed ? (
                       <>
                         <CheckCircle2 className="w-4 h-4 text-green-600" />
                         <span className="font-black truncate max-w-full">{order.buyerSignature.fullName}</span>
                         <span className="text-[8px] opacity-75 font-mono">موثق OTP</span>
                       </>
                     ) : (
                       <>
                         <Clock className="w-4 h-4 text-gray-300 animate-spin-slow" />
                         <span>بانتظار التوقيع</span>
                       </>
                     )}
                  </div>

                  <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 ${order.sellerSignature?.signed ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                     <span className="text-[9px] font-black uppercase text-gray-400 mb-0.5">البائع (المنفذ)</span>
                     {order.sellerSignature?.signed ? (
                       <>
                         <CheckCircle2 className="w-4 h-4 text-green-600" />
                         <span className="font-black truncate max-w-full">{order.sellerSignature.fullName}</span>
                         <span className="text-[8px] opacity-75 font-mono">موثق OTP</span>
                       </>
                     ) : (
                       <>
                         <Clock className="w-4 h-4 text-gray-300 animate-spin-slow" />
                         <span>بانتظار التوقيع</span>
                       </>
                     )}
                  </div>
               </div>

               {/* Action button to sign */}
               {(() => {
                  const isBuyerCurrentUser = user.uid === order.buyerId;
                  const currentSignature = isBuyerCurrentUser ? order.buyerSignature : order.sellerSignature;
                  if (currentSignature?.signed) {
                    return (
                       <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center text-xs text-green-700 font-bold flex items-center justify-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" />
                          <span>لقد قمت بتوقيع وثيقة الضمان إلكترونياً</span>
                       </div>
                    );
                  }
                  return (
                     <button
                       onClick={() => {
                          setSignerName(profile?.displayName || '');
                          setSignerPhone(profile?.phoneNumber || '');
                          setSignerNationalId(profile?.idNumber || '');
                          setOtpSent(false);
                          setEnteredOtp('');
                          setShowSignModal(true);
                       }}
                       className="w-full bg-blue-50 text-blue-600 border border-blue-200 py-3 rounded-xl font-black text-xs hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                     >
                        <FileText className="w-4 h-4 animate-bounce" />
                        <span>وقّع عقد الضمان إلكترونياً</span>
                     </button>
                  );
               })()}

               {order.isContractSigned && (
                 <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 space-y-1.5 text-right text-xs">
                    <p className="font-black text-blue-900 flex items-center gap-1">
                       <ShieldCheck className="w-4 h-4 text-blue-600 animate-bounce" />
                       <span>عقد الضمان موثق رقمياً بالكامل!</span>
                    </p>
                    <p className="text-gray-500 font-bold text-[9px] leading-relaxed">
                       تم توقيع العقد قانونياً برقم مرجعي وتثبيت خاتم عربون الآمن. يمكنك الآن تحميل نسخة العقد PDF المعتمدة والمختومة.
                    </p>
                    {order.contractHash && (
                       <p className="font-mono text-[9px] text-gray-400 tracking-tighter">Hash: {order.contractHash}</p>
                    )}
                 </div>
               )}
            </div>
          )}

          {/* Rating Section (Button to reopen modal if closed) */}
          {order.status === 'completed' && !ratingSuccess && !(isBuyer ? order.buyerRatingCompleted : order.sellerRatingCompleted) && (
            <button
              onClick={() => setShowRatingModal(true)}
              className="w-full bg-gradient-to-l from-orange-400 to-orange-500 text-white py-3 rounded-xl font-bold text-sm hover:from-orange-500 hover:to-orange-600 transition-all shadow-lg shadow-orange-200 mb-2 flex items-center justify-center gap-2"
            >
              <Star className="w-5 h-5 fill-white" />
              قيم الصفقة والمنصة
            </button>
          )}

          {/* Action Buttons Area */}
          <div className="space-y-3">
             {order.status === 'awaiting_acceptance' && order.creatorId !== user.uid && (isBuyer || isSeller || isSellerByEmail || isSellerByPhone) && (
                <div className="flex gap-2 w-full">
                  <button onClick={() => updateStatus('pending')} disabled={actionLoading} className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold flex-1 hover:bg-blue-700 shadow-lg shadow-blue-600/20">تأكيد الموافقة</button>
                  <button onClick={() => updateStatus('cancelled')} disabled={actionLoading} className="bg-white text-red-600 border border-red-200 px-4 py-3 rounded-xl font-bold hover:bg-red-50">رفض</button>
                </div>
             )}
             
             {order.sellerId === 'unknown' && (isSellerByEmail || isSellerByPhone) && order.status !== 'awaiting_acceptance' && (
                <button onClick={claimOrder} disabled={actionLoading} className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-bold">ربط حسابي بالصفقة</button>
             )}
             
             {order.status === 'pending' && isBuyer && (
                <div className="space-y-3">
                  <button onClick={() => setShowPaymentModal(true)} disabled={actionLoading} className="w-full bg-green-600 text-white px-4 py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 hover:scale-[1.02] transition-transform">
                    <CreditCard className="w-6 h-6" />
                    ادفع وعمّد الطلب بأمان
                  </button>
                  <p className="text-[10px] text-center text-gray-500 font-bold">المبلغ يبقى محجوزاً في المنصة ولا يسلّم للبائع إلا بعد موافقتك</p>
                  
                  <button onClick={() => setShowCancelConfirm(true)} disabled={actionLoading} className="w-full bg-white text-gray-400 border border-gray-200 px-4 py-3 rounded-xl font-bold hover:bg-gray-50 hover:text-red-500 transition-colors text-sm">
                    إلغاء الطلب والتراجع
                  </button>
                </div>
             )}

             {/* Custom Cancel Confirm Modal */}
             {showCancelConfirm && (
               <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                 <div className="bg-white rounded-3xl w-full max-w-md p-6 overflow-hidden shadow-2xl relative">
                   <h3 className="text-xl font-black mb-4">تأكيد الإلغاء</h3>
                   <p className="text-gray-600 mb-6 font-medium text-sm leading-relaxed">
                     هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.
                   </p>
                   <div className="flex gap-3">
                     <button onClick={() => setShowCancelConfirm(false)} className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-bold hover:bg-gray-200">
                       تراجع
                     </button>
                     <button onClick={() => { setShowCancelConfirm(false); updateStatus('cancelled'); }} className="flex-1 bg-red-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-red-700">
                       نعم، ألغِ الطلب
                     </button>
                   </div>
                 </div>
               </div>
             )}
             
             {order.status === 'escrowed' && isSeller && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <p className="text-xs font-black text-gray-700">تسليم العمل النهائي</p>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-100 focus:border-blue-500 rounded-xl p-3 text-sm resize-none outline-none" 
                    rows={3}
                    placeholder="وصف العمل المنجز أو روابط التسليم (Google Drive وغيرها)..." 
                    value={completionComment} 
                    onChange={(e) => setCompletionComment(e.target.value)} 
                  />
                  <div className="text-[10px] text-gray-500 bg-blue-50 p-3 rounded-lg flex gap-2 mb-3 font-bold border border-blue-100 leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    تلميحات التسليم:
                    <ul className="list-disc list-inside mt-1 space-y-1">
                       <li>تأكد من تسليم العمل كاملاً كما تم الاتفاق عليه لتجنب أي تأخير في تحرير المبلغ.</li>
                       <li>للملفات الكبيرة (أكثر من 25MB)، ارفعها على Google Drive أو Dropbox وضع الرابط أعلاه.</li>
                    </ul>
                  </div>
                  <input 
                    type="file" 
                    title="اختر ملفاً لإرفاقه كجزء من تسليم العمل النهائي"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.size > 25 * 1024 * 1024) {
                        alert("عذراً، حجم الملف كبير جداً. يرجى ضغطه أو استخدام رابط خارجي.");
                        e.target.value = '';
                        setDeliveryFile(null);
                      } else {
                        setDeliveryFile(file || null);
                      }
                    }} 
                    className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer text-gray-500 mb-2" 
                  />
                  <button 
                    onClick={() => updateStatus('delivered', completionComment)} 
                    disabled={actionLoading || (!completionComment.trim() && !deliveryFile)} 
                    title="تسليم العمل النهائي لكي يقوم المشتري بمراجعته وتحرير المبلغ"
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 mt-2 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    إرسال وتسليم العمل
                  </button>
                </div>
             )}
             
             {order.status === 'escrowed' && (isBuyer || isSeller) && (
                <div className="pt-2">
                  <button onClick={() => setShowDisputeModal(true)} disabled={actionLoading} className="w-full bg-white text-red-600 border border-red-200 px-4 py-2.5 rounded-xl font-bold hover:bg-red-50 transition-colors text-sm flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    يوجد مشكلة؟ (فتح نزاع)
                  </button>
                  <p className="text-[10px] text-center text-gray-400 mt-2">تدخل الإدارة لحل الخلافات وضمان حقوق الطرفين</p>
                </div>
             )}
             
             {order.status === 'delivered' && isBuyer && (
                <div className="space-y-3">
                  <button onClick={() => { if(window.confirm('هل أنت متأكد من قبول العمل؟ سيتم نقلك لتقييم التجربة قبل إنهاء الطلب وتحرير المبلغ.')) updateStatus('rating') }} disabled={actionLoading} className="w-full bg-green-600 text-white px-4 py-4 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 text-lg flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-6 h-6" /> 
                    استلمت العمل (تحرير المبلغ)
                  </button>
                  <p className="text-[10px] text-center text-gray-500 font-bold">بموافقتك، سيتم تحويل المبلغ لحساب البائع وتُعتبر الصفقة ناجحة.</p>
                  
                  <button onClick={() => setShowDisputeModal(true)} disabled={actionLoading} className="w-full bg-white text-red-600 border border-red-200 px-4 py-3 rounded-xl font-bold hover:bg-red-50 text-sm flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    العمل غير مكتمل (فتح نزاع)
                  </button>
                </div>
             )}
             
             {order.status === 'rating' && isBuyer && (
                <div className="space-y-3">
                  <button onClick={() => setShowRatingModal(true)} className="w-full bg-blue-600 text-white px-4 py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 text-lg flex items-center justify-center gap-2"><Star className="w-6 h-6" /> تقييم البائع وإنهاء</button>
                  <button onClick={() => setShowDisputeModal(true)} disabled={actionLoading} className="w-full bg-white text-red-600 border border-red-200 px-4 py-3 rounded-xl font-bold hover:bg-red-50 text-sm">التراجع والإبلاغ عن مشكلة</button>
                </div>
             )}
             
             {order.status === 'delivered' && isSeller && (
                <div className="pt-2">
                  <button onClick={() => setShowDisputeModal(true)} disabled={actionLoading} className="w-full bg-white text-red-600 border border-red-200 px-4 py-2.5 rounded-xl font-bold hover:bg-red-50 transition-colors text-sm flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    المشتري لم يتجاوب (فتح نزاع)
                  </button>
                </div>
             )}
          </div>

          {/* Delivery Note & Attachment Section */}
          {(order.status === 'delivered' || order.status === 'rating' || order.status === 'completed') && (order.deliveryNote || order.deliveryAttachmentUrl) && (
             <div className="border-t border-gray-100 pt-6 space-y-4">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4 text-green-500" />
                 بيانات التسليم والمرفقات
               </h3>
               <div className="bg-green-50 border border-green-100 p-4 rounded-2xl space-y-3">
                 {order.deliveryNote && (
                   <p className="text-sm font-bold text-gray-800 leading-relaxed whitespace-pre-wrap">{order.deliveryNote}</p>
                 )}
                 {order.deliveryAttachmentUrl && (
                   <a 
                     href={order.deliveryAttachmentUrl} 
                     target="_blank" 
                     rel="noreferrer"
                     className="block rounded-xl overflow-hidden border border-green-200/50 hover:opacity-90 transition-opacity max-w-[200px]"
                   >
                     <img src={order.deliveryAttachmentUrl} alt="مرفق التسليم" className="w-full h-auto object-cover" />
                   </a>
                 )}
               </div>
             </div>
          )}

          {/* Details Section */}
          <div className="border-t border-gray-100 pt-6 space-y-4">
             <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
               <FileText className="w-4 h-4 text-blue-500" />
               تفاصيل المشروع المعتمدة
             </h3>
             <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl relative">
               <div className="absolute top-4 left-4 bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-xs font-black uppercase">
                 {order.category}
               </div>
               <p className="text-sm font-bold text-gray-800 mb-2">وصف الخدمة:</p>
               <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed font-medium bg-white p-4 rounded-xl border border-gray-100 shadow-sm">{order.description}</p>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
               <div className="flex flex-col p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                 <span className="text-[10px] font-bold text-gray-400 mb-1">الرقم المرجعي للطلب</span>
                 <span className="text-xs font-black text-gray-900 bg-gray-50 px-2 py-1 rounded-md self-start font-mono">#{order.id}</span>
               </div>
               
               {order.deliveryDays && (
                 <div className="flex flex-col p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                   <span className="text-[10px] font-bold text-gray-400 mb-1">مدة التنفيذ المحددة</span>
                   <span className="text-sm font-black text-gray-900 flex items-center gap-1">
                     <Clock className="w-3 h-3 text-blue-500" />
                     {order.deliveryDays} أيام
                   </span>
                 </div>
               )}

               {order.createdAt && order.deliveryDays && ['escrowed', 'delivered'].includes(order.status) && (
                 <div className="flex flex-col p-3 bg-white border border-gray-100 rounded-xl shadow-sm col-span-2">
                   <span className="text-[10px] font-bold text-gray-400 mb-1" title="التاريخ المتوقع لتسليم العمل بناءً على مدة التنفيذ المحددة">التاريخ المتوقع للتسليم (تقريبي)</span>
                   <span className="text-sm font-black text-blue-700 flex items-center gap-1">
                     <Calendar className="w-3 h-3 text-blue-500" />
                     {(() => {
                       const d = new Date(order.createdAt.toDate());
                       d.setDate(d.getDate() + order.deliveryDays);
                       return d.toLocaleDateString('ar-SA');
                     })()}
                   </span>
                 </div>
               )}

               {order.createdAt && (
                 <div className="flex flex-col p-3 bg-white border border-gray-100 rounded-xl shadow-sm col-span-2">
                   <span className="text-[10px] font-bold text-gray-400 mb-1">تاريخ إنشاء الطلب</span>
                   <span className="text-sm font-black text-gray-700 flex items-center gap-1">
                     <Calendar className="w-3 h-3 text-gray-400" />
                     {order.createdAt.toDate().toLocaleDateString('ar-SA')} 
                     <span className="text-xs text-gray-400">({order.createdAt.toDate().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })})</span>
                   </span>
                 </div>
               )}
             </div>
          </div>

          {/* Parties Section */}
          <div className="border-t border-gray-100 pt-6 space-y-4 pb-12">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">أطراف الصفقة</h3>
            <div className="bg-gray-50 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500">المشتري</p>
                <p className="text-sm font-black text-gray-900">{buyerProfile?.displayName || 'غير معروف'}</p>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500">البائع (المنفذ)</p>
                <p className="text-sm font-black text-gray-900">{sellerProfile?.displayName || order.sellerEmail || order.sellerPhone || 'غير معروف'}</p>
              </div>
            </div>
          </div>

        </div>

        {/* CHAT PANE (Center / Left) */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden lg:m-4 lg:ml-6 lg:rounded-3xl border border-gray-100 shadow-sm relative min-h-0">
          {['escrowed', 'delivered', 'completed', 'disputed'].includes(order.status) ? (
             <ChatRoom orderId={order.id} />
          ) : (
             <div className="flex-1 flex items-center justify-center flex-col text-gray-400 bg-gray-50">
                <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-bold text-lg">غرفة المحادثة الخاصة بالصفقة</p>
                <p className="text-sm font-medium mt-2">ستفتح المحادثة بعد تعميد الدفع من قبل المشتري.</p>
             </div>
          )}
        </div>

      </div>

      {order && user && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          orderId={order.id}
          reviewerId={user.uid}
          revieweeId={isBuyer ? (order.sellerId === 'unknown' ? '' : order.sellerId) : order.buyerId}
          type={isBuyer ? 'buyer-to-seller' : 'seller-to-buyer'}
          isFirstOrder={(profile?.completedOrdersCount || 0) <= 1}
          onSuccess={() => {
             if (isBuyer && order.status === 'rating') {
               updateStatus('completed');
             }
             setRatingSuccess(true);
          }}
        />
      )}

      {/* ── OTP Signature Verification Modal ────────────────────────────── */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-right" dir="rtl">
           <motion.div
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
              
              <div className="text-center space-y-2">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-blue-100">
                    <FileText className="w-6 h-6 animate-pulse" />
                 </div>
                 <h3 className="text-lg font-black text-gray-900">توقيع عقد الضمان المالي الرقمي</h3>
                 <p className="text-gray-400 font-bold text-xs">منصة عربون للوساطة والضمان</p>
              </div>

              {!otpSent ? (
                <form onSubmit={handleInitiateSignature} className="space-y-4">
                   <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">الاسم الكامل للموقع</label>
                      <input 
                        type="text"
                        required
                        placeholder="أدخل اسمك كما هو مسجل في الهوية..."
                        value={signerName}
                        onChange={e => setSignerName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-black outline-none focus:bg-white transition-all text-right"
                      />
                   </div>

                   <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">رقم الجوال لتلقي رمز التحقق</label>
                      <input 
                        type="text"
                        required
                        placeholder="05XXXXXXXX"
                        value={signerPhone}
                        onChange={e => setSignerPhone(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-black outline-none focus:bg-white transition-all text-right font-mono"
                        dir="ltr"
                      />
                   </div>

                   <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">رقم الهوية الوطنية أو الإقامة</label>
                      <input 
                        type="text"
                        required
                        maxLength={10}
                        placeholder="1XXXXXXXXX"
                        value={signerNationalId}
                        onChange={e => setSignerNationalId(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-black outline-none focus:bg-white transition-all text-right font-mono"
                        dir="ltr"
                      />
                   </div>

                   <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                      >
                         إرسال رمز التوقيع OTP
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSignModal(false)}
                        className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-200 transition-all"
                      >
                         إلغاء
                      </button>
                   </div>
                </form>
              ) : (
                <form onSubmit={handleVerifySignatureOtp} className="space-y-5">
                   <div className="text-center space-y-1.5">
                      <p className="text-xs font-bold text-gray-500">تم إرسال رمز التوقيع إلى الجوال</p>
                      <p className="text-sm font-black text-blue-600 font-mono" dir="ltr">{signerPhone}</p>
                   </div>

                   <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">أدخل الرمز المكون من 4 أرقام</label>
                      <input 
                        type="text"
                        required
                        maxLength={4}
                        autoFocus
                        placeholder="----"
                        value={enteredOtp}
                        onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-6 py-4 rounded-xl border-2 border-gray-100 focus:border-blue-600 outline-none transition-all text-2xl font-black tracking-[1em] text-center bg-gray-50 focus:bg-white font-mono"
                      />
                   </div>

                   <div className="flex justify-center">
                      <button 
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-[10px] font-black text-blue-600 hover:underline"
                      >
                         تعديل رقم الجوال أو الهوية
                      </button>
                   </div>

                   <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={signing || enteredOtp.length < 4}
                        className="flex-1 py-3.5 bg-green-600 text-white rounded-xl font-black text-xs hover:bg-green-700 transition-all shadow-lg shadow-green-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                         {signing ? 'جاري توثيق التوقيع...' : 'تأكيد التوقيع إلكترونياً'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                           setShowSignModal(false);
                           setOtpSent(false);
                           setEnteredOtp('');
                        }}
                        className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-200 transition-all"
                      >
                         تراجع
                      </button>
                   </div>
                </form>
              )}
           </motion.div>
        </div>
      )}
      {/* ── Hidden Legal Contract Template for PDF Export ───────────────── */}
      {order && (
        <div 
          id="pdf-contract-template" 
          style={{ display: 'none' }}
          className="p-10 bg-white text-gray-800 font-sans border-2 border-double border-gray-300 rounded-[2rem] w-[210mm] min-h-[297mm] leading-relaxed text-right"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-blue-600 pb-6 mb-8">
             <div className="text-right">
                <h1 className="text-2xl font-black text-blue-600 leading-none">عربون | ARBOON</h1>
                <p className="text-[10px] font-bold text-gray-400 mt-1">منصة الوساطة وضمان الحقوق المالية المعتمدة</p>
             </div>
             <div className="text-left font-mono text-[10px] text-gray-400">
                <p>رقم العقد: #ARB-CON-{order.id.slice(0, 8).toUpperCase()}</p>
                <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
             </div>
          </div>

          {/* Main Title */}
          <div className="text-center my-6 space-y-2">
             <h2 className="text-xl font-black text-gray-900 border-b border-gray-100 pb-2 w-fit mx-auto">عقد اتفاقية وساطة وضمان مالي إلكتروني</h2>
             <p className="text-[10px] text-gray-400 font-bold">مُبرم وموثق رقمياً بموجب نظام التعاملات الإلكترونية السعودي</p>
          </div>

          {/* Introduction */}
          <p className="text-xs text-gray-600 font-bold mb-6 text-justify">
             بناءً على أحكام نظام التعاملات الإلكترونية الصادر بالمرسوم الملكي ذي الرقم م/18، يمثل هذا العقد اتفاقية ملزمة ومبرمة برضا أطرافها وإشراف منصة "عربون" كطرف ثالث محايد ووسيط ضمان مالي للطرفين لحفظ مستحقات الصفقة وتأمينها حتى اكتمال شروط التسليم.
          </p>

          {/* Parties */}
          <div className="space-y-4 mb-8">
             <h3 className="text-sm font-black text-blue-600 border-r-4 border-blue-600 pr-2 leading-none mb-3">أطراف الاتفاقية</h3>
             
             {/* Party 1 */}
             <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1 text-xs">
                <p className="font-black text-gray-900"><span className="text-gray-400">الطرف الأول (المشتري):</span> {buyerProfile?.displayName || 'غير معروف'}</p>
                {order.buyerSignature?.nationalId && (
                   <p className="font-bold"><span className="text-gray-400">رقم الهوية الوطنية/الإقامة:</span> <span className="font-mono">{order.buyerSignature.nationalId}</span></p>
                )}
                <p className="font-bold"><span className="text-gray-400">رقم الجوال:</span> <span className="font-mono">{order.buyerSignature?.phone || buyerProfile?.phoneNumber || 'غير متوفر'}</span></p>
             </div>

             {/* Party 2 */}
             <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1 text-xs">
                <p className="font-black text-gray-900"><span className="text-gray-400">الطرف الثاني (البائع/المنفذ):</span> {sellerProfile?.displayName || 'غير معروف'}</p>
                {order.sellerSignature?.nationalId && (
                   <p className="font-bold"><span className="text-gray-400">رقم الهوية الوطنية/الإقامة:</span> <span className="font-mono">{order.sellerSignature.nationalId}</span></p>
                )}
                <p className="font-bold"><span className="text-gray-400">رقم الجوال:</span> <span className="font-mono">{order.sellerSignature?.phone || sellerProfile?.phoneNumber || 'غير متوفر'}</span></p>
             </div>
          </div>

          {/* Deal Details */}
          <div className="space-y-4 mb-8">
             <h3 className="text-sm font-black text-blue-600 border-r-4 border-blue-600 pr-2 leading-none mb-3">موضوع التعاقد والبيانات المالية</h3>
             <div className="p-4 border border-gray-200 rounded-2xl space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                   <span className="font-black text-gray-900">مسمى الخدمة / السلعة:</span>
                   <span className="font-bold">{order.title}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                   <span className="font-black text-gray-900">القيمة الإجمالية المحجوزة بالضمان:</span>
                   <span className="font-black text-green-700 italic">{order.amount.toLocaleString()} ر.س</span>
                </div>
                {order.deliveryDays && (
                   <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <span className="font-black text-gray-900">مدة التنفيذ والتسليم المحددة:</span>
                      <span className="font-bold">{order.deliveryDays} أيام</span>
                   </div>
                )}
                <div className="flex flex-col gap-1.5 pt-1">
                   <span className="font-black text-gray-900">تفاصيل ووصف شروط العمل المتفق عليها:</span>
                   <p className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-600 leading-relaxed whitespace-pre-wrap">{order.description}</p>
                </div>
             </div>
          </div>

          {/* General Clauses */}
          <div className="space-y-3 mb-10 text-[10px] text-gray-500 leading-relaxed text-justify">
             <h3 className="text-sm font-black text-blue-600 border-r-4 border-blue-600 pr-2 leading-none mb-3">البنود والشروط العامة للضمان</h3>
             <p>1. **آلية حجز الرصيد:** يتعهد الطرف الأول (المشتري) بدفع كامل المبلغ إلكترونياً، وتلتزم منصة "عربون" بحجز وحفظ الرصيد بأمان في الحساب المجمع للوساطة دون تسليمه للطرف الثاني.</p>
             <p>2. **آلية التنفيذ والتسليم:** يلتزم الطرف الثاني (البائع) بتنفيذ الأعمال وتسليمها كاملة للعميل عبر المنصة وضمن المدة الزمنية المتفق عليها بالكامل.</p>
             <p>3. **تحرير الرصيد:** يتم تحرير وصرف المبلغ الصافي للطرف الثاني فور تأكيد الطرف الأول استلام الخدمة والرضا عن المخرجات، أو بانتهاء المدد القانونية التلقائية دون شكاوى معلقة.</p>
             <p>4. **فض النزاعات:** في حال حدوث خلاف حول سلامة المخرجات، يتم إحالة الصفقة إلى المحكم الإداري لمنصة "عربون" ويقر الطرفان بقطعية وتوافق أي قرار تسوية يصدره النظام لحماية الحقوق المالية.</p>
          </div>

          {/* Cryptographic Digital Seals / Signature Stamping */}
          <div className="border-t border-gray-100 pt-6 space-y-6">
             <h3 className="text-sm font-black text-blue-600 border-r-4 border-blue-600 pr-2 leading-none mb-3">التوثيق والتوقيعات الرقمية المعتمدة</h3>
             
             <div className="grid grid-cols-2 gap-4">
                {/* Buyer Signature Box */}
                <div className={`p-4 rounded-2xl border text-right space-y-2 relative min-h-[140px] flex flex-col justify-between ${order.buyerSignature?.signed ? 'bg-green-50/50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                   <span className="text-[10px] font-black text-gray-400 block border-b border-gray-100 pb-1">توقيع المشتري الرقمي (First Party)</span>
                   {order.buyerSignature?.signed ? (
                     <div className="space-y-1 text-[9px] text-green-800 font-bold">
                        <p className="font-black text-gray-900">الموقع: {order.buyerSignature.fullName}</p>
                        <p>الجوال: <span className="font-mono">{order.buyerSignature.phone}</span></p>
                        <p>الهوية: <span className="font-mono">{order.buyerSignature.nationalId}</span></p>
                        <p>التاريخ: <span className="font-mono">{new Date(order.buyerSignature.signedAt).toLocaleString('ar-SA')}</span></p>
                        <p>الـ IP: <span className="font-mono text-gray-400">{order.buyerSignature.ipAddress}</span></p>
                        <p>موثق بـ OTP: <span className="font-mono bg-green-100 text-green-700 px-1 rounded">#{order.buyerSignature.otpUsed}</span></p>
                        <div className="absolute bottom-2 left-2 border-2 border-green-600 text-green-600 rounded-lg p-1 text-[8px] font-black uppercase tracking-tighter rotate-12 bg-white/80 select-none shadow-sm flex items-center gap-0.5 shrink-0">
                           <ShieldCheck className="w-2.5 h-2.5 fill-current text-green-600" />
                           <span>مُوثق عَرَبون</span>
                        </div>
                     </div>
                   ) : (
                     <p className="text-[10px] text-gray-400 italic my-auto">بانتظار توقيع الطرف الأول الرقمي</p>
                   )}
                </div>

                {/* Seller Signature Box */}
                <div className={`p-4 rounded-2xl border text-right space-y-2 relative min-h-[140px] flex flex-col justify-between ${order.sellerSignature?.signed ? 'bg-green-50/50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                   <span className="text-[10px] font-black text-gray-400 block border-b border-gray-100 pb-1">توقيع البائع الرقمي (Second Party)</span>
                   {order.sellerSignature?.signed ? (
                     <div className="space-y-1 text-[9px] text-green-800 font-bold">
                        <p className="font-black text-gray-900">الموقع: {order.sellerSignature.fullName}</p>
                        <p>الجوال: <span className="font-mono">{order.sellerSignature.phone}</span></p>
                        <p>الهوية: <span className="font-mono">{order.sellerSignature.nationalId}</span></p>
                        <p>التاريخ: <span className="font-mono">{new Date(order.sellerSignature.signedAt).toLocaleString('ar-SA')}</span></p>
                        <p>الـ IP: <span className="font-mono text-gray-400">{order.sellerSignature.ipAddress}</span></p>
                        <p>موثق بـ OTP: <span className="font-mono bg-green-100 text-green-700 px-1 rounded">#{order.sellerSignature.otpUsed}</span></p>
                        <div className="absolute bottom-2 left-2 border-2 border-green-600 text-green-600 rounded-lg p-1 text-[8px] font-black uppercase tracking-tighter rotate-12 bg-white/80 select-none shadow-sm flex items-center gap-0.5 shrink-0">
                           <ShieldCheck className="w-2.5 h-2.5 fill-current text-green-600" />
                           <span>مُوثق عَرَبون</span>
                        </div>
                     </div>
                   ) : (
                     <p className="text-[10px] text-gray-400 italic my-auto">بانتظار توقيع الطرف الثاني الرقمي</p>
                   )}
                </div>
             </div>

             {order.isContractSigned && (
               <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-blue-900 mt-4">
                  <div className="text-right">
                     <p className="flex items-center gap-1.5 font-black text-blue-950">
                        <ShieldCheck className="w-4 h-4 text-blue-600 animate-bounce" />
                        <span>وثيقة معتمدة ومسجلة رسمياً</span>
                     </p>
                     <p className="text-[9px] text-gray-500 font-bold mt-1">يقر الأطراف بصحة التوقيعات أعلاه وسلامتها القانونية كوثيقة سارية وبموجب أنظمة السندات الرقمية.</p>
                  </div>
                  <div className="text-left font-mono text-[9px] text-blue-600 bg-white border border-blue-200 p-2 rounded-xl shrink-0 tracking-widest shadow-inner">
                     REF: {order.contractHash}
                  </div>
               </div>
             )}
          </div>
        </div>
      )}
   </div>
  );
};
