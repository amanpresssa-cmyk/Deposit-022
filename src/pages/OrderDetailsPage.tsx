import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
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
import { collection, query, where, orderBy, getDocs, getDoc } from 'firebase/firestore';

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('standard');
  const [specificProvider, setSpecificProvider] = useState<'mada' | 'visa' | 'mastercard' | 'applepay' | 'stcpay' | 'tabby' | 'tamara'>('mada');
  const [completionComment, setCompletionComment] = useState('');
  const [orderLogs, setOrderLogs] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

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
        const finalPlatformFee = hasFreeFee ? 0 : fees.platformCommission;

        updateData.paymentMethod = paymentMethod;
        updateData.paymentFees = {
          ...fees,
          platformCommission: finalPlatformFee
        };

        await recordTransaction({
          orderId: order.id,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          amount: order.amount,
          fee: finalPlatformFee,
          netAmount: order.amount,
          status: 'escrowed',
          specialty: order.category,
          paymentMethod,
          platformNetRevenue: fees.platformNetRevenue,
          providerCost: fees.providerCost,
          sellerNetShare: fees.sellerNetShare,
          paymentRef: paymentRef // Link reference to transaction audit
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
              transactionId: order.paymentRef // Use the stored Geidea reference
            })
          });
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
        {showPaymentModal && (
          <PaymentModal 
            amount={order.amount}
            loading={actionLoading}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            specificProvider={specificProvider}
            setSpecificProvider={setSpecificProvider}
            profile={profile}
            onClose={() => setShowPaymentModal(false)}
            onConfirm={handleConfirmPayment}
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
          <p className="font-mono font-bold text-sm bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">#ARB-{order.id.slice(0, 8).toUpperCase()}</p>
          <button 
            onClick={copyOrderLink}
            className="flex items-center gap-2 text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all group"
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
                   {order.paymentMethod === 'bnpl' ? 'دفع آجل (BNPL)' : 'دفع مباشر (Standard)'}
                </span>
             </div>

             <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-center">
                   <p className="text-[10px] text-gray-400 font-black mb-1">المبلغ المطلوب</p>
                   <p className="text-xl font-black">{order.amount.toLocaleString()} ر.س</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-center">
                   <p className="text-[10px] text-gray-400 font-black mb-1">رسوم الخدمة ({fees.feePercentage}%)</p>
                   <p className="text-xl font-black">{fees.platformCommission.toLocaleString()} ر.س</p>
                </div>
                <div className="p-6 bg-blue-600 rounded-3xl text-center text-white shadow-xl shadow-blue-100">
                   <p className="text-[10px] opacity-80 font-black mb-1">صافي المعقب</p>
                   <p className="text-xl font-black">{(order.amount - fees.platformCommission).toLocaleString()} ر.س</p>
                </div>
             </div>
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

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
             <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-bold">تفاصيل الصفقة</h2>
                <p className="text-2xl font-black text-[#2563eb]">{order.amount} ر.س</p>
             </div>
             <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{order.description}</p>
          </div>

          <div className="p-8 bg-gray-50/50 rounded-3xl border border-gray-100">
             <div className="flex flex-wrap gap-4">
                {order.sellerId === 'unknown' && (isSellerByEmail || isSellerByPhone) && (
                   <button onClick={claimOrder} disabled={actionLoading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">قبول الصفقة</button>
                )}
                {order.status === 'pending' && isBuyer && (
                  <button onClick={() => setShowPaymentModal(true)} disabled={actionLoading} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    دفع وتعميد الطلب
                  </button>
                )}
                {order.status === 'escrowed' && isSeller && (
                  <div className="w-full space-y-4">
                    <textarea className="w-full border rounded-2xl p-4" placeholder="وصف العمل المنجز..." value={completionComment} onChange={(e) => setCompletionComment(e.target.value)} />
                    <button onClick={() => updateStatus('delivered', completionComment)} disabled={actionLoading || !completionComment.trim()} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">تسليم العمل</button>
                  </div>
                )}
                {order.status === 'delivered' && isBuyer && (
                  <div className="flex gap-4">
                    <button onClick={() => updateStatus('completed')} disabled={actionLoading} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex-1">استلام وتحرير المبلغ</button>
                    <button onClick={() => updateStatus('disputed')} disabled={actionLoading} className="bg-white text-red-600 border border-red-200 px-6 py-3 rounded-xl font-bold">فتح نزاع</button>
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
}> = ({ amount, onConfirm, onClose, loading, paymentMethod, setPaymentMethod, specificProvider, setSpecificProvider, profile }) => {
  const fees = calculateOrderFees(amount, paymentMethod);
  const hasFreeFee = (profile?.freeFeeTransactions || 0) > 0;
  const platformFee = hasFreeFee ? 0 : fees.platformCommission;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-8 text-center border-b bg-gray-50/50">
          <Shield className="w-10 h-10 text-blue-600 mx-auto mb-2" />
          <h3 className="text-2xl font-black">تعميد ودفع آمن (Escrow)</h3>
          <p className="text-gray-500 text-sm">حجز المبلغ لضمان الحقوق</p>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => setPaymentMethod('standard')} className={`p-4 rounded-3xl border-2 transition-all ${paymentMethod === 'standard' ? 'border-blue-600 bg-blue-50' : 'border-gray-50 bg-gray-50'}`}>
               <CreditCard className="mx-auto" /><span className="block mt-2 font-bold text-sm">دفع مباشر</span>
             </button>
             <button onClick={() => setPaymentMethod('bnpl')} className={`p-4 rounded-3xl border-2 transition-all ${paymentMethod === 'bnpl' ? 'border-purple-600 bg-purple-50' : 'border-gray-50 bg-gray-50'}`}>
               <PackageCheck className="mx-auto" /><span className="block mt-2 font-bold text-sm">تقسيط</span>
             </button>
          </div>
          <div className="bg-gray-900 rounded-[2rem] p-6 text-white space-y-4">
             <div className="flex justify-between text-sm"><span>قيمة الصفقة</span><span>{amount.toLocaleString()} ر.س</span></div>
             <div className="flex justify-between text-sm"><span>رسوم الوساطة ({fees.feePercentage}%)</span><span className={hasFreeFee ? 'line-through opacity-50' : ''}>{fees.platformCommission.toLocaleString()} ر.س</span></div>
             <div className="border-t border-white/10 pt-4 flex justify-between items-end">
                <div><p className="text-[10px] opacity-50 uppercase mb-1">المجموع للدفع</p><p className="text-3xl font-black">{amount.toLocaleString()} ر.س</p></div>
                <div className="text-right"><p className="text-[8px] opacity-50 uppercase">سيصل للمعقب</p><p className="font-bold">{(amount - platformFee).toLocaleString()} ر.س</p></div>
             </div>
          </div>
          <button onClick={onConfirm} disabled={loading} className="w-full bg-[#2563eb] text-white py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-3">
            {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><Shield /><span>تأكيد التعميد</span></>}
          </button>
          <button onClick={onClose} className="w-full text-gray-400 font-bold">إلغاء</button>
        </div>
      </motion.div>
    </div>
  );
};
