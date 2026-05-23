import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp, increment, collection, query, where, orderBy, getDocs, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Clock, CheckCircle2, ChevronRight, AlertTriangle, CreditCard, PackageCheck, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChatRoom } from '../components/chat/ChatRoom';
import { PaymentIcon } from '../components/ui/PaymentIcon';
import { OrderRating } from '../components/OrderRating';
import { LoginModal } from '../components/auth/LoginModal';
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
  const [completionComment, setCompletionComment] = useState('');
  const [orderLogs, setOrderLogs] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const copyOrderLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      if (order.sellerId === user.uid) {
        await updateSellerPerformance(user.uid);
      }

      // Notifications logic...
      const messages: Record<string, string> = {
        'cancelled': 'تم إلغاء الصفقة من قبل الطرف الآخر.',
        'escrowed': `تم تأمين مبلغ ${order.amount} ر.س. يمكنك البدء في التنفيذ.`,
        'delivered': 'تم إرسال العمل للمراجعة.',
        'completed': 'تم تحرير المبلغ بنجاح.',
        'disputed': 'تم فتح نزاع للتدخل الإداري.'
      };
      
      if (messages[newStatus]) {
        const recipientId = ['escrowed', 'completed'].includes(newStatus) ? (order.sellerId === 'unknown' ? null : order.sellerId) : order.buyerId;
        if (recipientId) {
          await sendNotification(recipientId, 'تحديث الطلب', messages[newStatus], 'order_update', 'normal', order.id);
        }
      }

      if (newStatus === 'completed') {
        try {
          await fetch('/api/payment/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              orderId: order.id, 
              amount: order.amount,
              transactionId: order.paymentRef
            })
          });

          if (order.sellerId && order.sellerId !== 'unknown') {
            const sellerNet = order.paymentFees?.sellerNetShare || order.amount;
            await updateDoc(doc(db, 'users', order.sellerId), {
              balance: increment(sellerNet)
            });
          }
        } catch (captureErr) {
          console.error("Capture failed:", captureErr);
        }
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

      const recipientId = isBuyer ? order.sellerId : order.buyerId;
      if (recipientId && recipientId !== 'unknown') {
        await sendNotification(
          recipientId,
          '🚨 تم فتح نزاع بخصوص طلبك',
          `قام الطرف الآخر بفتح نزاع رسمي بخصوص الصفقة (#ARB-${order.id.slice(0, 4).toUpperCase()}). يرجى المتابعة مع الإدارة.`,
          'dispute',
          'urgent',
          order.id
        );
      }

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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate('/dashboard')} className="hover:text-blue-600">لوحة التحكم</button>
          <ChevronRight className="w-4 h-4" />
          <span>{order.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-display font-black text-sm bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 italic">#ARB-{order.id.slice(0, 8).toUpperCase()}</p>
          <button 
            onClick={copyOrderLink}
            className="flex items-center gap-2 text-xs font-display font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all group shadow-sm"
          >
            {copied ? (
              <><Check className="w-3 h-3" /> تم النسخ</>
            ) : (
              <><Copy className="w-3 h-3 group-hover:scale-110 transition-transform" /> نسخ رابط الطلب</>
            )}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <Shield className="w-8 h-8 text-blue-600" />
                   <div>
                      <h3 className="text-xl font-black">القيمة والرسوم</h3>
                      <p className="text-gray-400 text-xs">نظام الوساطة يحمي حقوقكم</p>
                   </div>
                </div>
                <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">
                   {['tabby', 'tamara'].includes(order.paymentMethod || '') ? 'دفع بالتقسيط (Tabby/Tamara)' : 'دفع مباشر (Standard)'}
                </span>
             </div>

             <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 text-center">
                   <p className="text-[10px] text-gray-400 font-display font-black mb-1 italic">المبلغ المطلوب</p>
                   <p className="text-xl font-display font-black">{order.amount.toLocaleString()} ر.س</p>
                </div>
                <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 text-center">
                   <p className="text-[10px] text-gray-400 font-display font-black mb-1 italic">رسوم عربون</p>
                   <p className="text-xl font-display font-black">{fees.arboonFee.toLocaleString()} ر.س</p>
                </div>
                <div className="p-6 bg-blue-600 rounded-3xl text-center text-white shadow-xl shadow-blue-900/10">
                   <p className="text-[10px] opacity-80 font-display font-black mb-1 italic">صافي المعقب</p>
                   <p className="text-xl font-display font-black">{fees.sellerNetShare.toLocaleString()} ر.س</p>
                </div>
             </div>
             
             {['tabby', 'tamara'].includes(order.paymentMethod || '') && (
               <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                 <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                 <div className="text-xs text-amber-800 leading-relaxed font-bold">
                   تنبيه: بما أن هذه العملية تمت عبر {order.paymentMethod === 'tabby' ? 'تابي' : 'تمارا'}، سيتم تحرير المبلغ للمقدم الخدمة بعد وصوله من بوابة الدفع (خلال 7 أيام عمل) وبعد موافقة المشتري على الاستلام.
                 </div>
               </div>
             )}
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-8 overflow-x-auto pb-4 gap-4 px-2 no-scrollbar">
               {steps.map((step, idx) => (
                 <div key={step.key} className="flex flex-col items-center gap-2 relative z-10 shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      idx <= currentStepIndex ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {React.cloneElement(step.icon as React.ReactElement, { className: 'w-5 h-5' })}
                    </div>
                    <span className={`text-xs font-bold ${idx <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'}`}>{step.label}</span>
                    {idx < steps.length - 1 && (
                      <div className={`absolute top-6 left-12 w-[calc(100%+16px)] h-[2px] -z-10 ${idx < currentStepIndex ? 'bg-blue-600' : 'bg-gray-100'}`} />
                    )}
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100/50 shadow-sm space-y-6">
             <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <h2 className="text-xl font-display font-black text-gray-950">تفاصيل الصفقة</h2>
                <p className="text-2xl font-display font-black text-blue-600">{order.amount} ر.س</p>
             </div>
             <p className="text-gray-600 whitespace-pre-wrap leading-relaxed font-medium">{order.description}</p>
             
             {order.status === 'escrowed' && order.deliveryDays && (
               <div className="mt-6 bg-orange-50 border border-orange-200 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <div className="bg-orange-100 p-3 rounded-2xl shrink-0">
                       <Clock className="w-8 h-8 text-orange-600 animate-pulse" />
                     </div>
                     <div>
                        <p className="text-orange-900 font-black text-lg">الوقت المتبقي للتسليم</p>
                        <p className="text-sm text-orange-700 font-medium mt-1">يجب تسليم العمل خلال المدة المتفق عليها لتجنب النزاعات</p>
                     </div>
                  </div>
                  <div className="text-left bg-white px-6 py-3 rounded-2xl border border-orange-100 shadow-sm w-full md:w-auto text-center">
                     <span className="font-black text-2xl text-orange-600 font-display">{order.deliveryDays} أيام</span>
                  </div>
               </div>
             )}
          </div>

          <AnimatePresence>
            {order.status === 'completed' && !ratingSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-8"
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

          <div className="p-8 bg-gray-50/50 rounded-3xl border border-gray-100">
              <div className="flex flex-wrap gap-4">
                {order.status === 'awaiting_acceptance' && order.creatorId !== user.uid && (isBuyer || isSeller || isSellerByEmail || isSellerByPhone) && (
                  <div className="flex gap-4 w-full">
                    <button onClick={() => updateStatus('pending')} disabled={actionLoading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex-1 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">موافقة وقبول الطلب</button>
                    <button onClick={() => updateStatus('cancelled')} disabled={actionLoading} className="bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-xl font-bold hover:bg-red-100 transition-all">رفض</button>
                  </div>
                )}
                {order.status === 'awaiting_acceptance' && order.creatorId === user.uid && (
                  <div className="w-full text-center text-gray-500 font-bold bg-gray-50 p-4 rounded-xl border border-gray-100">بانتظار موافقة الطرف الآخر على الطلب...</div>
                )}
                {order.sellerId === 'unknown' && (isSellerByEmail || isSellerByPhone) && order.status !== 'awaiting_acceptance' && (
                   <button onClick={claimOrder} disabled={actionLoading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">تحديث ربط الحساب</button>
                )}
                {order.status === 'pending' && isBuyer && (
                  <button onClick={() => setShowPaymentModal(true)} disabled={actionLoading} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-600/20">
                    <CreditCard className="w-5 h-5" />
                    دفع وتعميد الطلب
                  </button>
                )}
                {order.status === 'pending' && isSeller && (
                  <div className="w-full text-center text-gray-500 font-bold bg-gray-50 p-4 rounded-xl border border-gray-100">بانتظار المشتري لإتمام الدفع...</div>
                )}
                {order.status === 'escrowed' && isSeller && (
                  <div className="w-full space-y-4">
                    <textarea className="w-full border rounded-2xl p-4" placeholder="وصف العمل المنجز..." value={completionComment} onChange={(e) => setCompletionComment(e.target.value)} />
                    <button onClick={() => updateStatus('delivered', completionComment)} disabled={actionLoading || !completionComment.trim()} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">تسليم العمل</button>
                  </div>
                )}
                {order.status === 'escrowed' && isBuyer && (
                  <div className="w-full md:w-auto">
                    <button onClick={() => setShowDisputeModal(true)} disabled={actionLoading} className="bg-white text-red-600 border border-red-200 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors w-full md:w-auto text-center">فتح نزاع</button>
                  </div>
                )}
                {order.status === 'delivered' && isBuyer && (
                  <div className="flex gap-4 w-full">
                    <button onClick={() => updateStatus('completed')} disabled={actionLoading} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex-1 hover:bg-green-700 transition-all">استلام وتحرير المبلغ</button>
                    <button onClick={() => setShowDisputeModal(true)} disabled={actionLoading} className="bg-white text-red-600 border border-red-200 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors">فتح نزاع</button>
                  </div>
                )}
             </div>
          </div>
        </div>

        <div className="space-y-8">
           <ChatRoom orderId={order.id} />
           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold">نصائح عربون الرمضانية</h3>
              <p className="text-xs text-gray-500 leading-relaxed">• لا تشارك تفاصيلك البنكية.<br/>• وثق كل شيء في المحادثة.<br/>• عربون يضمن حقك.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

const PaymentModal: React.FC<{ 
  amount: number; 
  onConfirm: () => void; 
  onClose: () => void;
  loading: boolean;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  specificProvider: string;
  setSpecificProvider: (m: any) => void;
  profile: any;
  allowBNPL: boolean;
}> = ({ amount, onConfirm, onClose, loading, paymentMethod, setPaymentMethod, specificProvider, setSpecificProvider, profile, allowBNPL }) => {
  const fees = calculateOrderFees(amount, paymentMethod);
  const hasFreeFee = (profile?.freeFeeTransactions || 0) > 0;
  
  const isInstallment = ['tabby', 'tamara'].includes(paymentMethod);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-8 text-center border-b bg-gray-50/50">
          <Shield className="w-10 h-10 text-blue-600 mx-auto mb-2" />
          <h3 className="text-2xl font-black">تعميد ودفع آمن (Escrow)</h3>
          <p className="text-gray-500 text-sm">حجز المبلغ لضمان حقوق الطرفين</p>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-3">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">اختر وسيلة الدفع</p>
             <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setPaymentMethod('mada')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'mada' ? 'border-blue-600 bg-blue-50' : 'border-gray-50 bg-gray-50'}`}>
                  <PaymentIcon type="mada" className="h-5" />
                  <span className="font-bold text-[10px]">بطاقة / مدى</span>
                </button>
                {allowBNPL && (
                  <>
                    <button onClick={() => setPaymentMethod('tabby')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'tabby' ? 'border-green-600 bg-green-50' : 'border-gray-50 bg-gray-50'}`}>
                      <PaymentIcon type="tabby" className="h-5" />
                      <span className="font-bold text-[10px]">تقسيط تابي</span>
                    </button>
                    <button onClick={() => setPaymentMethod('tamara')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'tamara' ? 'border-amber-600 bg-amber-50' : 'border-gray-50 bg-gray-50'}`}>
                      <PaymentIcon type="tamara" className="h-5" />
                      <span className="font-bold text-[10px]">تقسيط تمارا</span>
                    </button>
                  </>
                )}
             </div>
          </div>

          <div className="bg-gray-900 rounded-[2rem] p-6 text-white space-y-4">
             <div className="flex justify-between text-sm">
                <span className="opacity-60">قيمة الخدمة</span>
                <span className="font-bold">{amount.toLocaleString()} ر.س</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="opacity-60 font-bold">إضافات عربون (رسوم ضمان)</span>
                <span className={hasFreeFee ? 'line-through opacity-50' : 'text-blue-400 font-black'}>+ {fees.arboonFee.toLocaleString()} ر.س</span>
             </div>
             
             {isInstallment && (
                <div className="flex justify-between text-sm border-t border-white/10 pt-4">
                  <span className="text-amber-400 font-bold">رسوم وساطة وحماية التقسيط</span>
                  <span className="text-amber-400 font-bold">+ {fees.installmentFee.toLocaleString()} ر.س</span>
                </div>
             )}

             <div className="border-t border-white/10 pt-4 flex justify-between items-end">
                <div>
                   <p className="text-[10px] opacity-50 uppercase mb-1">إجمالي ما ستدفعه الآن</p>
                   <p className="text-3xl font-black">{fees.buyerTotal.toLocaleString()} ر.س</p>
                </div>
                <div className="text-right">
                   <p className="text-[8px] opacity-50 uppercase leading-relaxed">سيصل للمعقب<br/>بعد اكتمال العمل</p>
                   <p className="font-bold text-green-400">{fees.sellerNetShare.toLocaleString()} ر.س</p>
                </div>
             </div>
          </div>

          {isInstallment && (
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3">
               <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
               <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                 عند اختيار التقسيط، يتم حجز العملة في ضمان عربون. يرجى الملاحظة أن المبلغ سيتحرك من البوابة التسويقية خلال 7 أيام عمل، لذا ننصح بائعي الخدمات بالبدء فوراً لضمان سرعة التحويل.
               </p>
            </div>
          )}

          <button onClick={onConfirm} disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-display font-black text-lg shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
            {loading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><Shield className="w-5 h-5" /><span>تأكيد ودفع {fees.buyerTotal.toLocaleString()} ر.س</span></>}
          </button>
          <button onClick={onClose} className="w-full text-gray-400 font-bold hover:text-gray-600 transition-colors">إلغاء العملية</button>
        </div>
      </motion.div>
    </div>
  );
};

const DisputeModal: React.FC<{
  loading: boolean;
  reason: string;
  setReason: (r: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ loading, reason, setReason, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100"
      >
        <div className="p-8 text-center border-b bg-red-50/50">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-gray-950">فتح نزاع رسمي</h3>
          <p className="text-gray-500 text-sm mt-1">سيتم إحالة الطلب للمراجعة والتدخل من قبل وسيط المنصة</p>
        </div>
        <div className="p-8 space-y-6">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-right">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed font-bold">
              تنبيه: فتح نزاع يؤدي إلى تجميد رصيد الصفقة بالكامل مؤقتاً. يرجى توضيح سبب الخلاف ورفع أي إثباتات أو محادثات تدعم موقفك لتسريع تسوية النزاع.
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-black text-gray-700 text-right">سبب النزاع بالتفصيل *</label>
            <textarea
              className="w-full border border-gray-200 rounded-2xl p-4 text-right min-h-[120px] focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-medium text-sm text-gray-800"
              placeholder="اكتب هنا بالتفصيل ما الذي حدث وما هو سبب الخلاف المالي مع الطرف الآخر..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex gap-4 col-reverse">
            <button
              onClick={onConfirm}
              disabled={loading || !reason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-red-600"
            >
              {loading ? 'جاري رفع الطلب...' : 'تأكيد فتح النزاع'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-4 rounded-2xl font-bold transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
