import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, CreditCard, AlertTriangle, MessageSquare, Clock, Globe, ExternalLink, LogOut, Star, 
  Shield, Terminal, Activity, Trash2, ChevronRight, MessageCircle, Plus, Briefcase, 
  ShieldCheck, CheckCircle2, AlertCircle, TrendingUp 
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { IdentityVerification } from '../components/IdentityVerification';
import { ServiceManager } from '../components/ServiceManager';
import { ChatRoom } from '../components/chat/ChatRoom';
import { useNotifications } from '../components/providers/NotificationProvider';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../lib/notificationService';

const getStatusBadge = (status: Order['status']) => {
  switch (status) {
    case 'pending': return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-black italic">قيد الانتظار</span>;
    case 'escrowed': return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black border border-blue-200 shadow-sm">المبلغ محجوز</span>;
    case 'delivered': return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black border border-purple-200">بانتظار الاستلام</span>;
    case 'completed': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black border border-green-200">مكتمل ✅</span>;
    case 'disputed': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black border border-red-200">نزاع نشط</span>;
    case 'cancelled': return <span className="px-3 py-1 bg-gray-200 text-gray-500 rounded-full text-[10px] font-black">تم الإلغاء</span>;
    default: return null;
  }
};

interface OrderRowProps {
  order: Order;
  navigate: (path: string) => void;
}

const OrderRow: React.FC<OrderRowProps> = ({ order, navigate }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.01, backgroundColor: '#fdfdff' }}
      className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer bg-white border border-gray-100 rounded-2xl md:rounded-0 md:border-0 md:border-b md:border-gray-50/50 group hover:shadow-lg hover:shadow-blue-900/5 md:hover:shadow-none relative overflow-hidden"
      onClick={() => navigate(`/order/${order.id}`)}
    >
      <div className="absolute top-0 right-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="space-y-1 relative z-10">
        <div className="flex items-center gap-2 mb-1">
          {getStatusBadge(order.status)}
          <span className="text-[10px] font-bold text-gray-400 font-mono tracking-tighter">#ARB-{order.id.slice(0, 4).toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-3">
          <h3 className="font-black text-sm md:text-base text-gray-900 group-hover:text-blue-600 transition-colors uppercase truncate">{order.title}</h3>
        </div>
        <p className="text-[10px] md:text-xs text-gray-500 line-clamp-1 italic font-medium">{order.description}</p>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-6 md:gap-10 mt-2 md:mt-0 relative z-10">
        <div className="text-right">
          <p className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">صافي القيمة</p>
          <p className="text-base md:text-lg font-black text-gray-900 tracking-tight">{order.amount} <span className="text-[10px] md:text-xs font-bold text-gray-400">ر.س</span></p>
        </div>
        <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-gray-50 rounded-lg md:rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm border border-gray-100/50">
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5 rtl:rotate-180 transition-transform group-hover:translate-x-[-2px]" />
        </div>
      </div>
    </motion.div>
  );
};

