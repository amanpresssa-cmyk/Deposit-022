import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle2, AlertCircle, MessageCircle, ArrowLeft, Plus, ShieldCheck, ChevronRight, Briefcase, Globe, ExternalLink, LogOut, Star, Shield, Terminal, Activity, Trash2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { IdentityVerification } from '../components/IdentityVerification';
import { TrustProgressBar } from '../components/TrustProgressBar';
import { ServiceManager } from '../components/ServiceManager';
import { ChatRoom } from '../components/chat/ChatRoom';

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
      whileHover={{ backgroundColor: '#fcfdff' }}
      className="p-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors cursor-pointer border-b border-gray-50 group"
      onClick={() => navigate(`/order/${order.id}`)}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h3 className="font-black text-lg text-gray-900 group-hover:text-blue-600 transition-colors uppercase">{order.title}</h3>
          {getStatusBadge(order.status)}
        </div>
        <p className="text-sm text-gray-500 line-clamp-1 italic">{order.description}</p>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-10">
        <div className="text-right">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">القيمة</p>
          <p className="text-xl font-black text-gray-900">{order.amount} ر.س</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">التاريخ</p>
          <p className="text-sm font-black text-gray-700">
            {order.createdAt ? format(order.createdAt.toDate(), 'd MMM', { locale: ar }) : ''}
          </p>
        </div>
        <div className="flex items-center justify-center w-10 h-10 bg-gray-50 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
          <ChevronRight className="w-5 h-5 rtl:rotate-180" />
        </div>
      </div>
    </motion.div>
  );
};

