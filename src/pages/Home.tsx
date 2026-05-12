import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ArrowLeftRight, CheckCircle, Search, Clock, MessageSquare, Star, LayoutGrid, Users, Briefcase, Lock, Zap, ArrowLeft, TrendingUp, Sparkles, Plus, Wallet, Bell, Activity, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, limit, getDocs, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile, Service, Order } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { PaymentIcon } from '../components/ui/PaymentIcon';
import { SellerCard } from '../components/SellerCard';
import { TestimonialSlider } from '../components/TestimonialSlider';
import { GeneralFeedbackForm } from '../components/GeneralFeedbackForm';
import { LoginModal } from '../components/auth/LoginModal';

export const Home: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const isViewingAsUser = searchParams.get('view') === 'site';
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;
  const showAdminUI = isAdmin && !isViewingAsUser;

  const [featuredSellers, setFeaturedSellers] = useState<UserProfile[]>([]);
  const [liveOffers, setLiveOffers] = useState<Service[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [totalGuarantees, setTotalGuarantees] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [completedOrdersCount, setCompletedOrdersCount] = useState<number>(0);
  const [homeCard, setHomeCard] = useState<any>(null);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [trustIndex, setTrustIndex] = useState(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const trustMessages = [
    { text: "الخيار الأول للتعاملات الآمنة", icon: <ShieldCheck className="w-4 h-4" /> },
    { text: "وساطة مالية ذكية وموثوقة", icon: <Lock className="w-4 h-4" /> },
    { text: "حقك محفوظ بأمان تام", icon: <CheckCircle className="w-4 h-4" /> },
    { text: "دفع إلكتروني معتمد 100%", icon: <Zap className="w-4 h-4" /> },
    { text: "خدمة تقسيط المدفوعات متوفرة الآن", icon: <CreditCard className="w-4 h-4" /> }
  ];

  useEffect(() => {
    if (isAdmin && !isViewingAsUser) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, isViewingAsUser, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTrustIndex((prev) => (prev + 1) % trustMessages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Fetch active orders for logged in user
    const ordersQ = query(
      collection(db, 'orders'),
      where('buyerId', '==', user.uid),
      where('status', 'in', ['pending', 'escrowed', 'in_progress']),
      limit(3)
    );

    const unsubOrders = onSnapshot(ordersQ, (snap) => {
      const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setActiveOrders(orders);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubOrders();
  }, [user]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'home_card'), (doc) => {
      if (doc.exists()) {
        setHomeCard(doc.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'app_settings/home_card');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Live Users/Sellers
    const sellersQ = query(
      collection(db, 'users'), 
      where('isSeller', '==', true),
      limit(8)
    );
    
    const unsubSellers = onSnapshot(sellersQ, (snap) => {
      let sellers = snap.docs
        .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
        .filter(u => u.isBlocked !== true && u.displayName);
      
      sellers.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
        return (b.rating || 0) - (a.rating || 0);
      });

      setFeaturedSellers(sellers);
      setLoadingSellers(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Live Offers
    const offersQ = query(
      collection(db, 'orders'), 
      where('visibility', '==', 'public'),
      where('status', '==', 'pending'),
      limit(6)
    );
    
    const unsubOffers = onSnapshot(offersQ, (snap) => {
      const offers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setLiveOffers(offers);
      setLoadingOffers(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => {
      unsubSellers();
      unsubOffers();
    };
  }, []);

  useEffect(() => {
    // Calculate real total guarantees volume
    // Restricted to admin or specific users to prevent permission-denied errors on broad collection listener
    if (!user || (!isAdmin && !profile?.isSeller)) return;

    const unsubGuarantees = onSnapshot(collection(db, 'orders'), (snap) => {
      const total = snap.docs.reduce((acc, doc) => {
        const data = doc.data();
        if (['escrowed', 'completed', 'in_progress'].includes(data.status)) {
          return acc + (data.amount || 0);
        }
        return acc;
      }, 0);
      setTotalGuarantees(total);
    }, (error) => {
      // Gracefully handle if non-admin can't read all orders
      console.warn('Total guarantees sync skipped due to permissions');
      setTotalGuarantees(50000000); // Fallback to placeholder if denied
    });
    return () => unsubGuarantees();
  }, [user]);

  useEffect(() => {
    // Fetch real total users from 'users' collection
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setTotalUsers(snapshot.size);
    }, (error) => {
      // Gracefully handle if non-admin can't read all users
      console.warn('Total users sync skipped due to permissions');
      setTotalUsers(12000); // Fallback to placeholder if denied
    });

    // Fetch completed orders count for the current user to control feedback form
    let unsubOrders = () => {};
    if (user) {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('status', '==', 'completed'),
        where('buyerId', '==', user.uid)
      );
      unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
        setCompletedOrdersCount(snapshot.size);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });
    }

    return () => {
      unsubUsers();
      unsubOrders();
    };
  }, [user]);

  const steps = [
    {
      title: 'اتفاق الطرفين',
      desc: 'وضوح تام في شروط الخدمة والسعر قبل البدء.',
      icon: <MessageSquare className="w-6 h-6 text-blue-600" />
    },
    {
      title: 'حجز العربون',
      desc: 'حماية مالية كاملة في خزينة المنصة الآمنة.',
      icon: <Lock className="w-6 h-6 text-blue-600" />
    },
    {
      title: 'التنفيذ والمتابعة',
      desc: 'بدء العمل مع ضمان الوصول للجودة المطلوبة.',
      icon: <Zap className="w-6 h-6 text-blue-600" />
    },
    {
      title: 'استلام وتحرير',
      desc: 'تحرير المبلغ للبائع فور رضاك عن الخدمة.',
      icon: <CheckCircle className="w-6 h-6 text-blue-600" />
    }
  ];

  return (
    <div className="space-y-24 pb-32 overflow-x-hidden font-sans">
      {/* Dynamic Hero Section */}
      {!user ? (
        <section className="relative pt-12 md:pt-20 pb-24 overflow-hidden px-4">
          <div className="absolute inset-0 -z-20">
             <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] animate-pulse" />
             <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-6xl mx-auto"
          >
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="text-right space-y-10 order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 px-10 py-5 bg-blue-50/50 backdrop-blur-md border border-blue-100/50 text-blue-700 rounded-3xl text-sm md:text-lg font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/10 h-16 md:h-20 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={trustIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-4"
                    >
                      {React.cloneElement(trustMessages[trustIndex].icon as React.ReactElement, { className: "w-6 h-6" })}
                      <span>{trustMessages[trustIndex].text}</span>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="space-y-6">
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-black text-emerald-950 tracking-tighter leading-[1.6]">
                    ضمانك الموثوق <br/> 
                    <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-600 to-blue-500 italic-none not-italic">
                      في كل عملية
                    </span>
                  </h1>
                  <p className="text-lg md:text-xl text-gray-400 max-w-xl font-medium leading-relaxed opacity-80">
                    عربون هو وسيطك الذكي لضمان فحص وسلامة التعاملات المالية والخدمية في المملكة العربية السعودية.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="w-full sm:w-auto bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-xl hover:bg-blue-700 shadow-2xl shadow-blue-100 transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-4 group"
                  >
                    ابدأ الآن
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </button>
                  <button
                    onClick={() => navigate('/how-it-works')}
                    className="w-full sm:w-auto bg-white text-gray-950 border border-gray-100 px-10 py-5 rounded-[2rem] font-black text-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-blue-500/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-blue-500" />
                    </div>
                    كيف يعمل عربون؟
                  </button>
                </div>
              </div>

              <div className="order-1 lg:order-2 relative group">
                <div className="absolute inset-0 bg-blue-500/20 blur-[100px] scale-90 group-hover:scale-110 transition-transform duration-1000" />
                <motion.div 
                  className="relative bg-white p-6 rounded-[4rem] border border-gray-100 shadow-2xl rotate-2 group-hover:rotate-0 transition-transform duration-700 overflow-hidden"
                  whileHover={{ y: -10 }}
                >
                   <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-600" />
                   <img 
                    src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=600" 
                    className="w-full aspect-square object-cover rounded-[3rem] grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" 
                    alt="Safe Transactions"
                   />
                   <div className="mt-8 flex justify-between items-center px-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">إجمالي الضمانات</p>
                        <p className="text-3xl font-display font-black text-emerald-900">{(totalGuarantees / 1000000).toFixed(1)}M+ SAR</p>
                      </div>
                      <div className="flex -space-x-3 rtl:space-x-reverse">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-blue-100" />
                        ))}
                      </div>
                   </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>
      ) : (
        /* Logged In Personalized Hero */
        <section className="pt-12 px-4 max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-10 px-10 bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-blue-500/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
             
             <div className="relative z-10 space-y-4 text-right">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <Sparkles className="w-6 h-6" />
                   </div>
                   <h1 className="text-3xl md:text-5xl font-display font-black text-gray-950">
                     أهلاً، {profile?.displayName?.split(' ')[0] || 'مصفي'}
                   </h1>
                </div>
                <p className="text-gray-400 font-bold text-lg max-w-md">
                  لديك {activeOrders.length} عمليات نشطة بانتظار الإجراء. رحلة وساطة آمنة اليوم؟
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                   <button 
                    onClick={() => navigate('/orders/create')}
                    className="px-8 py-4 bg-gray-950 text-white rounded-2xl font-black text-sm flex items-center gap-3 hover:bg-blue-600 transition-all shadow-xl shadow-gray-200"
                   >
                     <Plus className="w-5 h-5" />
                     إنشاء تعميد جديد
                   </button>
                   <button 
                    onClick={() => navigate('/dashboard')}
                    className="px-8 py-4 bg-gray-50 text-gray-900 border border-gray-100 rounded-2xl font-black text-sm flex items-center gap-3 hover:bg-gray-100 transition-all"
                   >
                     <Activity className="w-5 h-5 opacity-40" />
                     الملخص المالي
                   </button>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4 w-full md:w-80">
                <div className="bg-blue-600 p-6 rounded-[2rem] text-white space-y-1 shadow-2xl shadow-blue-200">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">الرصيد المتاح</p>
                    <p className="text-2xl font-display font-black">{(profile?.balance || 0).toLocaleString()} <span className="text-[10px]">ر.س</span></p>
                </div>
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">تحت الفحص</p>
                    <p className="text-2xl font-display font-black text-gray-950">{(profile?.pendingBalance || 0).toLocaleString()} <span className="text-[10px] text-gray-400">ر.س</span></p>
                </div>
             </div>
          </div>

          {activeOrders.length > 0 && (
            <div className="space-y-6">
               <div className="flex items-center justify-between px-2">
                  <h2 className="text-xl font-display font-black flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    عمليات تتطلب انتباهك
                  </h2>
                  <Link to="/dashboard" className="text-xs font-black text-blue-600 hover:underline">مشاهدة الكل</Link>
               </div>
               <div className="grid md:grid-cols-3 gap-6">
                  {activeOrders.map(order => (
                    <motion.div 
                      key={order.id}
                      onClick={() => navigate(`/order/${order.id}`)}
                      className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    >
                       <div className="flex justify-between mb-4">
                          <div className="bg-blue-50 px-3 py-1 rounded-lg text-[10px] font-black text-blue-600 uppercase">
                            {order.status === 'pending' ? 'انتظار' : 'في الضمان'}
                          </div>
                          <span className="text-lg font-display font-black">{order.amount.toLocaleString()} <span className="text-[10px] opacity-40">ر.س</span></span>
                       </div>
                       <h4 className="font-black text-gray-900 line-clamp-1 mb-2 group-hover:text-blue-600 transition-colors">{order.title}</h4>
                       <p className="text-xs text-gray-400 font-medium mb-4 line-clamp-1">تاريخ العملية: {order.createdAt?.toDate().toLocaleDateString('ar-SA')}</p>
                       <div className="flex items-center gap-2 text-blue-600 font-black text-xs">
                          <span>فتح العملية</span>
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                       </div>
                    </motion.div>
                  ))}
               </div>
            </div>
          )}
        </section>
      )}

      {/* Services Bento Grid */}
      {!showAdminUI && (
        <section className="px-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10 px-2">
             <div className="space-y-1">
                <h2 className="text-xl md:text-3xl font-display font-black text-emerald-900 tracking-tight">استكشف <span className="text-blue-600">الأقسام</span></h2>
                <div className="h-1.5 w-16 bg-blue-500 rounded-full" />
             </div>
             <Link to="/search" className="text-sm font-black text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-2">
                مشاهدة الكل <ArrowLeft className="w-4 h-4" />
             </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div 
               whileHover={{ y: -10 }}
               onClick={() => navigate('/search?category=تعقيب')}
               className="md:col-span-2 bg-blue-600 p-10 rounded-[3rem] text-white overflow-hidden relative group cursor-pointer shadow-xl shadow-blue-500/10"
            >
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
               <div className="relative z-10 space-y-8">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl font-display font-black leading-tight">تعقيب وإنجاز <br/> معاملات</h3>
                    <p className="text-blue-100 font-medium opacity-80 max-w-xs leading-relaxed">أفضل المعقبين في المملكة لخدمتك في الجوازات، المرور، والبلديات.</p>
                  </div>
                  <div className="inline-flex items-center gap-3 font-black text-sm uppercase tracking-[0.2em]">
                    ابدأ الطلب <ArrowLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                  </div>
               </div>
               <div className="absolute bottom-[-10%] left-[-5%] w-72 h-72 bg-gradient-to-tr from-blue-400 to-transparent opacity-20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000" />
            </motion.div>

            <motion.div 
               whileHover={{ y: -10 }}
               onClick={() => navigate('/orders/create?type=escrow')}
               className="bg-gray-900 p-10 rounded-[3rem] text-white flex flex-col justify-between group cursor-pointer relative overflow-hidden shadow-xl"
            >
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-500/5 to-transparent" />
               <div className="space-y-6 relative z-10">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <ShieldCheck className="w-7 h-7 text-blue-400 group-hover:text-white" />
                  </div>
                  <h3 className="text-2xl font-display font-black">وساطة <br/> مالية آمنة</h3>
                  <p className="text-gray-500 text-xs font-bold leading-relaxed">حفظ الأموال حتى التأكد من استلام الخدمة، دون قلق.</p>
               </div>
               <div className="relative z-10 pt-6">
                  <div className="h-px w-full bg-white/10 mb-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">تعميد سريع <ArrowLeft className="w-3 h-3" /></span>
               </div>
            </motion.div>

            <motion.div 
               whileHover={{ y: -10 }}
               onClick={() => navigate('/search?category=تصميم')}
               className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col justify-between group cursor-pointer relative overflow-hidden"
            >
               <div className="space-y-6 relative z-10">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-display font-black text-gray-950">نمو <br/> وأعمال</h3>
                  <p className="text-gray-400 text-xs font-bold leading-relaxed">خدمات تسويقية وتصميمية لنقل أعمالك لمستوى احترافي.</p>
               </div>
               <div className="relative z-10 pt-6">
                  <div className="h-px w-full bg-gray-50 mb-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-600 transition-colors">استكشاف المزيد</span>
               </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Modern Live Marketplace Section */}
      {!showAdminUI && (
        <section className="py-24 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16 px-2">
                <div className="text-right space-y-4">
                   <div className="flex items-center gap-3 justify-end">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">سوق الطلبات المباشرة</span>
                   </div>
                   <h2 className="text-2xl md:text-4xl font-display font-black text-emerald-900 tracking-tighter">طلبات <span className="text-blue-600">عاجلة</span></h2>
                   <p className="text-gray-500 font-bold max-w-xl text-lg leading-snug">كن أول من يقدم عرضه على هذه المهام المتاحة الآن للبدء الفوري.</p>
                </div>
                <Link to="/search" className="bg-gray-100 text-gray-950 hover:bg-gray-200 px-8 py-4 rounded-2xl font-black text-sm transition-all shrink-0">عرض كافة الطلبات</Link>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
               {loadingOffers ? (
                 [1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-48 bg-gray-50 rounded-2xl animate-pulse border border-gray-100" />
                 ))
               ) : liveOffers.length > 0 ? (
                 liveOffers.map((offer) => (
                    <motion.div
                       key={offer.id}
                       whileHover={{ y: -4, scale: 1.01 }}
                       onClick={() => navigate(`/service/${offer.id}`)}
                       className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 hover:bg-white hover:shadow-lg transition-all duration-700 cursor-pointer group flex flex-col h-full relative overflow-hidden"
                    >
                       <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 -mr-6 -mt-6 rounded-full blur-lg group-hover:bg-blue-500/10 transition-colors" />
                       
                       <div className="flex justify-between items-start mb-3 relative z-10">
                          <span className="px-2 py-1 bg-white text-blue-600 rounded-md text-[7px] font-black uppercase tracking-widest border border-blue-50 shadow-sm">
                            {offer.category}
                          </span>
                          <div className="text-sm md:text-base font-display font-black text-gray-900">
                             {offer.amount.toLocaleString()} <span className="text-[8px] text-gray-400">SAR</span>
                          </div>
                       </div>
                       
                       <h3 className="text-xs font-display font-black text-gray-950 group-hover:text-blue-600 transition-colors leading-tight mb-2 line-clamp-2 relative z-10">
                         {offer.title}
                       </h3>
                       <p className="text-gray-500 font-bold text-[10px] leading-relaxed mb-4 line-clamp-2 relative z-10">
                         {offer.description}
                       </p>
                       
                       <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100 transition-colors group-hover:border-blue-50 relative z-10">
                          <div className="flex items-center gap-1.5">
                             <div className="w-6 h-6 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-600 border border-blue-100">
                                <Users className="w-3 h-3" />
                             </div>
                             <div>
                               <p className="text-[7px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">الحالة</p>
                               <p className="text-[9px] font-black text-gray-900 leading-none">مفتوح</p>
                             </div>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-gray-950 text-white flex items-center justify-center group-hover:bg-blue-600 transition-all shadow-sm group-hover:translate-x-[-1px]">
                            <ArrowLeft className="w-2.5 h-2.5" />
                          </div>
                       </div>
                    </motion.div>
                 ))
               ) : (
                <div className="col-span-full py-24 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                    <Search className="w-8 h-8" />
                  </div>
                  <p className="text-gray-400 font-black text-lg">لا توجد طلبات عامة عاجلة حالياً</p>
                  <p className="text-gray-300 text-sm font-medium mt-2">كن أول من ينشئ طلباً عاماً ليصل لأفضل البائعين</p>
                </div>
               )}
             </div>
          </div>
        </section>
      )}

      {/* Featured Sellers - High Impact Grid */}
      {!showAdminUI && (
        <section className="py-24 bg-gray-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -mr-64 -mt-64" />
          
          <div className="max-w-7xl mx-auto px-4 relative z-10">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-20 px-2">
                <div className="text-right space-y-4">
                   <div className="flex items-center gap-3 justify-end mb-2">
                      <div className="h-0.5 w-10 bg-blue-500/30" />
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] shadow-sm bg-white px-4 py-1.5 rounded-full">نخبة الضمان</span>
                   </div>
                   <h2 className="text-2xl md:text-4xl font-display font-black text-emerald-900 tracking-tighter leading-none whitespace-pre-line">خبراء بانتظار <br/><span className="text-blue-600">خدمتك</span></h2>
                   <p className="text-gray-600 font-bold text-lg max-w-xl">مقدمو خدمات موثوقون، تحققنا من كفاءتهم التقنية والأخلاقية للعمل تحت مظلة عربون.</p>
                </div>
                <button onClick={() => navigate('/search')} className="group px-8 py-5 bg-gray-950 text-white rounded-2xl font-black text-sm flex items-center gap-4 hover:bg-blue-600 transition-all shadow-2xl shadow-gray-200">
                   تصفح كافة البائعين
                   <ArrowLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                </button>
             </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {loadingSellers ? (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className="h-[430px] bg-white rounded-[3.5rem] animate-pulse shadow-sm border border-gray-100" />
                ))
              ) : featuredSellers.map(seller => (
                <motion.div 
                  key={seller.uid} 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -12 }}
                >
                  <SellerCard seller={seller} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sophisticated How it Works Section */}
      {!showAdminUI && (
        <section className="py-32 px-4 bg-white relative overflow-hidden">
          <div className="absolute top-1/2 left-0 w-full h-px bg-gray-50 -translate-y-1/2" />
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center space-y-4 mb-24">
              <div className="inline-flex items-center gap-3 px-5 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100/50">
                <ArrowLeftRight className="w-4 h-4" />
                بروتوكول الضمان الذكي
              </div>
              <h2 className="text-2xl md:text-4xl font-display font-black text-emerald-900 tracking-tighter">كيف نضمن <span className="text-blue-600 underline decoration-blue-100 underline-offset-8">حقك</span>؟</h2>
              <p className="text-gray-500 font-bold max-w-xl mx-auto text-lg md:text-xl leading-relaxed">خطوات مدروسة تقنياً لضمان سلامة كل ريال من طرفي الصفقة.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
              {steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative group bg-white shadow-sm hover:shadow-xl transition-all duration-700 rounded-[2.5rem] p-8 border border-transparent hover:border-blue-50/50"
                >
                  <div className="absolute -top-4 left-8 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-display font-black text-lg border-4 border-white shadow-lg shadow-blue-200">
                    {idx + 1}
                  </div>
                  
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110 duration-500">
                    {React.cloneElement(step.icon as React.ReactElement, { className: "w-6 h-6" })}
                  </div>
                  
                  <div className="space-y-3 text-right">
                    <h3 className="font-display font-black text-xl text-gray-950 leading-none">{step.title}</h3>
                    <p className="text-gray-400 font-medium text-xs leading-relaxed opacity-80">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Statistics & Trust Bar */}
      {!user && !showAdminUI && (
        <section className="px-4 max-w-7xl mx-auto pb-32">
          <div className="bg-gray-950 rounded-[4rem] p-12 md:p-24 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] -mr-64 -mt-64" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
               <div className="space-y-10 text-right">
                  <div className="space-y-4">
                     <span className="text-blue-500 font-black text-[10px] uppercase tracking-[0.4em] block">ضمانة عربون</span>
                     <h2 className="text-3xl md:text-5xl font-display font-black text-emerald-900 leading-[1.2] tracking-tighter">أمانك المالي <br/> هو <span className="text-blue-500">أولويتنا</span></h2>
                  </div>
                  <p className="text-gray-400 text-lg md:text-2xl font-medium leading-relaxed max-w-xl">
                    نظام تعميد رقمي يحفظ مستحقات البائع ويضمن استلام المشتري للخدمة المطلوبة، تحت إشراف نخبة من الخبراء.
                  </p>
                  <div className="flex flex-wrap gap-6">
                     <button onClick={() => setIsLoginModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-black transition-all flex items-center gap-3">
                        ابدأ الآن مجاناً <ArrowLeft className="w-5 h-5" />
                     </button>
                     <button onClick={() => navigate('/how-it-works')} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-10 py-5 rounded-2xl font-black transition-all">
                        شروط الإستخدام
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  {[
                    { val: '50M+', label: 'حجم التعاملات', icon: ShieldCheck },
                    { val: '99.9%', label: 'معدل النجاح', icon: Star },
                    { val: `${(totalUsers / 1000).toFixed(1)}K+`, label: 'بائع ومشتري', icon: Users },
                    { val: '24/7', label: 'دعم فني', icon: Clock },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 p-8 rounded-[3rem] text-center space-y-3 hover:bg-white/10 transition-colors cursor-default">
                       <stat.icon className="w-8 h-8 text-blue-500 mx-auto" />
                       <div className="text-3xl font-display font-black">{stat.val}</div>
                       <div className="text-gray-500 text-[10px] uppercase font-black tracking-widest">{stat.label}</div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </section>
      )}

      {/* Elegant Testimonials Section */}
      {!showAdminUI && (
        <section className="px-4 py-32 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20 px-4">
               <div className="space-y-4 text-right">
                  <h2 className="text-2xl md:text-4xl font-display font-black text-emerald-900 tracking-tighter">ماذا يقول <span className="text-blue-600">المستخدمون</span>؟</h2>
                  <p className="text-gray-400 font-medium text-lg md:text-xl">ثقتكم هي الوقود الدافع لمنصة عربون لتحقيق المستحيل.</p>
               </div>
               <div className="flex gap-2">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-orange-400 text-orange-400" />)}
               </div>
            </div>
            <TestimonialSlider />
          </div>
        </section>
      )}

      {/* High-Impact Final CTA */}
      {!user && !showAdminUI && (
        <section className="px-4 py-32 max-w-7xl mx-auto">
          <div className="bg-blue-600 rounded-[4rem] p-12 md:p-32 text-white relative overflow-hidden text-center flex flex-col items-center gap-12 group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-700 opacity-50" />
            
            <div className="relative z-10 max-w-3xl space-y-8">
               <h2 className="text-3xl md:text-6xl font-display font-black text-white tracking-tighter leading-[1.6]">جاهز لتأمين <br/> صفقتك <span className="text-white">القادمة</span>؟</h2>
               <p className="text-blue-100 text-lg md:text-2xl font-medium opacity-90">انضم لأكثر من {totalUsers.toLocaleString()} بائع ومشتري يمارسون أعمالهم بأمان تام في بيئة "عربون" القانونية والتقنية.</p>
            </div>
            
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
               <button onClick={() => setIsLoginModalOpen(true)} className="bg-gray-950 text-white hover:bg-white hover:text-gray-950 px-12 py-6 rounded-2xl font-black text-lg transition-all shadow-2xl shadow-black/20 hover:scale-[1.05]">
                  اشترك مجاناً
               </button>
               <button onClick={() => navigate('/search')} className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white px-12 py-6 rounded-2xl font-black text-lg transition-all">
                  قائمة الخدمات
               </button>
            </div>

            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] -ml-32 -mb-32 opacity-50" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[120px] -mr-48 -mt-48" />
          </div>
        </section>
      )}

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* Feedback Form */}
      {!showAdminUI && user && completedOrdersCount > 0 && (
        <section className="px-4 pt-12 pb-24">
          <div className="max-w-xl mx-auto">
            <GeneralFeedbackForm />
          </div>
        </section>
      )}
    </div>
  );
};
