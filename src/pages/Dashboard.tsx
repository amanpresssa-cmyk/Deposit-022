import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle2, AlertCircle, MessageCircle, ArrowLeft, Plus, ShieldCheck, Wallet, ChevronRight, Briefcase, Globe, ExternalLink, LogOut, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { IdentityVerification } from '../components/IdentityVerification';
import { TrustProgressBar } from '../components/TrustProgressBar';
import { ServiceManager } from '../components/ServiceManager';

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIdentityVerify, setShowIdentityVerify] = useState(false);
  const [isUpdatingSeller, setIsUpdatingSeller] = useState(false);
  const [editSpecialties, setEditSpecialties] = useState(false);
  const [newBio, setNewBio] = useState(profile?.bio || '');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [confidenceScore, setConfidenceScore] = useState(100);
  const [activeTab, setActiveTab] = useState<'orders' | 'services' | 'messages' | 'stats'>('orders');
  const { logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'messages') {
      setActiveTab('messages');
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
  }, [user, orders]);
  const navigate = useNavigate();

  const specialtiesList = ['المرور', 'الجوازات', 'البلدية', 'وزارة العدل', 'مكتب العمل', 'أخرى'];

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
      setEditSpecialties(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingSeller(false);
    }
  };

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
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders (buyer)');
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
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders (seller)');
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
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'orders (sellerEmail)');
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

  const sellerOrders = orders.filter(o => o.sellerId === user?.uid);
  const completedOrders = sellerOrders.filter(o => o.status === 'completed').length;
  const failedOrders = sellerOrders.filter(o => o.status === 'disputed' || o.status === 'cancelled').length;
  const successRate = sellerOrders.length > 0 
    ? Math.round((completedOrders / (completedOrders + failedOrders || 1)) * 100) 
    : 100;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">لوحة التحكم</h1>
          <p className="text-gray-500 mt-1">أهلاً {profile?.displayName}، تتبع أعمالك ومحادثاتك هنا.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('messages')}
            className={`p-3 rounded-xl transition-all relative ${activeTab === 'messages' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}
          >
            <MessageCircle className="w-6 h-6" />
            {activeTab !== 'messages' && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></div>}
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

      {/* Tab Navigation - Mobile Responsive */}
      <div className="flex gap-2 p-1.5 bg-gray-100/50 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: 'orders', label: 'طلباتي', icon: Clock },
          { id: 'services', label: 'خدمات البائع', icon: Briefcase, sellerOnly: true },
          { id: 'messages', label: 'المحادثات', icon: MessageCircle },
          { id: 'stats', label: 'الرقابة والتقييم', icon: ShieldCheck, sellerOnly: true }
        ].filter(t => !t.sellerOnly || profile?.isSeller).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 ${
              activeTab === tab.id 
              ? 'bg-white text-blue-600 shadow-sm' 
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
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl md:rounded-[2.5rem] p-5 md:p-10 text-white relative overflow-hidden shadow-xl shadow-blue-100"
                  >
                    <div className="relative z-10">
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-3 md:gap-6 mb-5 md:mb-8 text-center md:text-right">
                        <div className="bg-white/20 p-3 md:p-5 rounded-xl md:rounded-[2rem] backdrop-blur-md border border-white/10 shrink-0">
                          <ShieldCheck className="w-6 h-6 md:w-10 md:h-10 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg md:text-3xl font-black mb-1 md:mb-2">وثّق هويتك لزيادة أمانك</h2>
                          <p className="text-blue-100 text-[11px] md:text-base opacity-90 max-w-md font-medium leading-relaxed">
                            التوثيق بالهوية الوطنية يمنحك الأولوية في معالجة الطلبات ويزيد من مستوى الثقة في حسابك.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowIdentityVerify(true)}
                        className="w-full md:w-auto bg-white text-blue-600 px-6 py-3.5 md:px-10 md:py-5 rounded-xl md:rounded-2xl font-bold text-sm md:text-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-xl"
                      >
                        بدء عملية التوثيق الشامل
                        <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
                      </button>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                  </motion.div>
                </div>
                <div>
                  <TrustProgressBar level={profile?.trustLevel || 0} />
                </div>
              </div>
            )}

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
                <Link 
                  to={`/seller/${user?.uid}`}
                  className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg"
                >
                  معاينة موقعي
                  <ExternalLink className="w-5 h-5" />
                </Link>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-700 mr-2">نبذة عنك (تظهر في الملف الشخصي)</label>
                <textarea 
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  placeholder="اكتب نبذة عن خبراتك وخدماتك..."
                  rows={3}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-right"
                />
                <div className="flex justify-end">
                  <button 
                    onClick={() => handleUpdateProfile(profile?.specialties || ['عام'])}
                    disabled={isUpdatingSeller || newBio === profile?.bio}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {isUpdatingSeller ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                </div>
              </div>
            </div>

            <ServiceGuide />

            <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm overflow-hidden min-h-[200px]">
              <ServiceManager sellerId={user?.uid || ''} />
            </div>
          </motion.div>
        )}

        {activeTab === 'messages' && (
          <motion.div 
            key="messages"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col items-center justify-center text-center p-12"
          >
            <div className="bg-blue-50 p-8 rounded-full mb-6">
              <MessageCircle className="w-16 h-16 text-blue-600 animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">مركز المحادثات الذكي</h2>
            <p className="text-gray-500 max-w-sm mb-8">
              هنا يمكنك التواصل مباشرة مع عملائك وبائعي الخدمات. يتم تشفير كافة المحادثات لضمان خصوصيتك.
            </p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <div className="p-6 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <p className="text-xs font-bold text-gray-400 mb-1 italic">قريباً</p>
                <p className="font-bold text-gray-700">مكالمات صوتية</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <p className="text-xs font-bold text-gray-400 mb-1 italic">قريباً</p>
                <p className="font-bold text-gray-700">إرسال ملفات</p>
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
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-200"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-orange-100 p-3 rounded-2xl text-orange-600">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">نظام الرقابة والامتثال</h3>
                    <p className="text-orange-700 text-sm font-bold">محرك الثقة الذكي نشط (Monitoring Engine Active)</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-8 text-sm leading-relaxed text-gray-600">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
                      <p>مستوى ثقتك يبدأ بـ <span className="font-black text-gray-900">100%</span> وينخفض بناءً على تقارير الرقابة الآلية.</p>
                    </div>
                    <div className="flex items-start gap-3 border-r-2 border-red-200 pr-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                      <p><span className="text-red-600 font-black">خصم 15 نقطة:</span> عند فتح نزاع مالي (Dispute) بسبب إخلال بالعقد.</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 border-r-2 border-red-200 pr-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                      <p><span className="text-red-600 font-black">خصم 10 نقاط:</span> عند استلام تقييم سلبي من العميل.</p>
                    </div>
                    <div className="flex items-start gap-3 border-r-2 border-orange-200 pr-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
                      <p><span className="text-orange-600 font-black">خصم 5 نقاط:</span> عند التأخر في الرد على الرسائل أو إلغاء الطلبات.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-orange-100 flex items-center justify-end">
                  <span className="text-[10px] text-gray-400 font-medium">نظام "وساطة" للرقابة الذكية © 2026</span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
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
                  <p className="text-sm font-medium text-gray-500">إنجازات ناجحة</p>
                  <p className="text-2xl font-bold text-gray-900">{completedOrders}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="bg-red-50 p-3 rounded-xl text-red-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">عمليات متعثرة</p>
                  <p className="text-2xl font-bold text-gray-900">{failedOrders}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl shadow-xl flex items-center gap-4 text-white">
                <div className="bg-white/10 p-3 rounded-xl text-blue-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">ثقة الرقابة</p>
                  <p className="text-2xl font-black text-blue-400">{confidenceScore}%</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showIdentityVerify && (
        <IdentityVerification 
          onClose={() => {
            setShowIdentityVerify(false);
            window.location.reload();
          }} 
        />
      )}

      {/* Account Management */}
      <div className="pt-8 border-t border-gray-100">
        <div className="flex justify-between items-center bg-red-50/30 p-6 rounded-[2rem] border border-red-50">
          <div>
            <h3 className="text-lg font-black text-gray-900">إدارة الحساب</h3>
            <p className="text-sm text-gray-500">يمكنك تسجيل الخروج من جلسة العمل الحالية.</p>
          </div>
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2 bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full relative z-10 shadow-2xl text-center"
            >
              <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <LogOut className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">هل أنت متأكد؟</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                هل ترغب حقاً في تسجيل الخروج من حسابك؟ ستحتاج لتسجيل الدخول مرة أخرى للوصول لطلباتك.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  تراجع
                </button>
                <button 
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 shadow-xl shadow-red-100 transition-all"
                >
                  نعم، خروج
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ServiceGuide: React.FC = () => {
  return (
    <div className="bg-blue-600 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl shadow-blue-100">
      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 text-right">
          <h3 className="text-xl font-black mb-2 flex items-center gap-2">
            <Briefcase className="w-6 h-6" />
            كيف تضيف خدماتك وبطاقات عملك؟
          </h3>
          <p className="text-blue-100 text-sm leading-relaxed">
            لإضافة "بطاقات" خدمات تظهر في ملفك الشخصي للعملاء، استخدم قسم "إدارة خدماتي" أدناه. 
            كل بطاقة تضيفها تشمل السعر، الوصف، ووقت التسليم، مما يسهل على العملاء اختيار التعامل معك مباشرة.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 text-center w-24">
            <Plus className="w-8 h-8 mx-auto mb-1" />
            <p className="text-[10px] font-bold">أضف خدمة</p>
          </div>
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 text-center w-24">
            <Globe className="w-8 h-8 mx-auto mb-1" />
            <p className="text-[10px] font-bold">تظهر للجميع</p>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
    </div>
  );
};
