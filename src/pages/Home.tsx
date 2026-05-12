import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, ArrowLeftRight, CheckCircle, CheckCircle2, Search, Clock, MessageSquare, 
  Star, LayoutGrid, Users, Briefcase, Lock, Zap, ArrowLeft, TrendingUp, 
  Sparkles, Plus, Wallet, Bell, Activity, CreditCard, Car, Smartphone, Eye, EyeOff, Home as HomeIcon 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, limit, getDocs, doc, setDoc, onSnapshot, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  const [showBalances, setShowBalances] = useState(true);
  const [stats, setStats] = useState<{ totalGuarantees: number, totalUsers: number } | null>(null);
  const [completedOrdersCount, setCompletedOrdersCount] = useState<number>(0);
  const [homeCard, setHomeCard] = useState<any>(null);
  const [heroBanner, setHeroBanner] = useState<any>(null);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [trustIndex, setTrustIndex] = useState(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000); 
    return () => clearInterval(timer);
  }, [steps.length]);

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
    // Fetch home card settings
    const unsubHome = onSnapshot(doc(db, 'app_settings', 'home_card'), (doc) => {
      if (doc.exists()) {
        setHomeCard(doc.data());
      }
    }, (error) => {
      console.warn('Home card settings denied');
    });

    // Fetch platform stats
    const unsubStats = onSnapshot(doc(db, 'app_settings', 'platform_stats'), (doc) => {
      if (doc.exists()) {
        setStats(doc.data() as any);
      }
    }, (error) => {
      console.warn('Stats sync denied');
    });

    // Fetch hero banner settings
    const unsubHero = onSnapshot(doc(db, 'app_settings', 'hero_banner'), (doc) => {
      if (doc.exists()) {
        setHeroBanner(doc.data());
      }
    }, (error) => {
      console.warn('Hero banner settings denied');
    });

    return () => {
      unsubHome();
      unsubStats();
      unsubHero();
    };
  }, []);

  useEffect(() => {
    // Live Users/Sellers - SAFE QUERY (using index)
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
    // Calculate real total guarantees volume - ADMIN ONLY (Reduced frequency or triggered manually)
    if (!user || !isAdmin) return;

    // We keep this but remove the crash-prone error handler
    const unsubGuarantees = onSnapshot(collection(db, 'orders'), (snap) => {
      const total = snap.docs.reduce((acc, doc) => {
        const data = doc.data();
        if (['escrowed', 'completed', 'in_progress'].includes(data.status)) {
          return acc + (data.amount || 0);
        }
        return acc;
      }, 0);
      
      if (isAdmin && total > 0) {
        setDoc(doc(db, 'app_settings', 'platform_stats'), {
          totalGuarantees: total,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
    }, (error) => {
      console.debug('Total guarantees sync skipped due to permissions');
    });
    return () => unsubGuarantees();
  }, [user, isAdmin]);

  useEffect(() => {
    // Fetch real total users from 'users' collection - ADMIN ONLY
    let unsubUsers = () => {};
    if (user && isAdmin) {
      unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const count = snapshot.size;
        if (isAdmin && count > 0) {
          setDoc(doc(db, 'app_settings', 'platform_stats'), {
            totalUsers: count,
            updatedAt: serverTimestamp()
          }, { merge: true }).catch(() => {});
        }
      }, (error) => {
        console.debug('Total users sync skipped due to permissions');
      });
    }

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
  }, [user, isAdmin]);

  const defaultTrustMessages = [
    { text: "الخيار الأول للتعاملات الآمنة", icon: <ShieldCheck className="w-4 h-4" /> },
    { text: "وساطة مالية ذكية وموثوقة", icon: <Lock className="w-4 h-4" /> },
    { text: "حقك محفوظ بأمان تام", icon: <CheckCircle className="w-4 h-4" /> },
    { text: "دفع إلكتروني معتمد 100%", icon: <Zap className="w-4 h-4" /> },
    { text: "خدمة تقسيط المدفوعات متوفرة الآن", icon: <CreditCard className="w-4 h-4" /> }
  ];

  const displayGuarantees = stats?.totalGuarantees || 0;
  const displayUsers = stats?.totalUsers || 0;

  const activeHeroTitleTop = heroBanner?.titleTop || 'ضمانك الموثوق';
  const activeHeroTitleBottom = heroBanner?.titleBottom || 'في العالم الرقمي';
  const activeHeroSubtitle = heroBanner?.subtitle || 'عربون هو وسيطك الذكي لضمان فحص وسلامة التعاملات المالية والخدمية في المملكة العربية السعودية.';
  const activeTrustMessages = heroBanner?.trustMessages?.map((m: string) => ({ 
    text: m, 
    icon: <ShieldCheck className="w-4 h-4" /> 
  })) || defaultTrustMessages;

    const categories = [
      { id: 'برمجة', name: 'البرمجة والتطوير', icon: <LayoutGrid className="w-4 h-4" />, color: 'bg-emerald-600', shadow: 'shadow-emerald-500/10' },
      { id: 'تعقيب', name: 'تعقيب معاملات', icon: <Briefcase className="w-4 h-4" />, color: 'bg-blue-600', shadow: 'shadow-blue-500/10' },
      { id: 'تسويق', name: 'التسويق الرقمي', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-orange-500', shadow: 'shadow-orange-500/10' },
      { id: 'تصميم', name: 'الجرافيك والتصميم', icon: <Sparkles className="w-4 h-4" />, color: 'bg-purple-600', shadow: 'shadow-purple-500/10' },
      { id: 'كتابة', name: 'الترجمة والكتابة', icon: <MessageSquare className="w-4 h-4" />, color: 'bg-slate-800', shadow: 'shadow-slate-900/10' },
      { id: 'استضافة', name: 'الاستضافة والسيرفرات', icon: <ShieldCheck className="w-4 h-4" />, color: 'bg-zinc-100', shadow: 'shadow-sm', textColor: 'text-gray-900', iconColor: 'text-blue-600' },
      { id: 'عقارات', name: 'العقارات والأراضي', icon: <HomeIcon className="w-4 h-4" />, color: 'bg-amber-600', shadow: 'shadow-amber-500/10' },
      { id: 'سيارات', name: 'السيارات والنقل', icon: <Car className="w-4 h-4" />, color: 'bg-rose-600', shadow: 'shadow-rose-500/10' },
      { id: 'إلكترونيات', name: 'الأجهزة الإلكترونية', icon: <Smartphone className="w-4 h-4" />, color: 'bg-cyan-600', shadow: 'shadow-cyan-500/10' },
    ];

    return (
    <div className="space-y-8 pb-20 overflow-x-hidden font-sans">
      {/* Dynamic Hero Section */}
      {!user ? (
        <section className="relative pt-0 md:pt-4 pb-8 md:pb-24 overflow-hidden px-0 min-h-[60vh] md:min-h-[90vh] flex flex-col justify-start md:justify-center">
          <div className="absolute inset-0 -z-20">
             <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] animate-pulse" />
             <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-blue-900/5 rounded-full blur-[100px]" />
             <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full flex flex-col items-center gap-4 md:gap-8 pt-2 md:pt-6"
          >
            <div className="text-center space-y-6 md:space-y-10 order-2 lg:order-1 max-w-4xl mx-auto flex flex-col items-center px-4">
              <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 md:px-8 md:py-4 bg-white/60 backdrop-blur-2xl border border-gray-100/50 text-blue-900 rounded-2xl md:rounded-3xl text-[11px] md:text-sm font-display font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/5 min-h-[3rem] md:min-h-[4rem] overflow-visible">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={trustIndex % activeTrustMessages.length}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-2 md:gap-4 py-1"
                  >
                    {React.cloneElement((activeTrustMessages[trustIndex % activeTrustMessages.length]?.icon || <ShieldCheck />) as React.ReactElement, { className: "w-4 h-4 md:w-6 md:h-6 text-blue-600" })}
                    <span className="opacity-90 leading-normal inline-block">{activeTrustMessages[trustIndex % activeTrustMessages.length]?.text}</span>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="space-y-4 md:space-y-6 px-4">
                <h1 className="text-3xl md:text-5xl lg:text-7xl font-display font-black text-slate-900 tracking-tighter leading-tight">
                  <span className="block text-slate-800">{activeHeroTitleTop}</span> 
                  <span className="block text-transparent bg-clip-text bg-gradient-to-l from-blue-700 via-blue-600 to-indigo-600">
                    {activeHeroTitleBottom}
                  </span>
                </h1>
                <p className="text-sm md:text-2xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed opacity-90 italic">
                  {activeHeroSubtitle}
                </p>
              </div>

              <div className="flex flex-row justify-center items-center gap-2 sm:gap-4 w-full px-6 max-w-xl mx-auto">
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 md:px-12 md:py-5 rounded-2xl md:rounded-3xl font-display font-black text-sm md:text-xl hover:bg-blue-700 shadow-2xl shadow-blue-600/30 transition-all hover:scale-[1.03] flex items-center justify-center gap-3 group"
                >
                  ابدأ الآن
                  <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-2 transition-transform" />
                </button>
              </div>
            </div>

            <div className="order-1 lg:order-2 w-full relative group mt-2 md:mt-4 px-0">
              <div className="absolute inset-0 bg-blue-500/5 blur-[120px] scale-[0.95] group-hover:scale-100 transition-transform duration-1000" />
              <motion.div 
                className="relative bg-white w-full rounded-none md:rounded-[4rem] shadow-[0_20px_80px_-15px_rgba(0,0,0,0.1)] overflow-hidden border-y md:border border-gray-100/50 transition-all duration-700"
              >
                <div className="relative h-[280px] md:h-[500px] lg:h-[600px] w-full">
                   <img 
                    src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=2400" 
                    className="w-full h-full object-cover" 
                    alt="Safe Transactions"
                   />
                   <div className="absolute bottom-0 left-0 w-full p-5 md:p-12 flex flex-row items-center justify-between gap-4 bg-gradient-to-t from-gray-950/95 via-gray-950/40 to-transparent backdrop-blur-[2px]">
                      <div className="flex flex-row items-center gap-3 md:gap-8">
                        <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-6 bg-white/5 px-4 py-2 md:px-8 md:py-4 rounded-2xl md:rounded-[2rem] border border-white/10 backdrop-blur-xl">
                          <p className="text-[7px] md:text-sm font-display font-black text-blue-400 uppercase tracking-[0.2em] whitespace-nowrap mb-0.5 md:mb-0">إجمالي الضمانات</p>
                          <p className="text-xl md:text-5xl font-display font-black text-white tracking-tighter whitespace-nowrap">{(displayGuarantees / 1000000).toFixed(1)}M<span className="text-[10px] md:text-xl opacity-40 mr-1">SAR</span></p>
                        </div>
                      </div>
                      {heroBanner?.showUserCards !== false && (
                        <div className="flex -space-x-3 md:-space-x-12 rtl:space-x-reverse items-center pr-2">
                          {featuredSellers.slice(0, 4).map((seller, idx) => (
                            <div 
                              key={seller.uid} 
                              onClick={() => navigate(`/seller/${seller.uid}`)}
                              className="w-10 h-10 md:w-28 md:h-28 rounded-full border-4 md:border-8 border-gray-950 bg-blue-600/5 overflow-hidden transition-transform hover:scale-110 hover:z-10 cursor-pointer shadow-2xl relative"
                            >
                               {seller.photoURL ? (
                                 <img src={seller.photoURL} alt={seller.displayName} className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-[8px] md:text-xl">
                                    {seller.displayName?.[0]}
                                 </div>
                               )}
                            </div>
                          ))}
                          {featuredSellers.length === 0 && [1,2,3,4].map(i => (
                            <div key={i} className="w-10 h-10 md:w-28 md:h-28 rounded-full border-4 md:border-8 border-gray-950 bg-blue-600/5 flex items-center justify-center text-white backdrop-blur-2xl transition-transform hover:scale-110 hover:z-10 cursor-pointer shadow-2xl">
                               <ShieldCheck className="w-5 h-5 md:w-12 md:h-12 opacity-30 text-blue-400" />
                            </div>
                          ))}
                        </div>
                      )}
                   </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>
      ) : (
        /* Logged In Personalized Hero */
        <section className="pt-4 md:pt-12 px-4 max-w-7xl mx-auto space-y-6 md:space-y-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-12 p-5 md:p-14 bg-white rounded-[2.5rem] md:rounded-[4rem] border border-gray-100 shadow-2xl shadow-blue-500/5 relative overflow-hidden group">
             {/* Abstract Background Accents */}
             <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full blur-[100px] -mr-40 -mt-40 opacity-50 group-hover:opacity-70 transition-opacity" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full blur-[100px] -ml-32 -mb-32 opacity-30" />
             
             <div className="relative z-10 space-y-6 md:space-y-10 text-right w-full lg:flex-1">
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 bg-blue-50/5 md:bg-transparent p-4 md:p-0 rounded-[2.5rem] md:rounded-0">
                   {/* Profile Image - Now on the Right (Start) */}
                   <div className="relative group/avatar">
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-[6px] border-white shadow-2xl shadow-blue-200/50 group-hover/avatar:scale-105 transition-transform duration-500">
                         {user?.photoURL ? (
                           <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         ) : (
                           <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white">
                             <Users className="w-10 h-10 md:w-12 md:h-12" />
                           </div>
                         )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 md:w-11 md:h-11 bg-white border border-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl group-hover/avatar:rotate-12 transition-transform">
                         <div className="w-5 h-5 md:w-7 md:h-7 bg-green-500 rounded-lg flex items-center justify-center text-white">
                            <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-white" />
                         </div>
                      </div>
                   </div>

                   {/* Name and Greet - Now on the Left (End) */}
                   <div className="flex-1 space-y-1 md:space-y-2 text-center md:text-right">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <div className="h-[2px] w-3 bg-blue-600 rounded-full" />
                        <span className="text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-widest opacity-70">طابت أوقاتك بكل خير</span>
                      </div>
                      <h1 className="text-2xl md:text-5xl font-display font-black text-gray-950 tracking-tighter leading-tight">
                        أهلاً، <span className="text-blue-600 font-black">{user?.displayName?.split(' ')[0] || 'مصفي'}</span>
                      </h1>
                      <p className="text-gray-400 font-bold text-[10px] md:text-lg max-w-sm mx-auto md:mx-0">
                        لديك <span className="text-gray-950 px-1.5 py-0.5 bg-gray-50 rounded-md">{activeOrders.length} عمليات</span> نشطة بانتظار اهتمامك اليوم.
                      </p>
                   </div>
                </div>

                <div className="flex flex-row gap-2 pt-2 w-full md:w-auto">
                   <button 
                    onClick={() => navigate('/orders/create')}
                    className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 text-white rounded-lg md:rounded-xl font-black text-[10px] md:text-xs flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 active:scale-[0.98]"
                   >
                     <span>إنشاء تعميد</span>
                     <Plus className="w-3 h-3 md:w-4 md:h-4" />
                   </button>
                   <button 
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-gray-50 text-gray-900 border border-gray-200/40 rounded-lg md:rounded-xl font-black text-[10px] md:text-xs flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-all active:scale-[0.98]"
                   >
                     <span>الملخص المالي</span>
                     <Activity className="w-3 h-3 md:w-4 md:h-4 opacity-30" />
                   </button>
                </div>
             </div>

             {/* Financial Bento Cards */}
             <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4 w-full lg:w-72 flex-shrink-0">
                <div className="bg-gray-950 p-4 md:p-5 rounded-[2rem] md:rounded-[2.5rem] text-white flex flex-col justify-between shadow-xl relative overflow-hidden group/card hover:scale-[1.02] transition-transform h-28 md:h-32">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600 rounded-full blur-[40px] opacity-20 group-hover/card:opacity-30 transition-opacity" />
                    <div className="relative z-10 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-white/10 rounded-md flex items-center justify-center">
                             <TrendingUp className="w-2.5 h-2.5 text-blue-400" />
                          </div>
                          <p className="text-[6px] md:text-[8px] font-black uppercase tracking-[0.1em] opacity-40">إجمالي المعاملات</p>
                       </div>
                       <button 
                         onClick={(e) => { e.stopPropagation(); setShowBalances(!showBalances); }}
                         className="p-1 hover:bg-white/10 rounded-md transition-colors"
                       >
                         {showBalances ? <Eye className="w-3 h-3 opacity-40" /> : <EyeOff className="w-3 h-3 opacity-40" />}
                       </button>
                    </div>
                    <div className="relative z-10">
                       <p className="text-lg md:text-2xl font-display font-black leading-none">
                         {showBalances ? (profile?.balance || 0).toLocaleString() : '••••••'} 
                         <span className="text-[9px] md:text-xs font-sans opacity-40 mr-1">ر.س</span>
                       </p>
                    </div>
                    <div className="relative z-10">
                       <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded-full text-[6px] md:text-[8px] font-black">
                          <CheckCircle2 className="w-2 h-2 md:w-2.5 md:h-2.5" />
                          محولة لحسابك
                       </span>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 md:p-5 rounded-[2rem] md:rounded-[2.5rem] border border-blue-100/40 flex flex-col justify-between relative overflow-hidden group/card hover:scale-[1.02] transition-transform h-28 md:h-32">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400 rounded-full blur-[40px] opacity-10 group-hover/card:opacity-20 transition-opacity" />
                    <div className="relative z-10 flex items-center gap-2">
                       <div className="w-5 h-5 bg-blue-600/10 rounded-md flex items-center justify-center">
                          <Clock className="w-2.5 h-2.5 text-blue-600" />
                       </div>
                       <p className="text-[6px] md:text-[8px] font-black text-blue-900/40 uppercase tracking-[0.1em]">مبالغ تحت الإجراء</p>
                    </div>
                    <div className="relative z-10">
                       <p className="text-lg md:text-2xl font-display font-black text-blue-950 leading-none">
                         {showBalances ? (profile?.pendingBalance || 0).toLocaleString() : '••••••'} 
                         <span className="text-[9px] md:text-xs font-sans opacity-30 text-blue-900 mr-1">ر.س</span>
                       </p>
                    </div>
                    <div className="relative z-10">
                       <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/10 text-blue-600 rounded-full text-[6px] md:text-[8px] font-black">
                          <ShieldCheck className="w-2 h-2 md:w-2.5 md:h-2.5" />
                          بانتظار الإتمام
                       </span>
                    </div>
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
          <div className="flex items-center justify-between mb-6 px-2">
             <div className="space-y-1">
                <h2 className="text-xl md:text-3xl font-display font-black text-emerald-900 tracking-tight">استكشف <span className="text-blue-600">الأقسام</span></h2>
                <div className="h-1.5 w-16 bg-blue-500 rounded-full" />
             </div>
             <Link to="/search" className="text-sm font-display font-black text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-2">
                مشاهدة الكل <ArrowLeft className="w-4 h-4" />
             </Link>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
            {categories.slice(0, 6).map((cat) => (
              <motion.div 
                key={cat.id}
                whileHover={{ y: -5, scale: 1.02 }}
                onClick={() => navigate(`/search?category=${cat.id}`)}
                className={`${cat.color} p-3 md:p-4 rounded-2xl ${cat.textColor || 'text-white'} overflow-hidden relative group cursor-pointer shadow-md ${cat.shadow} min-h-[110px] md:min-h-[130px] flex flex-col justify-between`}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
                <div className="relative z-10">
                   <div className={`w-8 h-8 ${cat.textColor ? 'bg-white shadow-sm' : 'bg-white/10 backdrop-blur-xl'} rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                     {React.cloneElement(cat.icon as React.ReactElement, { className: `w-4 h-4 ${cat.iconColor || ''}` })}
                   </div>
                   <h3 className="text-[10px] md:text-sm font-display font-black leading-tight">{cat.name.split(' ').join('\n')}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}



      {/* Featured Sellers - High Impact Grid */}
      {!showAdminUI && (
        <section className="py-12 bg-gray-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -mr-64 -mt-64" />
          
          <div className="max-w-7xl mx-auto px-4 relative z-10">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 px-2">
                <div className="text-right space-y-4">
                   <div className="flex items-center gap-3 justify-end mb-2">
                      <div className="h-0.5 w-10 bg-blue-500/30" />
                      <span className="text-xs md:text-sm font-black text-blue-600 uppercase tracking-[0.3em] shadow-sm bg-white px-5 py-2 rounded-full leading-relaxed block overflow-visible">نخبة الضمان</span>
                   </div>
                   <h2 className="text-3xl md:text-6xl font-display font-black text-emerald-900 tracking-tighter leading-[1.2] whitespace-pre-line">خبراء بانتظار <br/><span className="text-blue-600">خدمتك</span></h2>
                   <p className="text-gray-600 font-bold text-lg md:text-2xl max-w-xl leading-relaxed">مقدمو خدمات موثوقون، تحققنا من كفاءتهم التقنية والأخلاقية للعمل تحت مظلة عربون.</p>
                </div>
                <button onClick={() => navigate('/search')} className="group px-8 py-5 bg-gray-950 text-white rounded-2xl font-display font-black text-sm flex items-center gap-4 hover:bg-blue-600 transition-all shadow-2xl shadow-gray-200">
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
        <div className="relative overflow-hidden">
          <div className="absolute top-1/2 left-0 w-full h-px bg-gray-50 -translate-y-1/2" />
          
          <div className="max-w-7xl mx-auto relative z-10 px-4">
            <div className="text-center space-y-4 mb-4">
              <div className="inline-flex items-center gap-3 px-6 py-3.5 md:px-8 md:py-4 bg-blue-50 text-blue-600 rounded-full text-[11px] md:text-sm font-black uppercase tracking-[0.2em] border border-blue-100/50 leading-none shadow-sm overflow-visible">
                <ArrowLeftRight className="w-5 h-5" />
                <span className="inline-block">بروتوكول الضمان الذكي</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-black text-emerald-900 tracking-tighter leading-[1.2]">كيف نضمن <span className="text-blue-600 underline decoration-blue-100 underline-offset-8">حقك</span>؟</h2>
              <p className="text-gray-500 font-bold max-w-2xl mx-auto text-lg md:text-2xl leading-relaxed">خطوات مدروسة تقنياً لضمان سلامة كل ريال من طرفي الصفقة.</p>
            </div>
 
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8 mt-4 px-4 max-w-6xl mx-auto">
              {steps.map((step, idx) => {
                const isActive = activeStep === idx;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    animate={isActive ? { 
                      scale: 1.02, 
                      borderColor: 'rgba(59, 130, 246, 0.5)',
                      backgroundColor: 'rgba(255, 255, 255, 1)',
                      boxShadow: '0 20px 40px -12px rgba(59, 130, 246, 0.15)'
                    } : { 
                      scale: 1, 
                      borderColor: 'rgba(249, 250, 251, 0.5)',
                      backgroundColor: 'rgba(255, 255, 255, 0.5)',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                    className={`relative group rounded-2xl p-4 md:p-8 border-2 transition-all duration-500 flex flex-col items-center text-center md:items-start md:text-right pt-8 md:pt-10 ${
                      isActive ? 'z-20' : 'z-10'
                    }`}
                  >
                    <div className={`absolute top-2 left-3 md:top-4 md:left-6 w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-display font-black text-[10px] md:text-xs transition-colors duration-500 ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {idx + 1}
                    </div>
                    
                    <div className={`w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 transition-all transform duration-500 shadow-lg ${
                      isActive ? 'bg-blue-600 text-white scale-110' : 'bg-white text-blue-600'
                    }`}>
                      {React.cloneElement(step.icon as React.ReactElement, { 
                        className: `w-5 h-5 md:w-7 md:h-7` 
                      })}
                    </div>
                    
                    <div className="space-y-2 w-full">
                      <h3 className={`font-display font-black text-[11px] md:text-lg leading-tight transition-colors duration-500 ${
                        isActive ? 'text-blue-600' : 'text-gray-950'
                      }`}>{step.title}</h3>
                      <p className={`font-medium text-[9px] md:text-sm leading-relaxed line-clamp-2 md:line-clamp-none transition-opacity duration-500 ${
                        isActive ? 'text-gray-600 opacity-100' : 'text-gray-400 opacity-70'
                      }`}>{step.desc}</p>
                    </div>

                    {isActive && (
                      <motion.div
                        layoutId="active-indicator"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Statistics & Trust Bar */}
      {!user && !showAdminUI && (
        <section className="px-4 max-w-7xl mx-auto py-2 md:py-4 flex flex-col justify-center">
          <div className="bg-gray-950 rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] -mr-64 -mt-64" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-20 items-center">
               <div className="space-y-3 md:space-y-10 text-right">
                   <div className="space-y-1 md:space-y-4">
                      <span className="text-blue-500 font-display font-black text-[8px] md:text-[10px] uppercase tracking-[0.4em] block">ضمانة عربون</span>
                      <h2 className="text-xl md:text-5xl font-display font-black text-white leading-[1.2] tracking-tighter">أمانك المالي <br className="hidden md:block"/> هو <span className="text-blue-500">أولويتنا</span></h2>
                   </div>
                  <p className="text-gray-400 text-[11px] md:text-2xl font-medium leading-relaxed max-w-xl opacity-80">
                    نظام تعميد رقمي يحفظ مستحقات البائع ويضمن استلام المشتري للخدمة المطلوبة، تحت إشراف نخبة من الخبراء.
                  </p>
                  <div className="flex flex-row gap-3 md:gap-6 pt-1 md:pt-0">
                     <button onClick={() => setIsLoginModalOpen(true)} className="flex-1 md:flex-none justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 md:px-10 md:py-5 rounded-lg md:rounded-2xl font-black transition-all flex items-center gap-2 text-[10px] md:text-base">
                        ابدأ الآن <ArrowLeft className="w-3.5 h-3.5 md:w-5 md:h-5" />
                     </button>
                     <button onClick={() => navigate('/how-it-works')} className="flex-1 md:flex-none justify-center bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 md:px-10 md:py-5 rounded-lg md:rounded-2xl font-black transition-all text-[10px] md:text-base">
                        شروطنا
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-2 md:gap-4">
                  {[
                    { val: displayGuarantees > 999999 ? `${(displayGuarantees / 1000000).toFixed(1)}M+` : displayGuarantees.toLocaleString(), label: 'حجم التعاملات', icon: ShieldCheck },
                    { val: '99.9%', label: 'معدل النجاح', icon: Star },
                    { val: displayUsers.toLocaleString(), label: 'بائع ومشتري', icon: Users },
                    { val: '24/7', label: 'دعم فني', icon: Clock },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 p-3 md:p-8 rounded-xl md:rounded-[3rem] text-center space-y-1 md:space-y-3 hover:bg-white/10 transition-colors cursor-default">
                       <stat.icon className="w-4 h-4 md:w-8 md:h-8 text-blue-500 mx-auto" />
                       <div className="text-lg md:text-3xl font-display font-black">{stat.val}</div>
                       <div className="text-gray-500 text-[7px] md:text-[10px] uppercase font-black tracking-widest">{stat.label}</div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </section>
      )}

      {/* Elegant Testimonials Section */}
      {!showAdminUI && (
        <section className="px-4 pt-16 pb-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-12 px-4">
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
        <div className="px-4 max-w-7xl mx-auto -mt-4 md:-mt-8 mb-8 md:mb-16">
          <div className="bg-blue-600 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-20 text-white relative overflow-hidden text-center flex flex-col items-center gap-6 md:gap-8 group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-700 opacity-50" />
            
            <div className="relative z-10 max-w-3xl space-y-3 md:space-y-8">
               <h2 className="text-2xl md:text-6xl font-display font-black text-white tracking-tighter leading-tight md:leading-[1.6]">جاهز لتأمين <br className="hidden md:block"/> صفقتك <span className="text-white">القادمة</span>؟</h2>
               <p className="text-blue-100 text-[11px] md:text-2xl font-medium opacity-80 max-w-xl mx-auto">انضم لأكثر من {displayUsers.toLocaleString()} بائع ومشتري يمارسون أعمالهم بأمان تام في بيئة "عربون".</p>
            </div>
            
            <div className="relative z-10 flex flex-row gap-3 md:gap-6 w-full md:w-auto">
               <button onClick={() => setIsLoginModalOpen(true)} className="flex-1 md:flex-none justify-center bg-gray-950 text-white hover:bg-white hover:text-gray-950 px-4 py-3 md:px-12 md:py-6 rounded-xl md:rounded-2xl font-black text-[10px] md:text-lg transition-all shadow-2xl shadow-black/20 hover:scale-[1.05]">
                  ابدأ مجاناً
               </button>
               <button onClick={() => navigate('/search')} className="flex-1 md:flex-none justify-center bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white px-4 py-3 md:px-12 md:py-6 rounded-xl md:rounded-2xl font-black text-[10px] md:text-lg transition-all">
                  قائمة البائعين
               </button>
            </div>

            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] -ml-32 -mb-32 opacity-40" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[120px] -mr-48 -mt-48" />
          </div>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* Feedback Form */}
      {!showAdminUI && user && completedOrdersCount > 0 && (
        <section className="px-4 pt-6 pb-12">
          <div className="max-w-xl mx-auto">
            <GeneralFeedbackForm />
          </div>
        </section>
      )}
    </div>
  );
};
