import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Clock, CheckCircle2, ChevronRight, AlertTriangle, CreditCard, PackageCheck, Star, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChatRoom } from '../components/chat/ChatRoom';
import { OrderRating } from '../components/OrderRating';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { sendNotification, recordTransaction } from '../lib/notificationService';

export const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mada' | 'visa' | 'apple'>('mada');

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

    return () => unsubscribe();
  }, [id, navigate]);

  const updateStatus = async (newStatus: Order['status']) => {
    if (!order) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // --- Notifications Logic ---
      const messages: Record<string, string> = {
        'cancelled': 'تم إلغاء الصفقة من قبل الطرف الآخر.',
        'escrowed': `رائع! تم دفع مبلغ ${order.amount} ر.س واحتجازه بأمان. يمكنك البدء في تنفيذ المعاملة.`,
        'delivered': 'تم رفع إنجاز المعاملة من قبل المعقب، يرجى المراجعة والاعتماد.',
        'completed': 'تم تحرير المبلغ بنجاح لحساب المعقب. شكراً لتعاملك مع عربون.',
        'disputed': 'تم فتح نزاع بخصوص هذا الطلب. سيتواصل معك أحد مدراء المنصة قريباً.'
      };

      const titles: Record<string, string> = {
        'cancelled': 'تنبيه: إلغاء صفقة',
        'escrowed': 'تنبيه: تم تعميد المبلغ',
        'delivered': 'تنبيه: تم تسليم العمل',
        'completed': 'تنبيه: اكتمال الصفقة',
        'disputed': 'تنبيه: فتح نزاع'
      };

      if (messages[newStatus]) {
        // Decide who gets the notification
        // For Escrowed: Seller gets it
        // For Delivered: Buyer gets it
        // For Completed: Seller gets it
        // For Cancelled/Disputed: Both? Let's simplify.
        const isToSeller = ['escrowed', 'completed'].includes(newStatus);
        const isBoth = ['cancelled', 'disputed'].includes(newStatus);
        const sellerId = order.sellerId === 'unknown' ? null : order.sellerId;

        if (isBoth) {
          if (order.buyerId) await sendNotification(order.buyerId, titles[newStatus], messages[newStatus], 'order_update', order.id);
          if (sellerId) await sendNotification(sellerId, titles[newStatus], messages[newStatus], 'order_update', order.id);
        } else {
          const recipientId = isToSeller ? sellerId : order.buyerId;
          if (recipientId) {
            await sendNotification(
              recipientId, 
              titles[newStatus], 
              messages[newStatus], 
              newStatus === 'escrowed' ? 'payment' : 'order_update',
              order.id
            );
          }
        }
      }

      // --- Financial Transaction Records ---
      if (newStatus === 'escrowed') {
        await recordTransaction({
          orderId: order.id,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          amount: order.amount,
          fee: order.amount * 0.05,
          netAmount: order.amount,
          status: 'escrowed',
          specialty: order.category
        });
      } else if (newStatus === 'completed') {
        // Mark transaction as completed for admin analytics
        // This usually involves updating the existing transaction or recording a payout
      }

    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!order) return null;

  const isBuyer = order.buyerId === user?.uid;
  const isSeller = order.sellerId === user?.uid;
  const isSellerByEmail = order.sellerEmail === user?.email;

  const claimOrder = async () => {
    if (!user || !order) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        sellerId: user.uid,
        updatedAt: serverTimestamp(),
      });
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

  const handleConfirmPayment = async () => {
    setActionLoading(true);
    try {
      // هنا يتم الربط الحقيقي مع Stripe/Moyasar
      // في هذه المحاكاة، نفترض نجاح العملية مباشرة
      await updateStatus('escrowed');
      setShowPaymentModal(false);
    } catch (error) {
      console.error(error);
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
            onClose={() => setShowPaymentModal(false)}
            onConfirm={handleConfirmPayment}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate('/dashboard')} className="hover:text-blue-600">لوحة التحكم</button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">تفاصيل الطلب: {order.title}</span>
        </div>
        <div className="text-right">
           <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">سجل رقم</p>
           <p className="text-sm font-mono font-bold text-gray-900">#ARB-{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Status Tracker */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-8">
               {steps.map((step, idx) => (
                 <div key={step.key} className="flex flex-col items-center gap-2 relative z-10">
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                     idx <= currentStepIndex ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-100 text-gray-400'
                   }`}>
                     {React.cloneElement(step.icon as React.ReactElement, { className: 'w-5 h-5' })}
                   </div>
                   <span className={`text-xs font-bold ${idx <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'}`}>
                     {step.label}
                   </span>
                   {idx < steps.length - 1 && (
                     <div className={`absolute top-6 left-12 w-[calc(100%-24px)] h-[2px] -z-10 ${
                       idx < currentStepIndex ? 'bg-blue-600' : 'bg-gray-100'
                     }`} />
                   )}
                 </div>
               ))}
            </div>

            {order.status === 'disputed' && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3 text-red-800">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold">نزاع مالي مفتوح</h4>
                  <p className="text-sm opacity-90 leading-relaxed">تم تعليق الصفقة. سيقوم فريق عربون بمراجعة المحادثة والمستندات لحل النزاع بشكل عادل.</p>
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">تفاصيل الصفقة</h2>
                <div className="text-right">
                  <p className="text-sm text-gray-500">القيمة الإجمالية</p>
                  <p className="text-2xl font-black text-[#2563eb]">{order.amount} ر.س</p>
                </div>
             </div>
             <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">التصنيف</p>
                    <p className="font-bold text-gray-900">{order.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">تاريخ البدء</p>
                    <p className="font-bold text-gray-900">
                       {order.createdAt ? format(order.createdAt.toDate(), 'd MMMM yyyy (HH:mm)', { locale: ar }) : ''}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-tight">الوصف والشروط</p>
                  <div className="bg-gray-50 p-6 rounded-2xl text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[100px] border border-gray-100">
                    {order.description}
                  </div>
                </div>
             </div>
             
             {/* Action Bar */}
             <div className="p-8 bg-gray-50/50 border-t border-gray-100">
               <div className="flex flex-wrap gap-4">
                 {order.sellerId === 'unknown' && isSellerByEmail && (
                    <button
                      onClick={claimOrder}
                      disabled={actionLoading}
                      className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>قبول الصفقة وربطها بحسابي</span>
                    </button>
                 )}
                 {order.status === 'pending' && isBuyer && (
                   <button
                     onClick={() => setShowPaymentModal(true)}
                     disabled={actionLoading}
                     className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md flex items-center gap-2"
                   >
                     <CreditCard className="w-5 h-5" />
                     دفع وتعميد المبلغ ({order.amount} ر.س)
                   </button>
                 )}
                 {order.status === 'pending' && isSeller && (
                   <div className="bg-blue-50 text-blue-700 px-6 py-3 rounded-xl font-bold border border-blue-100 text-sm">
                     بانتظار قيام المشتري بدفع المبلغ وتعميد الصفقة...
                   </div>
                 )}
                 {order.status === 'escrowed' && isSeller && (
                    <button
                      onClick={() => updateStatus('delivered')}
                      disabled={actionLoading}
                      className="bg-[#2563eb] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#1d4ed8] transition-all shadow-md"
                    >
                      تأكيد تسليم الخدمة/المنتج
                    </button>
                 )}
                 {order.status === 'delivered' && isBuyer && (
                    <button
                      onClick={() => updateStatus('completed')}
                      disabled={actionLoading}
                      className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md"
                    >
                      موافقة وتحرير المبلغ للبائع
                    </button>
                 )}
                 {(order.status === 'escrowed' || order.status === 'delivered') && (
                    <button
                      onClick={() => updateStatus('disputed')}
                      disabled={actionLoading}
                      className="bg-white text-red-600 border border-red-200 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-all"
                    >
                      فتح نزاع
                    </button>
                 )}
                 {order.status === 'pending' && (
                    <button
                      onClick={() => updateStatus('cancelled')}
                      disabled={actionLoading}
                      className="bg-white text-gray-600 border border-gray-200 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all"
                    >
                      إلغاء الطلب
                    </button>
                 )}
                 {order.status === 'completed' && (
                   <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>تم إغلاق الصفقة بنجاح</span>
                    </div>
                    
                    {isBuyer && !order.buyerRatingCompleted && !ratingSuccess && (
                      <div className="mt-8">
                         <OrderRating 
                            orderId={order.id}
                            reviewerId={user!.uid}
                            revieweeId={order.sellerId}
                            type="buyer-to-seller"
                            onSuccess={() => setRatingSuccess(true)}
                         />
                      </div>
                    )}

                    {isSeller && !order.sellerRatingCompleted && !ratingSuccess && (
                      <div className="mt-8">
                         <OrderRating 
                            orderId={order.id}
                            reviewerId={user!.uid}
                            revieweeId={order.buyerId}
                            type="seller-to-buyer"
                            onSuccess={() => setRatingSuccess(true)}
                         />
                      </div>
                    )}

                    {ratingSuccess && (
                      <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-3xl text-center">
                         <CheckCircle2 className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                         <h3 className="text-xl font-bold text-blue-900">شكراً لتقييمك!</h3>
                         <p className="text-blue-600 font-medium">مساهمتك تساعد في جعل المجتمع أكثر شفافية.</p>
                      </div>
                    )}
                   </div>
                 )}
               </div>
             </div>
          </div>
        </div>

        {/* Sidebar/Chat */}
        <div className="space-y-8">
           <ChatRoom orderId={order.id} />
           
           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">نصائح عربون الرمضانية</h3>
              <ul className="space-y-3">
                <li className="flex gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>لا تشارك معلوماتك البنكية خارج المنصة.</span>
                </li>
                <li className="flex gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>وثق كل الاتفاقيات في هذه المحادثة.</span>
                </li>
                <li className="flex gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-blue-500 shrink-0" />
                   <span>فريق عربون يراقب المحادثات للتدخل السريع.</span>
                </li>
              </ul>
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
  paymentMethod: string;
  setPaymentMethod: (m: any) => void;
}> = ({ amount, onConfirm, onClose, loading, paymentMethod, setPaymentMethod }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
    >
      <div className="p-8 text-center border-b border-gray-100">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-black text-gray-900">دفع العربون والتعميد</h3>
        <p className="text-gray-500 mt-2">سيتم احتجاز المبلغ في منصة عربون حتى استلامك للخدمة</p>
      </div>

      <div className="p-8 space-y-6">
        <div className="flex flex-col gap-3">
          <p className="font-bold text-sm text-gray-400 text-right">اختر وسيلة الدفع</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'mada', name: 'مدى', img: 'https://i.imgur.com/6S3Y2Y7.png' },
              { id: 'visa', name: 'فيزا', img: 'https://i.imgur.com/8Qp6V6Y.png' },
              { id: 'apple', name: 'Apple Pay', icon: '' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  paymentMethod === m.id ? 'border-blue-600 bg-blue-50' : 'border-gray-50 bg-gray-50/50'
                }`}
              >
                {m.img ? <img src={m.img} alt={m.name} className="h-4 grayscale-0" /> : <span className="text-xl font-bold">{m.icon}</span>}
                <span className="text-[10px] font-black">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">قيمة الطلب</span>
            <span className="font-bold">{amount} ر.س</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">رسوم التعميد (5%)</span>
            <span className="font-bold">{(amount * 0.05).toFixed(2)} ر.س</span>
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between">
            <span className="font-black text-gray-900">المجموع المطلوب</span>
            <span className="font-black text-blue-600">{(amount * 1.05).toFixed(2)} ر.س</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
          >
            {loading ? 'جاري معالجة الدفع...' : 'تأكيد الدفع والتعميد الفوري'}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>

      <div className="p-4 bg-gray-50 text-[10px] text-center text-gray-400 flex items-center justify-center gap-2">
        <Shield className="w-3 h-3" />
        مدعوم من منصة عربون للوساطة الآمنة - تشفير 256-bit
      </div>
    </motion.div>
  </div>
);
