import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { Search, Filter, Tag, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const SearchPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'orders'), 
          where('visibility', '==', 'public'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => 
    o.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="relative group">
        <input
          type="text"
          className="w-full bg-white border border-gray-200 rounded-2xl px-12 py-5 text-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm"
          placeholder="ابحث عن صفقات، خدمات، أو مقدمي خدمات..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute right-4 top-5 w-6 h-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {['الكل', 'عقارات', 'سيارات', 'تعقيب', 'إلكترونيات'].map(tag => (
          <button key={tag} className="px-4 py-2 bg-white border border-gray-100 rounded-full text-sm font-bold text-gray-600 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm">
            {tag}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order, idx) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => navigate(`/service/${order.id}`)}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 px-3 py-1 rounded-full text-xs font-black text-blue-600 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {order.category}
                </div>
                <p className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{order.amount} ر.س</p>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">{order.title}</h3>
              <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-6">
                {order.description}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-50">
                      <Search className="w-4 h-4 text-gray-400" />
                   </div>
                   <span className="text-xs text-gray-400 font-medium">
                     {order.createdAt ? format(order.createdAt.toDate(), 'd MMM yyyy', { locale: ar }) : ''}
                   </span>
                </div>
                <div className="flex items-center gap-1 text-blue-600 font-bold text-sm">
                   <span>مشاهدة التفاصيل</span>
                   <ArrowLeft className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-gray-500">
             لا توجد نتائج بحث مطابقة.
          </div>
        )}
      </div>
    </div>
  );
};
