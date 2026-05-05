import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, AlertCircle, MessageCircle, ArrowLeft, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchOrders = () => {
      const qBuyer = query(
        collection(db, 'orders'),
        where('buyerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const qSeller = query(
        collection(db, 'orders'),
        where('sellerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubBuyer = onSnapshot(qBuyer, (snapshot) => {
        const buyerOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(prev => {
          const others = prev.filter(o => o.sellerId === user.uid);
          const combined = [...buyerOrders, ...others].sort((a, b) => 
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
          );
          // Deduplicate by ID
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders (buyer)');
      });

      const unsubSeller = onSnapshot(qSeller, (snapshot) => {
        const sellerOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(prev => {
          const others = prev.filter(o => o.buyerId === user.uid);
          const combined = [...sellerOrders, ...others].sort((a, b) => 
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
          );
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders (seller)');
      });

      return () => {
        unsubBuyer();
        unsubSeller();
      };
    };

    fetchOrders();
  }, [user]);

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">قيد الانتظار</span>;
      case 'escrowed': return <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">المبلغ محجوز</span>;
      case 'delivered': return <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-bold">تم الإنجاز</span>;
      case 'completed': return <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">مكتمل</span>;
      case 'disputed': return <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">نزاع مالي</span>;
      case 'cancelled': return <span className="px-3 py-1 bg-gray-200 text-gray-400 rounded-full text-xs font-bold">ملغي</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">مرحباً بك في لوحة التحكم</h1>
          <p className="text-gray-500 mt-1">تتبع كافة طلباتك وحالة الضمان المالي.</p>
        </div>
        <button
          onClick={() => navigate('/create-order')}
          className="flex items-center gap-2 bg-[#2563eb] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1d4ed8] transition-all shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>رفع طلب جديد</span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">طلبات جارية</p>
            <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-xl text-green-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">طلبات مكتملة</p>
            <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === 'completed').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-red-50 p-3 rounded-xl text-red-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">نزاعات حالية</p>
            <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === 'disputed').length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">أحدث الطلبات</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
            <div className="bg-gray-100 p-6 rounded-full">
              <Plus className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">لا توجد طلبات حالياً.</p>
            <Link to="/create-order" className="text-blue-600 font-bold hover:underline">ارفع طلبك الأول الآن</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                whileHover={{ backgroundColor: '#fcfdff' }}
                className="p-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors cursor-pointer"
                onClick={() => navigate(`/order/${order.id}`)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg text-gray-900">{order.title}</h3>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1">{order.description}</p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-8">
                  <div className="text-right">
                    <p className="text-sm text-gray-400">القيمة</p>
                    <p className="text-lg font-bold text-gray-900">{order.amount} ر.س</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">التاريخ</p>
                    <p className="text-sm font-medium text-gray-700">
                      {order.createdAt ? format(order.createdAt.toDate(), 'd MMMM yyyy', { locale: ar }) : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <MessageCircle className="w-5 h-5" />
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
