import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp, increment, collection, query, where, orderBy, getDocs, getDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Clock, CheckCircle2, ChevronRight, AlertTriangle, CreditCard, PackageCheck, Copy, Check, FileText, User, TrendingUp, Calendar, Banknote, Info, AlertCircle, MessageSquare } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChatRoom } from '../components/chat/ChatRoom';
import { PaymentIcon } from '../components/ui/PaymentIcon';
import { OrderRating } from '../components/OrderRating';
import { LoginModal } from '../components/auth/LoginModal';
import { PaymentModal } from '../components/modals/PaymentModal';
import { DisputeModal } from '../components/modals/DisputeModal';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { sendNotification, recordTransaction, recordOrderEvent, updateSellerPerformance } from '../lib/notificationService';
import { calculateOrderFees, PaymentMethod } from '../lib/payment-utils';
import { toast } from 'sonner';

export const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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
        setOrder({ id: snapshot.id, ...snapshot.data() } as Order);
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

      await updateDoc(doc(db, 'orders', order.id), updateData);

      await recordOrderEvent(
        order.id,
        user.uid,
        `تغيير الحالة: ${newStatus}`,
        prevStatus,
        newStatus,
        comment
      );

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
          let fileUrl = '';
          if (deliveryFile) {
            try {
              const fileRef = ref(storage, `deliveries/${order.id}/${deliveryFile.name}`);
              await uploadBytes(fileRef, deliveryFile);
              fileUrl = await getDownloadURL(fileRef);
            } catch (err) {
              console.error("Failed to upload delivery file", err);
            }
          }

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
              `أكد المشتري استلام العمل. تم إضافة ${sellerNet.toLocaleString()} ر.س إلى رصيدك. شكراً لاحترافيتك!`,
              'payment', 'urgent', order.id, user.uid
            );
          }

          // أشعر المشتري: تأكيد اكتمال الصفقة
          await sendNotification(
            order.buyerId,
            `✅ اكتملت الصفقة بنجاح ${orderRef}`,
            `تم إغلاق الصفقة وتحرير المبلغ للمقدّم. يسعدنا سماع تقييمك للتجربة.`,
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

    } catch (error) {
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
      const paymentRef = data.transactionId || data.geideaReference;

      await updateStatus('escrowed', undefined, paymentRef);
      setShowPaymentModal(false);
    } catch (error) {
      alert('حدث خطأ أثناء معالجة الدفع عبر جيديا، يرجى المحاولة لاحقاً');
    } finally {
      setActionLoading(false);
    }
  };

  // ── DEV ONLY: Simulate payment without Geidea ─────────────────────────────
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
           
           {/* Status Information Box */}
           {(() => {
            const cfg = {
              pending:   { bg:'bg-gray-50',   border:'border-gray-200',   icon:'⏳', title: 'بانتظار الموافقة', buyerMsg:'أكمل الدفع لتعميد الصفقة وحماية حقك.',          sellerMsg:'بانتظار المشتري لإتمام الدفع.' },
              escrowed:  { bg:'bg-amber-50',  border:'border-amber-200',  icon:'🔒', title: 'تم الإيداع بأمان', buyerMsg:'المبلغ محفوظ بأمان عبر نظام المدفوعات. بانتظار تسليم العمل.',     sellerMsg:'تم تأمين المبلغ عبر نظام المدفوعات — ابدأ التنفيذ بثقة.' },
              delivered: { bg:'bg-purple-50', border:'border-purple-200', icon:'📦', title: 'بانتظار تأكيد المشتري', buyerMsg:'تم تسليم العمل. راجعه وأكد الاستلام.', sellerMsg:'سلّمت العمل. بانتظار تأكيد المشتري.' },
              completed: { bg:'bg-green-50',  border:'border-green-200',  icon:'✅', title: 'اكتملت الصفقة', buyerMsg:'الصفقة مكتملة بنجاح.',              sellerMsg:'تم تحرير المبلغ لحسابك.' },
              disputed:  { bg:'bg-red-50',    border:'border-red-200',    icon:'🚨', title: 'نزاع نشط', buyerMsg:'نزاع مفتوح — الإدارة ستتواصل قريباً.',       sellerMsg:'نزاع مفتوح — الإدارة ستتواصل قريباً.' },
              cancelled: { bg:'bg-gray-100',  border:'border-gray-300',   icon:'❌', title: 'ملغية', buyerMsg:'تم إلغاء الصفقة.',                               sellerMsg:'تم إلغاء الصفقة.' },
            };
            const c = cfg[order.status] || cfg['pending'];
            return (
              <div className={`${c.bg} border ${c.border} rounded-2xl p-4 flex gap-4 items-start`}>
                <div className="text-2xl mt-1">{c.icon}</div>
                <div>
                  <h3 className="font-black text-gray-900 mb-1">{c.title}</h3>
                  <p className="text-xs font-bold text-gray-700 leading-relaxed">{isBuyer ? c.buyerMsg : c.sellerMsg}</p>
                </div>
              </div>
            );
          })()}

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
                <button onClick={() => setShowPaymentModal(true)} disabled={actionLoading} className="w-full bg-green-600 text-white px-4 py-3 rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 hover:scale-[1.02] transition-transform">
                  <CreditCard className="w-5 h-5" />
                  ادفع وعمّد الطلب الآن
                </button>
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
                  <div className="text-[10px] text-gray-500 bg-blue-50 p-2 rounded-lg flex gap-2 mb-2 font-bold">
                    <AlertCircle className="w-3 h-3 text-blue-600 shrink-0 mt-0.5" />
                    للأحجام الكبيرة (أكبر من 25MB)، يرجى ضغط الملف أو رفعه على Google Drive وإرفاق الرابط أعلاه.
                  </div>
                  <input 
                    type="file" 
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
                    className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer text-gray-500" 
                  />
                  <button 
                    onClick={() => updateStatus('delivered', completionComment)} 
                    disabled={actionLoading || (!completionComment.trim() && !deliveryFile)} 
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 mt-2"
                  >
                    إرسال وتسليم العمل
                  </button>
                </div>
             )}
             
             {order.status === 'escrowed' && (isBuyer || isSeller) && (
                <button onClick={() => setShowDisputeModal(true)} disabled={actionLoading} className="w-full bg-white text-red-600 border border-red-200 px-4 py-2.5 rounded-xl font-bold hover:bg-red-50 transition-colors text-sm mt-2">إبلاغ عن مشكلة (نزاع)</button>
             )}
             
             {order.status === 'delivered' && isBuyer && (
                <div className="space-y-2">
                  <button onClick={() => { if(window.confirm('هل أنت متأكد من قبول العمل؟ هذا الإجراء سيحرر المبلغ للبائع ولا يمكن التراجع عنه.')) updateStatus('completed') }} disabled={actionLoading} className="w-full bg-green-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 text-lg flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> قبول واستلام العمل</button>
                  <button onClick={() => setShowDisputeModal(true)} disabled={actionLoading} className="w-full bg-white text-red-600 border border-red-200 px-4 py-2.5 rounded-xl font-bold hover:bg-red-50 text-sm">رفض التسليم (نزاع)</button>
                </div>
             )}
             
             {order.status === 'delivered' && isSeller && (
                <button onClick={() => setShowDisputeModal(true)} disabled={actionLoading} className="w-full bg-white text-red-600 border border-red-200 px-4 py-2.5 rounded-xl font-bold hover:bg-red-50 transition-colors text-sm mt-2">إبلاغ عن مشكلة (نزاع)</button>
             )}
          </div>

          <AnimatePresence>
            {order.status === 'completed' && !ratingSuccess && !(isBuyer ? order.buyerRatingCompleted : order.sellerRatingCompleted) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="overflow-hidden"
              >
                <OrderRating 
                  orderId={order.id}
                  reviewerId={user.uid}
                  revieweeId={isBuyer ? (order.sellerId === 'unknown' ? '' : order.sellerId) : order.buyerId}
                  type={isBuyer ? 'buyer-to-seller' : 'seller-to-buyer'}
                  onSuccess={() => setRatingSuccess(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Details Section */}
          <div className="border-t border-gray-100 pt-6 space-y-4">
             <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">التفاصيل والشروط</h3>
             <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-medium bg-gray-50 p-4 rounded-2xl">{order.description}</p>
             {order.deliveryDays && (
               <div className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                 <span className="text-xs font-bold text-gray-500">مدة التنفيذ المحددة:</span>
                 <span className="text-sm font-black text-gray-900">{order.deliveryDays} أيام</span>
               </div>
             )}
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
    </div>
  );
};
