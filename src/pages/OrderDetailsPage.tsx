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
import { PaymentIcon } from '../components/ui/PaymentIcon';
import { OrderRating } from '../components/OrderRating';
import { LoginModal } from '../components/auth/LoginModal';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { sendNotification, recordTransaction, recordOrderEvent, updateSellerPerformance } from '../lib/notificationService';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

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
  const [paymentMethod, setPaymentMethod] = useState<'mada' | 'visa' | 'mastercard' | 'applepay' | 'stcpay'>('mada');
  const [completionComment, setCompletionComment] = useState('');
  const [orderLogs, setOrderLogs] = useState<any[]>([]);

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

    // Fetch Audit Logs
    const logQuery = query(collection(db, 'orderLogs'), where('orderId', '==', id), orderBy('createdAt', 'desc'));
    const unsubscribeLogs = onSnapshot(logQuery, (snapshot) => {
      setOrderLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Auto-mark notifications for this order as read
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

  const updateStatus = async (newStatus: Order['status'], comment?: string) => {
    if (!order || !user) return;
    setActionLoading(true);
    try {
      const prevStatus = order.status;
      await updateDoc(doc(db, 'orders', order.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Record in Audit Trail
      await recordOrderEvent(
        order.id,
        user.uid,
        `تغيير الحالة: ${newStatus}`,
        prevStatus,
        newStatus,
        comment
      );

      // If seller is updating status, sync their performance metrics
      if (order.sellerId === user.uid) {
        await updateSellerPerformance(user.uid);
      }

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

        const priorityMap: Record<string, 'urgent' | 'settlement' | 'normal'> = {
          'disputed': 'urgent',
          'escrowed': 'settlement',
          'completed': 'settlement',
          'delivered': 'normal',
          'cancelled': 'urgent'
        };
        const priority = priorityMap[newStatus] || 'normal';

        if (isBoth) {
          if (order.buyerId) await sendNotification(order.buyerId, titles[newStatus], messages[newStatus], 'order_update', priority, order.id);
          if (sellerId) await sendNotification(sellerId, titles[newStatus], messages[newStatus], 'order_update', priority, order.id);
        } else {
          const recipientId = isToSeller ? sellerId : order.buyerId;
          if (recipientId) {
            await sendNotification(
              recipientId, 
              titles[newStatus], 
              messages[newStatus], 
              newStatus === 'escrowed' ? 'payment' : 'order_update',
              priority,
              order.id
            );
          }
        }
      }

      // --- Financial Transaction Records ---
      if (newStatus === 'escrowed') {
        const hasFreeFee = (profile?.freeFeeTransactions || 0) > 0;
        const fee = hasFreeFee ? 0 : order.amount * 0.05;

        await recordTransaction({
          orderId: order.id,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          amount: order.amount,
          fee: fee,
          netAmount: order.amount,
          status: 'escrowed',
          specialty: order.category
        });

        // Consume free fee transaction benefit
        if (hasFreeFee && user) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            freeFeeTransactions: (profile?.freeFeeTransactions || 1) - 1
          });
        }
      } else if (newStatus === 'completed') {
        // Referral Reward System Logic
        try {
          const { collection, query, where, getDocs, updateDoc: firestoreUpdateDoc, addDoc, getDoc, doc: firestoreDoc } = await import('firebase/firestore');
          
          // Check if this buyer was referred and has a pending referral
          const refQ = query(
            collection(db, 'referrals'), 
            where('inviteeId', '==', order.buyerId), 
            where('status', '==', 'pending')
          );
          const refSnap = await getDocs(refQ);
          
          if (!refSnap.empty) {
            const referralDoc = refSnap.docs[0];
            const referralData = referralDoc.data();
            
            // Mark referral as completed
            await firestoreUpdateDoc(firestoreDoc(db, 'referrals', referralDoc.id), {
              status: 'completed',
              completedAt: serverTimestamp()
            });
            
            // Reward the Inviter
            const inviterRef = firestoreDoc(db, 'users', referralData.inviterId);
            const inviterSnap = await getDoc(inviterRef);
            if (inviterSnap.exists()) {
              const inviterData = inviterSnap.data();
              await firestoreUpdateDoc(inviterRef, {
                freeFeeTransactions: (inviterData.freeFeeTransactions || 0) + 1
              });
              
              // Notify Inviter
              await sendNotification(
                referralData.inviterId,
                'تم تفعيل مكافأة الدعوة! 🎁',
                'قام صديقك بإتمام أول عملية له. لقد حصلت على عملية وساطة قادمة بدون رسوم منصة!',
                'settlement',
                'settlement'
              );
            }
          }
        } catch (err) {
          console.error("Error processing referral reward:", err);
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
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        <div className="space-y-6">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <Shield className="w-10 h-10 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-gray-900 leading-tight">طلب ضمان مالي جديد</h1>
            <p className="text-gray-500 font-medium">لديك دعوة لإتمام عملية وساطة مالية عبر منصة عربون</p>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 text-right space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
               <span className="text-gray-400 font-bold ml-4">عنوان الصفقة</span>
               <span className="text-gray-900 font-black">{order.title}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
               <span className="text-gray-400 font-bold ml-4">القيمة</span>
               <span className="text-[#2563eb] font-black text-xl">{order.amount} ر.س</span>
            </div>
            <div className="pt-2">
               <p className="text-xs text-gray-400 font-bold mb-2 uppercase tracking-widest">الوصف</p>
               <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{order.description}</p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <p className="text-sm text-gray-400 font-medium">للإطلاع على التفاصيل الكاملة والموافقة على الطلب يرجى تسجيل الدخول</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setIsLoginModalOpen(true)} 
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
              >
                تسجيل الدخول / إنشاء حساب
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors"
              >
                العودة للرئيسية
              </button>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-50 flex items-center justify-center gap-2">
           <p className="text-[10px] text-gray-400 font-medium italic">منصة عربون - الوساطة المالية الأكثر أماناً في المملكة</p>
        </div>
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
      await updateDoc(doc(db, 'orders', order.id), {
        sellerId: user.uid,
        updatedAt: serverTimestamp(),
      });
      await recordOrderEvent(
        order.id,
        user.uid,
        'قبول الصفقة',
        order.status,
        order.status,
        'قام الطرف الثاني بقبول الصفقة وربطها بحسابه.'
      );
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
          <div className="bg-white p-4 md:p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center mb-8 overflow-x-auto pb-4 gap-4 px-2 no-scrollbar">
               {steps.map((step, idx) => (
                 <div key={step.key} className="flex flex-col items-center gap-2 relative z-10 shrink-0">
                   <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                     idx <= currentStepIndex ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-100 text-gray-400'
                   }`}>
                     {React.cloneElement(step.icon as React.ReactElement, { className: 'w-4 h-4 md:w-5 md:h-5' })}
                   </div>
                   <span className={`text-[10px] md:text-xs font-bold whitespace-nowrap ${idx <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'}`}>
                     {step.label}
                   </span>
                   {idx < steps.length - 1 && (
                     <div className={`absolute top-5 md:top-6 left-10 md:left-12 w-[calc(100%+16px)] h-[2px] -z-10 ${
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
             
             {/* Audit Timeline - Oversight */}
             <div className="p-8 border-t border-gray-100 bg-gray-50/20">
               <div className="flex items-center gap-2 mb-6">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <h3 className="font-bold text-gray-900 underline decoration-blue-100 decoration-4">سجل الرقابة والتحركات</h3>
               </div>
               <div className="space-y-6">
                 {orderLogs.length === 0 ? (
                   <p className="text-sm text-gray-400 text-center py-4 italic text-right">بانتظار التحركات الأولى في الصفقة...</p>
                 ) : (
                   <div className="relative border-r-2 border-gray-100 pr-6 mr-3 space-y-8">
                      {orderLogs.map((log) => (
                        <div key={log.id} className="relative">
                           <div className={`absolute -right-[33px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-colors ${
                             log.newStatus === 'completed' ? 'bg-green-500' : 
                             log.newStatus === 'cancelled' ? 'bg-red-500' :
                             log.newStatus === 'disputed' ? 'bg-amber-500' : 
                             log.newStatus === 'delivered' ? 'bg-blue-600' : 'bg-blue-300'
                           }`} />
                           <div className="space-y-1 text-right">
                              <div className="flex justify-between items-start">
                                 <p className="text-sm font-black text-gray-900 leading-none">{log.action}</p>
                                 <span className="text-[10px] text-gray-400 font-bold bg-white px-2 py-1 rounded-lg border border-gray-50">
                                   {log.createdAt ? format(log.createdAt.toDate(), 'HH:mm - d MMM', { locale: ar }) : ''}
                                 </span>
                              </div>
                              {log.comment && (
                                <p className="text-xs text-gray-600 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm mt-2 italic leading-relaxed text-right">
                                  "{log.comment}"
                                </p>
                              )}
                              <p className="text-[10px] text-gray-400 mt-1 text-right">بواسطة: {log.userId === order.buyerId ? 'المشتري' : (log.userId === order.sellerId ? 'المعقب' : 'النظام')}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                 )}
               </div>
             </div>
             
             {/* Action Bar */}
             <div className="p-8 bg-gray-50/50 border-t border-gray-100">
               <div className="flex flex-wrap gap-4">
                 {order.sellerId === 'unknown' && (isSellerByEmail || isSellerByPhone) && (
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
                    <div className="w-full space-y-4">
                      <div className="space-y-2">
                         <label className="text-sm font-bold text-gray-700 block">وصف العمل المنجز (إثبات التسليم)</label>
                         <textarea 
                           className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                           placeholder="اكتب هنا ما تم إنجازه، أو أي ملاحظات للعميل قبل تأكيد التسليم..."
                           value={completionComment}
                           onChange={(e) => setCompletionComment(e.target.value)}
                         />
                      </div>
                      <button
                        onClick={() => updateStatus('delivered', completionComment)}
                        disabled={actionLoading || !completionComment.trim()}
                        className="bg-[#2563eb] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#1d4ed8] transition-all shadow-md disabled:opacity-50"
                      >
                        إرسال العمل وتأكيد التسليم
                      </button>
                    </div>
                 )}
                 {order.status === 'delivered' && isBuyer && (
                    <div className="flex flex-col gap-4">
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                         <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                         <div>
                            <p className="text-sm font-bold text-blue-900">ملاحظة المعقب حول التسليم:</p>
                            <p className="text-sm text-blue-700 leading-relaxed italic">{orderLogs.find(l => l.newStatus === 'delivered')?.comment || 'لم يتم ترك ملاحظات'}</p>
                         </div>
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={() => updateStatus('completed')}
                          disabled={actionLoading}
                          className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md flex-1"
                        >
                          موافقة وتحرير المبلغ
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('يرجى ذكر سبب رفض التسليم:');
                            if (reason) updateStatus('escrowed', `تم رفض التسليم: ${reason}`);
                          }}
                          disabled={actionLoading}
                          className="bg-white text-gray-500 border border-gray-200 px-6 py-3 rounded-xl font-bold hover:bg-gray-50"
                        >
                          طلب تعديل/رفض
                        </button>
                      </div>
                    </div>
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
                   <>
                    <button
                      onClick={() => updateStatus('cancelled')}
                      disabled={actionLoading}
                      className="bg-white text-gray-600 border border-gray-200 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all"
                    >
                      إلغاء الطلب نهائياً
                    </button>
                    <p className="mt-2 text-[10px] text-gray-400 font-bold border-r-2 border-gray-100 pr-2 pb-1 leading-relaxed">
                      * ملاحظة هامة: الإلغاء متاح فقط في مرحلة "بانتظار الموافقة" وقبل دفع المبلغ. بمجرد قيام المشتري بالتعميد، يتم حجز الأموال لضمان حقوق الطرفين.
                    </p>
                   </>
                 )}
                 {user?.email === 'khyratfarmdates@gmail.com' && (
                   <div className="w-full mt-6 p-6 bg-red-50 border border-red-100 rounded-3xl">
                      <div className="flex items-center gap-2 text-red-600 font-black text-sm mb-4">
                         <Shield className="w-4 h-4" />
                         أدوات تحكم الإدارة (خاص بالمالك)
                      </div>
                      <div className="flex flex-wrap gap-3">
                         <button 
                           onClick={() => updateStatus('completed')}
                           className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold text-xs hover:bg-red-700 transition-all"
                         >
                           إكمال قسري (تحرير المبلغ)
                         </button>
                         <button 
                           onClick={() => updateStatus('cancelled')}
                           className="bg-white text-red-600 border border-red-200 px-6 py-2 rounded-xl font-bold text-xs hover:bg-red-50 transition-all"
                         >
                           إلغاء قسري (إعادة المبلغ)
                         </button>
                         <button 
                           onClick={() => updateStatus('escrowed')}
                           className="bg-white text-gray-600 border border-gray-200 px-6 py-2 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all"
                         >
                           تغيير الحالة إلى "معمد"
                         </button>
                      </div>
                   </div>
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
  profile: any;
}> = ({ amount, onConfirm, onClose, loading, paymentMethod, setPaymentMethod, profile }) => (
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: 'mada' as const, name: 'MADA' },
              { id: 'visa' as const, name: 'VISA' },
              { id: 'mastercard' as const, name: 'Mastercard' },
              { id: 'applepay' as const, name: 'Apple Pay' },
              { id: 'stcpay' as const, name: 'STC Pay' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setPaymentMethod(m.id as any)}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center h-16 ${
                  paymentMethod === (m.id as any) ? 'border-blue-600 bg-blue-50' : 'border-gray-50 bg-gray-50/50'
                }`}
              >
                <PaymentIcon type={m.id} className="max-h-8" />
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
            <span className={`font-bold ${((profile?.freeFeeTransactions || 0) > 0) ? 'line-through text-gray-400' : ''}`}>
              {(amount * 0.05).toFixed(2)} ر.س
            </span>
          </div>
          {(profile?.freeFeeTransactions || 0) > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-bold">
              <span>خصم مكافأة الدعوة</span>
              <span>-{(amount * 0.05).toFixed(2)} ر.س</span>
            </div>
          )}
          <div className="pt-2 border-t border-gray-200 flex justify-between">
            <span className="font-black text-gray-900">المجموع المطلوب</span>
            <span className="font-black text-blue-600">
              {((profile?.freeFeeTransactions || 0) > 0 ? amount : (amount * 1.05)).toFixed(2)} ر.س
            </span>
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