const ArchivedOrderRow: React.FC<OrderRowProps> = ({ order, navigate }) => {
  return (
    <motion.div
      whileHover={{ backgroundColor: '#fcfdff' }}
      className="p-6 md:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors cursor-pointer border-b border-gray-50 opacity-80 hover:opacity-100"
      onClick={() => navigate(`/order/${order.id}`)}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-gray-900">{order.title}</h3>
          {getStatusBadge(order.status)}
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
           <span className="text-gray-400">#ARB-{order.id.slice(0, 8).toUpperCase()}</span>
           <span className="text-gray-400 border-r-2 border-gray-100 pr-2">
             {order.createdAt ? format(order.createdAt.toDate(), 'd MMMM yyyy', { locale: ar }) : ''}
           </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Rating Logic */}
        {order.status === 'completed' && (
          <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-full border border-orange-100">
                <Star className={`w-3.5 h-3.5 ${order.buyerRatingCompleted || order.sellerRatingCompleted ? 'fill-orange-400 text-orange-400' : 'text-gray-300'}`} />
                <span className="text-xs font-black text-orange-700">
                   {order.buyerRatingCompleted ? `${order.sellerRating! * 20}%` : order.sellerRatingCompleted ? `${order.buyerRating! * 20}%` : 'بانتظار التقييم'}
                </span>
             </div>
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
               {order.buyerRatingCompleted || order.sellerRatingCompleted ? 'تقييم المعاملة' : 'لم يتم التقييم بعد'}
             </p>
          </div>
        )}
        <div className="text-right">
          <p className="text-lg font-black text-gray-400">{order.amount} ر.س</p>
        </div>
        <div className="text-blue-400/50">
          <Clock className="w-5 h-5" />
        </div>
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [confidenceScore, setConfidenceScore] = useState(100);
  const [activeTab, setActiveTab] = useState<'orders' | 'services' | 'messages' | 'stats' | 'system'>('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const orderId = params.get('orderId');
    if (tab === 'messages') {
      setActiveTab('messages');
      if (orderId) setSelectedOrderId(orderId);
    } else if (tab === 'services') {
      setActiveTab('services');
    }
  }, [location.search]);

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
    });

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
      });

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
      });

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
        });
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
    });

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

  const activeConversations = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const archivedConversations = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">لوحة التحكم</h1>
          <p className="text-gray-500 mt-1 font-medium italic">أهلاً {profile?.displayName}، تتبع أعمالك ومحادثاتك هنا.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('messages')}
            className={`p-3 rounded-xl transition-all relative ${activeTab === 'messages' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 shadow-sm'}`}
          >
            <MessageCircle className="w-6 h-6" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></div>
          </button>
          <button
            onClick={() => navigate('/create-order')}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>طلب جديد</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1.5 bg-gray-100/50 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar border border-gray-100">
        {[
          { id: 'orders', label: 'طلباتي', icon: Clock },
          { id: 'services', label: 'خدمات البائع', icon: Briefcase, sellerOnly: true },
          { id: 'messages', label: 'المحادثات', icon: MessageCircle },
          { id: 'stats', label: 'الرقابة والتقييم', icon: ShieldCheck, sellerOnly: true },
          { id: 'system', label: 'سجلات النظام', icon: Terminal, adminOnly: true }
        ].filter(t => (!t.sellerOnly || profile?.isSeller) && (!t.adminOnly || profile?.isAdmin)).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 ${
              activeTab === tab.id 
              ? 'bg-white text-blue-600 shadow-sm border border-gray-50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'orders' && (
          <motion.div 
            key="orders"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {!profile?.isVerified && (
              <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                  <motion.div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-xl shadow-blue-100">
                    <div className="relative z-10">
                      <div className="flex items-center gap-6 mb-8">
                        <div className="bg-white/20 p-5 rounded-[2rem] backdrop-blur-md border border-white/10 shrink-0">
                          <ShieldCheck className="w-10 h-10 text-white" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-black mb-2">وثّق هويتك لزيادة أمانك</h2>
                          <p className="text-blue-100 opacity-90 max-w-md font-medium leading-relaxed">
                            التوثيق بالهوية الوطنية يمنحك الأولوية في معالجة الطلبات ويزيد من مستوى الثقة في حسابك.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowIdentityVerify(true)}
                        className="bg-white text-blue-600 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all flex items-center gap-2 shadow-xl"
                      >
                        بدء عملية التوثيق الشامل
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  </motion.div>
                </div>
                <div>
                  <TrustProgressBar level={profile?.trustLevel || 0} />
                </div>
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
                <div className="divide-y divide-gray-50 overflow-y-auto max-h-[600px] no-scrollbar">
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                       <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length === 0 ? (
                    <div className="p-12 text-center text-gray-400 font-medium">لا توجد طلبات جارية حالياً.</div>
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
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-right font-medium"
                  />
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
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-gray-900">{log.authInfo?.email || 'زائر'}</span>
                            <span className="text-[10px] text-gray-400 font-bold">UID: {log.authInfo?.userId?.slice(0, 8) || 'N/A'}</span>
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
            <div className="grid md:grid-cols-4 gap-6">
              <StatCard title="طلبات جارية" value={orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length} icon={Clock} color="blue" />
              <StatCard title="إنجازات ناجحة" value={completedOrdersCount} icon={CheckCircle2} color="green" />
              <StatCard title="عمليات متعثرة" value={failedOrdersCount} icon={AlertCircle} color="red" />
              <StatCard title="ثقة الرقابة" value={`${confidenceScore}%`} icon={ShieldCheck} color="indigo" highlight />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showIdentityVerify && (
        <IdentityVerification onClose={() => { setShowIdentityVerify(false); window.location.reload(); }} />
      )}

      {/* Logout */}
      <div className="pt-8 border-t border-gray-100 flex justify-end">
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

const StatCard: React.FC<{ title: string, value: string | number, icon: any, color: string, highlight?: boolean }> = ({ title, value, icon: Icon, color, highlight }) => (
  <div className={`p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 ${highlight ? 'bg-gray-900 text-white' : 'bg-white'}`}>
    <div className={`p-3 rounded-xl ${highlight ? 'bg-white/10 text-blue-400' : `bg-${color}-50 text-${color}-500`}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className={`text-sm font-medium ${highlight ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  </div>
);