const ArchivedOrderRow: React.FC<OrderRowProps> = ({ order, navigate }) => {
  return (
    <motion.div
      whileHover={{ backgroundColor: '#fcfdff' }}
      className="p-3 md:p-6 md:px-8 flex items-center justify-between gap-4 transition-colors cursor-pointer border-b border-gray-50 opacity-80 hover:opacity-100 group"
      onClick={() => navigate(`/order/${order.id}`)}
    >
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
          <Shield className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
        </div>
        <div className="space-y-0.5 overflow-hidden">
          <h3 className="font-bold text-xs md:text-sm text-gray-900 truncate">{order.title}</h3>
          <div className="flex items-center gap-2 text-[8px] md:text-xs font-bold">
             <span className="text-gray-400">#ARB-{order.id.slice(0, 4)}</span>
             <span className="text-gray-400 border-r border-gray-100 pr-2">
               {order.createdAt ? format(order.createdAt.toDate(), 'd MMM', { locale: ar }) : ''}
             </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6 shrink-0">
        <div className="hidden sm:block">
           {getStatusBadge(order.status)}
        </div>
        <div className="text-right">
          <p className="text-sm md:text-lg font-black text-gray-400">{order.amount} ر.س</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 rtl:rotate-180" />
      </div>
    </motion.div>
  );
};

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIdentityVerify, setShowIdentityVerify] = useState(false);
  const [isUpdatingSeller, setIsUpdatingSeller] = useState(false);
  const [newBio, setNewBio] = useState(profile?.bio || '');
  const [newWebsite, setNewWebsite] = useState(profile?.websiteUrl || '');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [confidenceScore, setConfidenceScore] = useState(100);
  const [activeTab, setActiveTab] = useState<'orders' | 'services' | 'messages' | 'stats' | 'system' | 'notifications'>('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const { notifications, unreadCount } = useNotifications();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || orders.length === 0) return;
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const orderId = params.get('orderId');
    const sellerId = params.get('sellerId');

    if (tab === 'messages') {
      setActiveTab('messages');
      if (orderId) {
        setSelectedOrderId(orderId);
      } else if (sellerId) {
        const existing = orders.find(o => o.sellerId === sellerId || o.buyerId === sellerId);
        if (existing) setSelectedOrderId(existing.id);
      }
    } else if (tab === 'services') {
      setActiveTab('services');
    } else if (tab === 'notifications') {
      setActiveTab('notifications');
    }
  }, [location.search, loading, orders.length]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch reviews to calculate confidence score
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('revieweeId', '==', user.uid)
    );
    
    const unsubReviews = onSnapshot(reviewsQuery, (snapshot) => {
      const revs = snapshot.docs.map(doc => doc.data());
      setReviews(revs);
      
      // Calculate Score
      const sellerOrd = orders.filter(o => o.sellerId === user.uid);
      const disputed = sellerOrd.filter(o => o.status === 'disputed').length;
      const cancelled = sellerOrd.filter(o => o.status === 'cancelled').length;
      const lowRatings = revs.filter(r => r.rating < 3).length;
      
      let score = 100;
      score -= (lowRatings * 10);
      score -= (disputed * 15);
      score -= (cancelled * 5);
      setConfidenceScore(Math.max(10, score));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reviews'));

    return () => unsubReviews();
  }, [user, orders.length]);

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
          const others = prev.filter(o => o.sellerId === user.uid || (user.email && o.sellerEmail === user.email));
          const combined = [...buyerOrders, ...others].sort((a, b) => 
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
          );
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
        setLoading(false);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

      const unsubSeller = onSnapshot(qSeller, (snapshot) => {
        const sellerOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(prev => {
          const others = prev.filter(o => o.buyerId === user.uid || (user.email && o.sellerEmail === user.email));
          const combined = [...sellerOrders, ...others].sort((a, b) => 
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
          );
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
        setLoading(false);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

      let unsubSellerEmail = () => {};
      if (user.email) {
        const qSellerEmail = query(
          collection(db, 'orders'),
          where('sellerEmail', '==', user.email),
          orderBy('createdAt', 'desc')
        );
        unsubSellerEmail = onSnapshot(qSellerEmail, (snapshot) => {
          const sellerEmailOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
          setOrders(prev => {
            const others = prev.filter(o => o.buyerId === user.uid || o.sellerId === user.uid);
            const combined = [...sellerEmailOrders, ...others].sort((a, b) => 
              (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
            );
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
          });
          setLoading(false);
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));
      }

      return () => {
        unsubBuyer();
        unsubSeller();
        unsubSellerEmail();
      };
    };

    fetchOrders();
  }, [user]);

  useEffect(() => {
    if (!profile?.isAdmin) return;

    const qLogs = query(
      collection(db, 'system_logs'),
      orderBy('timestamp', 'desc')
    );

    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'system_logs'));

    return () => unsubLogs();
  }, [profile?.isAdmin]);

  const handleUpdateProfile = async (specialties: string[]) => {
    if (!user) return;
    setIsUpdatingSeller(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { 
        isSeller: true,
        bio: newBio || 'معقب محترف في منصة عربون، أقدم خدمات احترافية بضمان مالي.',
        websiteUrl: newWebsite,
        specialties: specialties,
        trustLevel: (profile?.trustLevel || 0),
        updatedAt: serverTimestamp()
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingSeller(false);
    }
  };

  const sellerOrders = orders.filter(o => o.sellerId === user?.uid);
  const completedOrdersCount = sellerOrders.filter(o => o.status === 'completed').length;
  const failedOrdersCount = sellerOrders.filter(o => o.status === 'disputed' || o.status === 'cancelled').length;

  const activeOrdersCount = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;

  const activeConversations = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const archivedConversations = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');

  return (
    <div className="space-y-4 md:space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight">لوحة التحكم</h1>
          <p className="text-[10px] md:text-gray-500 mt-0.5 md:mt-1 font-medium italic">أهلاً {profile?.displayName}، تتبع أعمالك ومحادثاتك هنا.</p>
        </div>
        <div className="flex gap-2 md:gap-3 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('messages')}
            className={`p-2.5 md:p-3 rounded-xl transition-all relative ${activeTab === 'messages' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 shadow-sm'}`}
          >
            <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></div>
          </button>
          <button
            onClick={() => navigate('/create-order')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-900 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-base hover:bg-black transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span>طلب جديد</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1.5 bg-gray-100/50 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar border border-gray-100">
        {[
          { id: 'orders', label: 'طلباتي', icon: Clock },
          { id: 'notifications', label: 'الإشعارات', icon: Bell, count: unreadCount },
          { id: 'services', label: 'خدمات البائع', icon: Briefcase, sellerOnly: true },
          { id: 'messages', label: 'المحادثات', icon: MessageCircle },
          { id: 'stats', label: 'الرقابة والتقييم', icon: ShieldCheck, sellerOnly: true },
          { id: 'system', label: 'سجلات النظام', icon: Terminal, adminOnly: true }
        ].filter(t => (!t.sellerOnly || profile?.isSeller) && (!t.adminOnly || profile?.isAdmin)).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 relative ${
              activeTab === tab.id 
              ? 'bg-white text-blue-600 shadow-sm border border-gray-50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white ring-2 ring-gray-100">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
             <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                   <h2 className="text-xl font-black text-gray-900">سجل الإشعارات</h2>
                   <div className="flex items-center gap-4">
                     {unreadCount > 0 && (
                       <button 
                         onClick={() => markAllNotificationsAsRead(user?.uid || '')}
                         className="text-xs font-black text-blue-600 hover:underline"
                       >
                         تحديد الكل كمقروء
                       </button>
                     )}
                     <div className="flex gap-2 text-[10px] items-center text-gray-400 font-bold uppercase tracking-widest">
                       <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                       <span>{unreadCount} غير مقروء</span>
                     </div>
                   </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => {
                        if (!notif.isRead) markNotificationAsRead(notif.id);
                        if (notif.orderId) navigate(`/order/${notif.orderId}`);
                      }}
                      className={`p-6 hover:bg-gray-50 transition-all cursor-pointer flex items-start gap-4 ${!notif.isRead ? 'bg-blue-50/20' : ''}`}
                    >
                       <div className={`p-3 rounded-2xl shrink-0 ${
                         notif.priority === 'urgent' ? 'bg-red-50 text-red-500' :
                         notif.type === 'payment' ? 'bg-green-50 text-green-500' :
                         notif.type === 'dispute' ? 'bg-red-50 text-red-500' :
                         notif.type === 'message' ? 'bg-blue-50 text-blue-500' :
                         'bg-gray-100 text-gray-400'
                       }`}>
                          {notif.type === 'payment' && <CreditCard className="w-5 h-5" />}
                          {notif.type === 'dispute' && <AlertTriangle className="w-5 h-5" />}
                          {notif.type === 'message' && <MessageSquare className="w-5 h-5" />}
                          {notif.type === 'order_update' && <Clock className="w-5 h-5" />}
                          {(!['payment', 'dispute', 'message', 'order_update'].includes(notif.type)) && <Bell className="w-5 h-5" />}
                       </div>
                       <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                             <h4 className={`font-black tracking-tight ${!notif.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{notif.title}</h4>
                             <span className="text-[10px] text-gray-400 font-bold">
                               {notif.createdAt ? format(notif.createdAt.toDate(), 'HH:mm | d MMM', { locale: ar }) : ''}
                             </span>
                          </div>
                          <p className={`text-sm leading-relaxed mb-3 ${!notif.isRead ? 'text-gray-600' : 'text-gray-400'}`}>{notif.message}</p>
                          {notif.orderId && (
                             <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg group hover:border-blue-200 transition-all">
                               <Shield className="w-3 h-3 text-gray-400" />
                               <span className="text-[10px] font-black text-gray-600">رقم الطلب: #ARB-{notif.orderId.slice(0, 8)}</span>
                               <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-500 transition-all" />
                             </div>
                          )}
                       </div>
                       {!notif.isRead && (
                         <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0"></div>
                       )}
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                       <Bell className="w-12 h-12 text-gray-200 mb-4" />
                       <p className="text-gray-500 font-medium italic">لا توجد إشعارات حالياً.</p>
                    </div>
                  )}
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div 
            key="orders"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 md:space-y-8"
          >
            {/* Mobile Stats Grid - 2x2 system */}
            <div className="grid grid-cols-2 lg:grid-cols-4 md:hidden gap-2 md:gap-3 mb-2">
               <StatCard title="المعاملات" value={activeOrdersCount} icon={Clock} color="blue" />
               <StatCard title="المنجزة" value={completedOrdersCount} icon={CheckCircle2} color="green" />
               <StatCard title="متعثرة" value={failedOrdersCount} icon={AlertCircle} color="red" />
               <StatCard title="مؤشر الثقة" value={`${confidenceScore}%`} icon={ShieldCheck} color="indigo" highlight progress={confidenceScore} />
            </div>

            {!profile?.isVerified && (
              <div className="flex flex-col gap-4 md:gap-8 max-w-2xl">
                <motion.div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl md:rounded-[2.5rem] p-3 md:p-8 text-white relative overflow-hidden shadow-lg shadow-blue-100/20">
                  <div className="relative z-10 flex flex-col md:flex-row items-center md:items-center justify-between gap-3 md:gap-8">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 md:p-3 rounded-lg md:rounded-xl backdrop-blur-md border border-white/10 shrink-0">
                        <ShieldCheck className="w-4 h-4 md:w-6 md:h-6 text-white" />
                      </div>
                      <div className="space-y-0.5 text-right">
                        <h2 className="text-[11px] md:text-xl font-black">وثّق هويتك</h2>
                        <p className="text-blue-100 opacity-90 text-[8px] md:text-xs font-medium leading-relaxed max-w-[150px] md:max-w-xs">
                          التوثيق يمنحك الأولوية ويزيد الثقة.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowIdentityVerify(true)}
                      className="w-full md:w-auto bg-white text-blue-600 px-4 py-1.5 rounded-lg md:rounded-xl font-black text-[9px] md:text-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-xl shrink-0"
                    >
                      بدء التوثيق
                      <ChevronRight className="w-3 h-3 md:w-5 md:h-5" />
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Active Orders */}
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-lg font-bold text-gray-900">طلبات نشطة</h2>
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black">
                    {orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length} طلب
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-3 p-4 md:p-0 md:divide-y md:divide-gray-50 overflow-y-auto max-h-[600px] no-scrollbar">
                  {loading ? (
                    <div className="col-span-2 md:col-span-1 flex items-center justify-center h-64">
                       <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length === 0 ? (
                    <div className="col-span-2 md:col-span-1 p-12 text-center text-gray-400 font-medium">لا توجد طلبات جارية حالياً.</div>
                  ) : (
                    orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').map(order => (
                      <OrderRow key={order.id} order={order} navigate={navigate} />
                    ))
                  )}
                </div>
              </div>

              {/* Archived Orders */}
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-lg font-bold text-gray-900 underline decoration-gray-200 underline-offset-8">الأرشيف</h2>
                  <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-black">
                    {orders.filter(o => o.status === 'completed' || o.status === 'cancelled').length} صفقة
                  </span>
                </div>
                <div className="divide-y divide-gray-50 overflow-y-auto max-h-[600px] no-scrollbar bg-gray-50/10">
                  {orders.filter(o => o.status === 'completed' || o.status === 'cancelled').length === 0 ? (
                    <div className="p-12 text-center text-gray-400 font-medium italic">الأرشيف فارغ.</div>
                  ) : (
                    orders.filter(o => o.status === 'completed' || o.status === 'cancelled').map(order => (
                      <ArchivedOrderRow key={order.id} order={order} navigate={navigate} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'services' && profile?.isSeller && (
          <motion.div 
            key="services"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm overflow-hidden">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                  <div className="flex items-center gap-6">
                    <div className="bg-blue-50 p-5 rounded-[2rem]">
                      <Globe className="w-10 h-10 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900">موقعك الشخصي جاهز!</h3>
                      <p className="text-gray-500">قم بتحديث نبذتك التعريفية وخدماتك لتجذب العملاء.</p>
                    </div>
                  </div>
                  <Link to={`/seller/${user?.uid}`} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center gap-2">
                    معاينة موقعي
                    <ExternalLink className="w-5 h-5" />
                  </Link>
               </div>
               <div className="space-y-4">
                  <label className="text-sm font-black text-gray-800 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    نبذة عنك (تظهر للعملاء)
                  </label>
                  <textarea 
                    value={newBio}
                    onChange={(e) => setNewBio(e.target.value)}
                    rows={3}
                    placeholder="اكتب نبذة عن خبراتك ومهاراتك..."
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-right font-medium"
                  />
                  
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-800 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      رابط موقعك الإلكتروني الشخصي (اختياري)
                    </label>
                    <input 
                      type="text"
                      value={newWebsite}
                      onChange={(e) => setNewWebsite(e.target.value)}
                      placeholder="example.com"
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-right font-medium"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => handleUpdateProfile(profile?.specialties || ['عام'])} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-blue-100">
                      حفظ التغييرات
                    </button>
                  </div>
               </div>
            </div>
            <ServiceGuide />
            <ServiceManager sellerId={user?.uid || ''} />
          </motion.div>
        )}

        {activeTab === 'messages' && (
          <motion.div 
            key="messages"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid lg:grid-cols-3 gap-8 min-h-[600px]"
          >
            {/* Conversations */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-900">محادثاتي</h2>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50 no-scrollbar">
                {activeConversations.length > 0 && (
                  <div className="p-4 bg-gray-50/50">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-2 mb-2">محادثات نشطة</p>
                    <div className="space-y-1">
                      {activeConversations.map(order => (
                        <div 
                          key={order.id}
                          onClick={() => setSelectedOrderId(order.id)}
                          className={`p-4 rounded-2xl cursor-pointer transition-all ${selectedOrderId === order.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border border-gray-100 hover:border-blue-200 shadow-sm'}`}
                        >
                          <h3 className={`font-black text-xs truncate uppercase ${selectedOrderId === order.id ? 'text-white' : 'text-gray-900'}`}>{order.title}</h3>
                          {order.lastMessage && (
                            <p className={`text-[10px] truncate mt-0.5 ${selectedOrderId === order.id ? 'text-blue-100' : 'text-gray-500'}`}>
                              {order.lastMessage}
                            </p>
                          )}
                          <div className="flex justify-between items-center mt-1">
                            <p className={`text-[10px] font-bold ${selectedOrderId === order.id ? 'text-blue-100' : 'text-gray-400'}`}>#ARB-{order.id.slice(0, 4)}</p>
                            {getStatusBadge(order.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {archivedConversations.length > 0 && (
                  <div className="p-4">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-2 mb-2">الأرشيف</p>
                    <div className="space-y-1">
                      {archivedConversations.map(order => (
                        <div 
                          key={order.id}
                          onClick={() => setSelectedOrderId(order.id)}
                          className={`p-4 rounded-2xl cursor-pointer transition-all opacity-60 hover:opacity-100 ${selectedOrderId === order.id ? 'bg-gray-100 border-r-4 border-gray-400' : 'hover:bg-gray-50'}`}
                        >
                          <h3 className="font-bold text-gray-900 text-[11px] truncate uppercase">{order.title}</h3>
                          {order.lastMessage && (
                            <p className="text-[10px] truncate text-gray-400 mt-0.5">
                              {order.lastMessage}
                            </p>
                          )}
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-[10px] text-gray-400 font-medium">#ARB-{order.id.slice(0, 4)}</p>
                            {getStatusBadge(order.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {orders.length === 0 && (
                  <div className="p-12 text-center text-gray-500 font-medium italic">لا توجد محادثات نشطة.</div>
                )}
              </div>
            </div>
            {/* Chat Window */}
            <div className="lg:col-span-2">
              {selectedOrderId ? (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4 px-4">
                    <span className="font-black text-gray-700">محادثة: {orders.find(o => o.id === selectedOrderId)?.title}</span>
                    <Link to={`/order/${selectedOrderId}`} className="text-xs font-bold text-blue-600 hover:underline">عرض الطلب</Link>
                  </div>
                  <ChatRoom orderId={selectedOrderId} />
                </div>
              ) : (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 border-dashed flex flex-col items-center justify-center text-center p-12 h-full">
                  <MessageCircle className="w-16 h-16 text-blue-200 mb-4" />
                  <h2 className="text-xl font-black text-gray-900">اختر محادثة للبدء</h2>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'system' && profile?.isAdmin && (
          <motion.div 
            key="system"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-gray-900 text-white rounded-[2.5rem] p-8 relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                  <Activity className="w-8 h-8 text-blue-400" />
                  مراقب الأداء الفني
                </h2>
                <p className="text-gray-400 max-w-2xl font-medium">
                  هنا يمكنك تتبع جميع الأخطاء التقنية التي واجهها المستخدمون في الوقت الفعلي. يساعدك هذا على فهم المشاكل وتقديم دعم فني دقيق.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-black text-gray-900">سجل الأخطاء والعمليات ({logs.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-widest border-b border-gray-100">
                      <th className="px-8 py-4">الوقت</th>
                      <th className="px-8 py-4">المستخدم</th>
                      <th className="px-8 py-4">العملية</th>
                      <th className="px-8 py-4">المسار</th>
                      <th className="px-8 py-4">الخطأ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-red-50/10 transition-colors">
                        <td className="px-8 py-4 text-xs font-bold text-gray-500">
                          {log.timestamp ? format(log.timestamp.toDate(), 'HH:mm:ss | d MMM', { locale: ar }) : 'الآن'}
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-gray-900">{log.authInfo?.email || 'زائر'}</span>
                              <span className="text-[10px] text-gray-400 font-bold">UID: {log.authInfo?.userId?.slice(0, 8) || 'N/A'}</span>
                            </div>
                            {log.authInfo?.userId && (
                              <Link 
                                to={`/seller/${log.authInfo.userId}`}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                                title="عرض الملف الشخصي"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="px-2 py-1 bg-gray-100 rounded-md text-[10px] font-black text-gray-600 uppercase tracking-tighter">
                            {log.operationType}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-[10px] font-mono text-blue-600 break-all max-w-[150px]">
                          {log.path || 'Global'}
                        </td>
                        <td className="px-8 py-4">
                          <p className="text-xs text-red-600 font-bold leading-relaxed line-clamp-2" title={log.error}>
                            {log.error}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length === 0 && (
                  <div className="p-20 text-center text-gray-400 font-medium italic">السجل نظيف، لا توجد أخطاء حالياً.</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'stats' && profile?.isSeller && (
          <motion.div 
            key="stats"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Elite Status Eligibility Tracker */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-3">
                      <Star className={`w-8 h-8 ${profile?.isEliteSeller ? 'fill-orange-400 text-orange-400' : 'text-gray-200'}`} />
                      استحقاق النجمة الذهبية
                    </h3>
                    <p className="text-gray-500 font-medium italic">المعايير التلقائية للانضمام لقائمة البائعين المتميزين.</p>
                  </div>
                  {profile?.isEliteSeller ? (
                    <div className="bg-orange-50 text-orange-600 px-6 py-3 rounded-2xl font-black flex items-center gap-2 border border-orange-100">
                      <Star className="w-5 h-5 fill-current" />
                      أنت بائع متميز حالياً
                    </div>
                  ) : (
                    <div className="bg-gray-50 text-gray-400 px-6 py-3 rounded-2xl font-black border border-gray-100">
                      لم يستوفِ الشروط بعد
                    </div>
                  )}
               </div>

               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {/* Rating Criteria */}
                  <div className={`p-4 md:p-6 rounded-2xl border transition-all ${profile?.rating >= 4.75 ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                      <Star className={`w-5 h-5 md:w-6 md:h-6 ${profile?.rating >= 4.75 ? 'text-green-600 fill-current' : 'text-gray-300'}`} />
                      <span className={`text-[8px] md:text-xs font-black ${profile?.rating >= 4.75 ? 'text-green-600' : 'text-gray-400'}`}>
                        {profile?.rating >= 4.75 ? 'مكتمل' : 'مطلوب 4.8'}
                      </span>
                    </div>
                    <p className="text-gray-500 text-[10px] md:text-xs font-bold mb-1">التقييم</p>
                    <p className="text-lg md:text-xl font-black text-gray-900">{profile?.rating?.toFixed(1) || '0.0'}</p>
                  </div>

                  {/* Completed Orders Criteria */}
                  <div className={`p-4 md:p-6 rounded-2xl border transition-all ${(profile?.completedOrdersCount || 0) >= 5 ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                      <CheckCircle2 className={`w-5 h-5 md:w-6 md:h-6 ${ (profile?.completedOrdersCount || 0) >= 5 ? 'text-green-600' : 'text-gray-300'}`} />
                      <span className={`text-[8px] md:text-xs font-black ${(profile?.completedOrdersCount || 0) >= 5 ? 'text-green-600' : 'text-gray-400'}`}>
                        {(profile?.completedOrdersCount || 0) >= 5 ? 'مكتمل' : 'مطلوب 5'}
                      </span>
                    </div>
                    <p className="text-gray-500 text-[10px] md:text-xs font-bold mb-1">منجز</p>
                    <p className="text-lg md:text-xl font-black text-gray-900">{profile?.completedOrdersCount || 0}</p>
                  </div>

                  {/* Verification Criteria */}
                  <div className={`p-4 md:p-6 rounded-2xl border transition-all ${profile?.isVerified ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                      <ShieldCheck className={`w-5 h-5 md:w-6 md:h-6 ${profile?.isVerified ? 'text-green-600' : 'text-gray-300'}`} />
                      <span className={`text-[8px] md:text-xs font-black ${profile?.isVerified ? 'text-green-600' : 'text-gray-400'}`}>
                        {profile?.isVerified ? 'موثق' : 'غير موثق'}
                      </span>
                    </div>
                    <p className="text-gray-500 text-[10px] md:text-xs font-bold mb-1">الهوية</p>
                    <p className="text-lg md:text-xl font-black text-gray-900 truncate">{profile?.isVerified ? 'موثق ✅' : 'نقص البيانات'}</p>
                  </div>

                  {/* Response Time Criteria */}
                  <div className={`p-4 md:p-6 rounded-2xl border transition-all ${profile?.avgResponseTime === 'خلال دقائق' ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                      <Clock className={`w-5 h-5 md:w-6 md:h-6 ${profile?.avgResponseTime === 'خلال دقائق' ? 'text-green-600' : 'text-gray-300'}`} />
                      <span className={`text-[8px] md:text-xs font-black ${profile?.avgResponseTime === 'خلال دقائق' ? 'text-green-600' : 'text-gray-400'}`}>
                        {profile?.avgResponseTime === 'خلال دقائق' ? 'مكتمل' : 'مطلوب'}
                      </span>
                    </div>
                    <p className="text-gray-500 text-[10px] md:text-xs font-bold mb-1">الرد</p>
                    <p className="text-lg md:text-xl font-black text-gray-900 truncate">{profile?.avgResponseTime || 'ساعات'}</p>
                  </div>
               </div>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-[2.5rem] p-10 relative overflow-hidden">
               <h3 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-2">
                 <ShieldCheck className="w-8 h-8 text-orange-600" />
                 نظام الرقابة والامتثال
               </h3>
               <div className="grid md:grid-cols-2 gap-8 text-sm text-gray-600 font-medium">
                  <p>• مستوى ثقتك يبدأ بـ 100% وينخفض بناءً على التقييمات والنزاعات.</p>
                  <p>• خصم 15 نقطة عند فتح نزاع مالي بسبب إخلال بالعقد.</p>
                  <p>• خصم 10 نقاط عند استلام تقييم سلبي.</p>
                  <p>• خصم 5 نقاط عند التأخر في الرد أو إلغاء الطلبات.</p>
               </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <StatCard title="المعاملات" value={activeOrdersCount} icon={Clock} color="blue" />
              <StatCard title="المنجزة" value={completedOrdersCount} icon={CheckCircle2} color="green" />
              <StatCard title="متعثرة" value={failedOrdersCount} icon={AlertCircle} color="red" />
              <StatCard title="مؤشر الثقة" value={`${confidenceScore}%`} icon={ShieldCheck} color="indigo" highlight progress={confidenceScore} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showIdentityVerify && (
        <IdentityVerification onClose={() => { setShowIdentityVerify(false); window.location.reload(); }} />
      )}

      {/* Logout */}
      <div className="pt-8 border-t border-gray-100 hidden md:flex justify-end">
        <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 text-red-600 font-bold hover:bg-red-50 px-6 py-3 rounded-xl transition-all">
          <LogOut className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogoutConfirm(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full relative z-10 shadow-2xl text-center">
              <LogOut className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-gray-900 mb-2">تسجيل الخروج</h3>
              <p className="text-gray-500 mb-8">هل أنت متأكد من رغبتك في تسجيل الخروج؟</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowLogoutConfirm(false)} className="py-4 font-bold text-gray-500">تراجع</button>
                <button onClick={() => { logout(); navigate('/'); }} className="bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-100">خروج</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ServiceGuide: React.FC = () => (
  <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
    <div className="relative z-10">
      <h3 className="text-xl font-black mb-2 flex items-center gap-2">كيف تضيف خدماتك؟</h3>
      <p className="text-blue-100 text-sm max-w-xl">استخدم قسم "إدارة خدماتي" لإضافة بطاقات عمل تشمل السعر ووقت التسليم، مما يسهل على العملاء طلب خدماتك مباشرة.</p>
    </div>
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
  </div>
);

const StatCard: React.FC<{ title: string, value: string | number, icon: any, color: string, highlight?: boolean, progress?: number }> = ({ title, value, icon: Icon, color, highlight, progress }) => (
  <div className={`p-2.5 md:p-6 rounded-xl md:rounded-3xl border border-gray-100/50 premium-shadow flex flex-col items-center md:items-start text-center md:text-right gap-1 md:gap-4 transition-all hover:scale-[1.02] ${highlight ? 'bg-gray-950 text-white shadow-blue-900/10' : 'bg-white'}`}>
    <div className={`p-1.5 md:p-3 rounded-lg md:rounded-2xl shrink-0 ${highlight ? 'bg-white/10 text-blue-400' : `bg-${color}-50 text-${color}-500 bg-opacity-70 backdrop-blur-sm`}`}>
      <Icon className="w-3.5 h-3.5 md:w-6 md:h-6" />
    </div>
    <div className="flex-1 w-full">
      <p className={`text-[8px] md:text-xs font-black uppercase tracking-widest leading-none mb-0.5 md:mb-2 ${highlight ? 'text-gray-400' : 'text-gray-400'}`}>{title}</p>
      <div className="flex items-center justify-between gap-1 md:gap-4 mb-2">
         <p className="text-sm md:text-3xl font-black tracking-tight">{value}</p>
         {progress !== undefined && (
           <span className={`text-[7px] md:text-[10px] font-black px-2 py-0.5 rounded-full ${highlight ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>موثوق</span>
         )}
      </div>
      
      {progress !== undefined && (
        <div className="w-full bg-gray-100 h-1 md:h-2 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className={`h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(58,89,152,0.3)]`}
          />
        </div>
      )}
    </div>
  </div>
);
