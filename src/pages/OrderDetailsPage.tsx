import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Clock, CheckCircle2, ChevronRight, AlertTriangle, CreditCard, PackageCheck, Star } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChatRoom } from '../components/chat/ChatRoom';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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

  const steps = [
    { key: 'pending', label: 'بانتظار الموافقة', icon: <Clock /> },
    { key: 'escrowed', label: 'المبلغ محجوز', icon: <CreditCard /> },
    { key: 'delivered', label: 'تم التسليم', icon: <PackageCheck /> },
    { key: 'completed', label: 'اكتمال العميلة', icon: <CheckCircle2 /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === order.status);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                 {order.status === 'pending' && isSeller && (
                   <button
                     onClick={() => updateStatus('escrowed')}
                     disabled={actionLoading}
                     className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md"
                   >
                     بدء الضمان واحتجاز المبلغ
                   </button>
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
                   <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                     <CheckCircle2 className="w-5 h-5" />
                     <span>تم إغلاق الصفقة بنجاح</span>
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
