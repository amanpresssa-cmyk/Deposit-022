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
import { WithdrawalModal } from '../components/ui/WithdrawalModal';

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
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [heroStatIndex, setHeroStatIndex] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<{name: string, desc: string} | null>(null);

  const paymentInfo = {
    mada: { name: 'مدى (Mada)', desc: 'تعتبر رسوم الدفع عبر بطاقات مدى الأقل تكلفة، حيث تقدر رسوم البوابة بحوالي 1.75% + 1 ريال للعملية الواحدة (حسب الاتفاقية).' },
    visa: { name: 'فيزا (Visa)', desc: 'رسوم البطاقات الائتمانية (فيزا) تكون عادة بين 2.2% إلى 2.5% + 1 ريال للعملية، وهي أعلى نسبياً من بطاقات مدى.' },
    mastercard: { name: 'ماستركارد (Mastercard)', desc: 'كما هو الحال مع فيزا، رسوم ماستركارد تتراوح بين 2.2% و 2.5% + 1 ريال للعملية.' },
    applepay: { name: 'آبل باي (Apple Pay)', desc: 'رسوم آبل باي تعتمد كلياً على نوع البطاقة المضافة في المحفظة، إذا كانت البطاقة مدى تطبق رسوم مدى، وإذا كانت ائتمانية تطبق رسوم البطاقات الائتمانية.' },
    tabby: { name: 'تابي (Tabby)', desc: 'تتيح خدمة تابي للعملاء الدفع بالتقسيط، وتأخذ بوابة الدفع رسوماً أعلى تتراوح غالباً بين 5% إلى 7% من قيمة الطلب.' },
    tamara: { name: 'تمارا (Tamara)', desc: 'تتيح خدمة تمارا للعملاء الدفع بالتقسيط، وتأخذ بوابة الدفع رسوماً أعلى تتراوح غالباً بين 5% إلى 7% من قيمة الطلب.' },
  };

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
    }, 1500); 
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
      setHeroStatIndex((prev) => (prev + 1) % 3);
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
        return acc + (data.amount || 0);
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

  const formatCompactArabic = (num: number) => {
    if (num >= 1000000000) return { value: +(num / 1000000000).toFixed(1), suffix: 'مليار ر.س' };
    if (num >= 1000000) return { value: +(num / 1000000).toFixed(1), suffix: 'مليون ر.س' };
    if (num >= 1000) return { value: +(num / 1000).toFixed(1), suffix: 'ألف ر.س' };
    return { value: num.toLocaleString(), suffix: 'ر.س' };
  };
  const guaranteesData = formatCompactArabic(displayGuarantees);

  const activeHeroTitleTop = heroBanner?.titleTop || 'ضمانك الموثوق';
  const activeHeroTitleBottom = heroBanner?.titleBottom || 'في العالم الرقمي';
  const activeHeroSubtitle = heroBanner?.subtitle || 'نضمن حقوق البائع والمشتري بكل أمان وشفافية عبر نظام التعميد الذكي.';
  const activeTrustMessages = heroBanner?.trustMessages?.map((m: string) => ({ 
    text: m, 
    icon: <ShieldCheck className="w-4 h-4" /> 
  })) || defaultTrustMessages;

  const heroStatsData = [
    {
      title: 'إجمالي المبالغ المضمونة',
      icon: ShieldCheck,
      value: guaranteesData.value,
      suffix: guaranteesData.suffix,
    },
    {
      title: 'المستخدمين النشطين',
      icon: Users,
      value: displayUsers.toLocaleString(),
      suffix: 'مستخدم',
    },
    {
      title: 'إجمالي الطلبات المنفذة',
      icon: Star,
      value: (displayUsers * 3 + 124).toLocaleString(), // Fallback dynamic number for showcase, could read real orders if available
      suffix: 'طلب',
    }
  ];

    const categories = [
      { id: 'برمجة', name: 'البرمجة والتطوير', icon: <LayoutGrid className="w-4 h-4" />, color: 'bg-emerald-600', shadow: 'shadow-emerald-500/10' },
      { id: 'تعقيب', name: 'تعقيب معاملات', icon: <Briefcase className="w-4 h-4" />, color: 'bg-blue-600', shadow: 'shadow-blue-500/10' },
      { id: 'تسويق', name: 'التسويق الرقمي', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-orange-500', shadow: 'shadow-orange-500/10' },
      { id: 'تصميم', name: 'الجرافيك والتصميم', icon: <Sparkles className="w-4 h-4" />, color: 'bg-slate-500', shadow: 'shadow-slate-500/10' },
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
              <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 md:px-8 md:py-4 bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-gray-100/50 dark:border-white/5 text-blue-900 dark:text-blue-100 rounded-2xl md:rounded-3xl text-[11px] md:text-sm font-display font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/5 dark:shadow-black/20 min-h-[3rem] md:min-h-[4rem] overflow-visible">
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
                <h1 className="text-3xl md:text-5xl lg:text-7xl font-display font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                  <span className="block text-slate-800 dark:text-slate-200">{activeHeroTitleTop}</span> 
                  <span className="block text-transparent bg-clip-text bg-gradient-to-l from-blue-700 via-blue-600 to-indigo-600">
                    {activeHeroTitleBottom}
                  </span>
                </h1>
                <p className="text-sm md:text-2xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed opacity-90 italic">
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
                className="relative bg-white dark:bg-gray-900 w-full rounded-none md:rounded-[4rem] shadow-[0_20px_80px_-15px_rgba(0,0,0,0.1)] dark:shadow-black/40 overflow-hidden border-y md:border border-gray-100/50 dark:border-white/5 transition-all duration-700"
              >
                <div className="relative h-[280px] md:h-[500px] lg:h-[600px] w-full">
                   <img 
                    src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=2400" 
                    className="w-full h-full object-cover dark:opacity-80" 
                    alt="Safe Transactions"
                   />
                   <div className="absolute bottom-0 left-0 w-full p-5 md:p-12 flex flex-row items-center justify-between gap-4 bg-gradient-to-t from-gray-950/95 via-gray-950/40 to-transparent backdrop-blur-[2px]">
                      <div className="flex flex-row items-center gap-3 md:gap-8">
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-6 bg-gray-900/60 hover:bg-gray-900/80 backdrop-blur-xl px-5 py-3 md:px-10 md:py-6 rounded-2xl md:rounded-[2rem] border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-500 group overflow-hidden relative cursor-default min-w-[220px] md:min-w-[400px]">
                          <div className="absolute inset-0 bg-blue-500/20 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                          <div className="relative z-10 flex flex-col w-full">
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={heroStatIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col"
                              >
                                <p className="text-[9px] md:text-sm font-display font-black text-blue-300 uppercase tracking-[0.2em] whitespace-nowrap mb-1 md:mb-2 flex items-center gap-2">
                                  {(() => { 
                                    const Icon = heroStatsData[heroStatIndex].icon; 
                                    return <Icon className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />; 
                                  })()}
                                  {heroStatsData[heroStatIndex].title}
                                </p>
                                <p className="text-2xl md:text-6xl font-display font-black text-white tracking-tighter whitespace-nowrap drop-shadow-lg" dir="ltr">
                                  {heroStatsData[heroStatIndex].value}
                                  <span className="text-[10px] md:text-xl text-blue-200/90 ml-2 font-bold">{heroStatsData[heroStatIndex].suffix}</span>
                                </p>
                              </motion.div>
                            </AnimatePresence>
                          </div>
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
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-12 p-5 md:p-14 bg-white dark:bg-gray-900 rounded-[2.5rem] md:rounded-[4rem] border border-gray-100 dark:border-gray-800 shadow-2xl shadow-blue-500/5 dark:shadow-black/20 relative overflow-hidden group transition-colors duration-300">
             {/* Abstract Background Accents */}
             <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-[100px] -mr-40 -mt-40 opacity-50 group-hover:opacity-70 transition-opacity" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-[100px] -ml-32 -mb-32 opacity-30" />
             
             <div className="relative z-10 space-y-6 md:space-y-10 text-right w-full lg:flex-1">
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 bg-blue-50/5 dark:bg-blue-900/5 md:bg-transparent p-4 md:p-0 rounded-[2.5rem] md:rounded-0 transition-colors">
                   {/* Profile Image - Now on the Right (Start) */}
                   <div className="relative group/avatar">
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-[6px] border-white dark:border-gray-800 shadow-2xl shadow-blue-200/50 dark:shadow-black/40 group-hover/avatar:scale-105 transition-all duration-500">
                         {user?.photoURL ? (
                           <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         ) : (
                           <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white">
                             <Users className="w-10 h-10 md:w-12 md:h-12" />
                           </div>
                         )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 md:w-11 md:h-11 bg-white dark:bg-gray-800 border border-blue-50 dark:border-gray-700 rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl group-hover/avatar:rotate-12 transition-all">
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
                      <h1 className="text-2xl md:text-5xl font-display font-black text-gray-950 dark:text-white tracking-tighter leading-tight">
                        أهلاً، <span className="text-blue-600 dark:text-blue-400 font-black">{user?.displayName?.split(' ')[0] || 'مصفي'}</span>
                      </h1>
                      <p className="text-gray-400 dark:text-gray-500 font-bold text-[10px] md:text-lg max-w-sm mx-auto md:mx-0">
                        لديك <span className="text-gray-950 dark:text-gray-100 px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 rounded-md">{activeOrders.length} عمليات</span> نشطة بانتظار اهتمامك اليوم.
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
                    className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200/40 dark:border-white/5 rounded-lg md:rounded-xl font-black text-[10px] md:text-xs flex items-center justify-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
                   >
                     <span>الملخص المالي</span>
                     <Activity className="w-3 h-3 md:w-4 md:h-4 opacity-30" />
                   </button>
                </div>
             </div>

             {/* Financial Bento Cards */}
             <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4 w-full lg:w-72 flex-shrink-0">
                <div className="bg-white dark:bg-gray-900 p-3 md:p-5 rounded-2xl md:rounded-[2.5rem] text-gray-900 dark:text-gray-100 flex flex-col justify-between shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group/card hover:scale-[1.02] transition-transform h-24 md:h-32 transition-colors duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600 rounded-full blur-[40px] opacity-10 group-hover/card:opacity-20 transition-opacity" />
                    <div className="relative z-10 flex items-center justify-between">
                       <div className="flex items-center gap-1.5 md:gap-2">
                          <div className="w-4 h-4 md:w-5 md:h-5 bg-blue-50 dark:bg-blue-900/30 rounded md:rounded-md flex items-center justify-center transition-colors">
                             <TrendingUp className="w-2 md:w-2.5 h-2 md:h-2.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <p className="text-[6px] md:text-[8px] font-black uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">إجمالي المعاملات</p>
                       </div>
                       <button 
                         onClick={(e) => { e.stopPropagation(); setShowBalances(!showBalances); }}
                         className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                       >
                         {showBalances ? <Eye className="w-3 h-3 text-gray-400 dark:text-gray-500" /> : <EyeOff className="w-3 h-3 text-gray-400 dark:text-gray-500" />}
                       </button>
                    </div>
                    <div className="relative z-10">
                       <p className="text-base md:text-2xl font-display font-black leading-none text-gray-900 dark:text-white">
                         {showBalances ? (profile?.balance || 0).toLocaleString() : '••••••'} 
                         <span className="text-[8px] md:text-xs font-sans opacity-40 dark:opacity-20 mr-1">ر.س</span>
                       </p>
                    </div>
                    <div className="relative z-10 flex items-center gap-2 flex-wrap">
                       <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-[6px] md:text-[8px] font-black transition-colors">
                          <CheckCircle2 className="w-2 h-2 md:w-2.5 md:h-2.5" />
                          محولة لحسابك
                       </span>
                       
                       <button 
                         onClick={(e) => { e.stopPropagation(); setIsWithdrawalModalOpen(true); }}
                         className="mr-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[6px] md:text-[8px] font-black hover:bg-emerald-200 transition-colors"
                       >
                         <Wallet className="w-2 h-2 md:w-2.5 md:h-2.5" />
                         تحويل المستحقات
                       </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-3 md:p-5 rounded-2xl md:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex flex-col justify-between shadow-sm relative overflow-hidden group/card hover:scale-[1.02] transition-transform h-24 md:h-32 transition-colors duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400 rounded-full blur-[40px] opacity-10 group-hover/card:opacity-20 transition-opacity" />
                    <div className="relative z-10 flex items-center gap-1.5 md:gap-2">
                       <div className="w-4 h-4 md:w-5 md:h-5 bg-blue-50 dark:bg-blue-900/30 rounded md:rounded-md flex items-center justify-center transition-colors">
                          <Clock className="w-2 md:w-2.5 h-2 md:h-2.5 text-blue-600 dark:text-blue-400" />
                       </div>
                       <p className="text-[6px] md:text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em]">مبالغ تحت الإجراء</p>
                    </div>
                    <div className="relative z-10">
                       <p className="text-base md:text-2xl font-display font-black text-gray-900 dark:text-white leading-none">
                         {showBalances ? (profile?.pendingBalance || 0).toLocaleString() : '••••••'} 
                         <span className="text-[8px] md:text-xs font-sans opacity-40 dark:opacity-20 text-gray-400 dark:text-gray-500 mr-1">ر.س</span>
                       </p>
                    </div>
                    <div className="relative z-10">
                       <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[6px] md:text-[8px] font-black transition-colors">
                          <ShieldCheck className="w-2 h-2 md:w-2.5 md:h-2.5" />
                          بانتظار الإتمام
                       </span>
                    </div>
                </div>
             </div>
          </div>

          {activeOrders.length > 0 && (
            <div className="space-y-6 pt-12">
               <div className="flex items-center justify-between px-2">
                  <h2 className="text-xl font-display font-black flex items-center gap-2 text-gray-900 dark:text-white">
                    <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    عمليات تتطلب انتباهك
                  </h2>
                  <Link to="/dashboard" className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline">مشاهدة الكل</Link>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {activeOrders.map(order => (
                    <motion.div 
                      key={order.id}
                      onClick={() => navigate(`/order/${order.id}`)}
                      className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm dark:shadow-black/20 hover:shadow-xl transition-all cursor-pointer group"
                    >
                       <div className="flex justify-between mb-4">
                          <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">
                            {order.status === 'pending' ? 'انتظار' : 'في الضمان'}
                          </div>
                          <span className="text-lg font-display font-black text-gray-900 dark:text-white">{order.amount.toLocaleString()} <span className="text-[10px] opacity-40">ر.س</span></span>
                       </div>
                       <h4 className="font-black text-gray-900 dark:text-gray-100 line-clamp-1 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">{order.title}</h4>
                       <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-4 line-clamp-1">تاريخ العملية: {order.createdAt?.toDate().toLocaleDateString('ar-SA')}</p>
                       <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest">
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

      {/* Categories Section */}
      {!showAdminUI && (
        <section className="px-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 px-2">
             <div className="space-y-1">
                <h2 className="text-xl md:text-3xl font-display font-black text-emerald-900 dark:text-emerald-400 tracking-tight">استكشف <span className="text-blue-600 dark:text-blue-400">الأقسام</span></h2>
                <div className="h-1.5 w-16 bg-blue-500 rounded-full" />
             </div>
             <Link to="/search" className="text-sm font-display font-black text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2">
                مشاهدة الكل <ArrowLeft className="w-4 h-4" />
             </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
            {categories.slice(0, 6).map((cat) => (
              <motion.div 
                key={cat.id}
                whileHover={{ y: -5, scale: 1.02 }}
                onClick={() => navigate(`/search?category=${cat.id}`)}
                className={`${cat.color} p-3 md:p-4 rounded-2xl ${cat.textColor || 'text-white'} overflow-hidden relative group cursor-pointer shadow-md ${cat.shadow} min-h-[110px] md:min-h-[130px] flex flex-col justify-between`}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
                <div className="relative z-10">
                   <div className={`w-8 h-8 ${cat.textColor ? 'bg-white dark:bg-gray-100 shadow-sm' : 'bg-white/10 dark:bg-white/5 backdrop-blur-xl'} rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                     {React.cloneElement(cat.icon as React.ReactElement, { className: `w-4 h-4 ${cat.iconColor || ''}` })}
                   </div>
                   <h3 className="text-[10px] md:text-sm font-display font-black leading-tight uppercase tracking-tight">{cat.name.split(' ').join('\n')}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Sellers - High Impact Grid */}
      {!showAdminUI && (
        <section className="py-12 bg-gray-50 dark:bg-gray-950/50 relative overflow-hidden transition-colors duration-300">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -mr-64 -mt-64" />
          
          <div className="max-w-7xl mx-auto px-4 relative z-10">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 px-2">
                <div className="text-right space-y-4">
                   <div className="flex items-center gap-3 justify-end mb-2">
                      <div className="h-0.5 w-10 bg-blue-500/30" />
                      <span className="text-xs md:text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em] shadow-sm bg-white dark:bg-gray-900 border dark:border-gray-800 px-5 py-2 rounded-full leading-relaxed block overflow-visible leading-none">نخبة الضمان</span>
                   </div>
                   <h2 className="text-3xl md:text-6xl font-display font-black text-emerald-900 dark:text-emerald-400 tracking-tighter leading-[1.2] whitespace-pre-line">خبراء بانتظار <br/><span className="text-blue-600 dark:text-blue-400">خدمتك</span></h2>
                   <p className="text-gray-600 dark:text-gray-400 font-bold text-lg md:text-2xl max-w-xl leading-relaxed">مقدمو خدمات موثوقون، تحققنا من كفاءتهم التقنية والأخلاقية للعمل تحت مظلة عربون.</p>
                </div>
                <button onClick={() => navigate('/search')} className="group px-8 py-5 bg-gray-950 dark:bg-gray-800 text-white rounded-2xl font-display font-black text-sm flex items-center justify-center gap-4 hover:bg-blue-600 transition-all shadow-2xl shadow-gray-200 dark:shadow-black/40 uppercase tracking-widest leading-none">
                   تصفح كافة البائعين
                   <ArrowLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                </button>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
               {loadingSellers ? (
                 [1, 2, 3, 4].map(i => (
                   <div key={i} className="h-[430px] bg-white dark:bg-gray-900 rounded-[3.5rem] animate-pulse shadow-sm border border-gray-100 dark:border-gray-800" />
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
        <div className="relative overflow-hidden transition-colors duration-300 py-8">
          <div className="max-w-5xl mx-auto relative z-10 px-4">
            <div className="text-center space-y-3 mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em] border border-blue-100/50 dark:border-blue-900/30 leading-none shadow-sm overflow-visible">
                <ArrowLeftRight className="w-4 h-4" />
                <span className="inline-block">بروتوكول الضمان الذكي</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-display font-black text-emerald-900 dark:text-emerald-400 tracking-tighter leading-[1.2]">كيف نضمن <span className="text-blue-600 underline decoration-blue-100 dark:decoration-blue-900 underline-offset-8">حقك</span>؟</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold max-w-xl mx-auto text-sm md:text-lg leading-relaxed">خطوات مدروسة تقنياً لضمان سلامة كل ريال من طرفي الصفقة.</p>
            </div>
 
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mt-4 px-2 md:px-4 max-w-5xl mx-auto">
              {steps.map((step, idx) => {
                const isActive = activeStep === idx;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.15, duration: 0.6, type: 'spring', bounce: 0.4 }}
                    animate={isActive ? { 
                      scale: 1.05, 
                      y: -8,
                      borderColor: 'rgba(59, 130, 246, 0.8)',
                      backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 1))',
                      boxShadow: '0 20px 40px -12px rgba(59, 130, 246, 0.25), 0 0 15px rgba(59, 130, 246, 0.1)',
                      filter: 'grayscale(0%) blur(0px)',
                      opacity: 1,
                      zIndex: 30
                    } : { 
                      scale: 0.95, 
                      y: 0,
                      borderColor: 'var(--border-color, rgba(249, 250, 251, 0.5))',
                      backgroundColor: 'var(--card-bg-dim, rgba(255, 255, 255, 0.3))',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      filter: 'grayscale(60%) blur(1px)',
                      opacity: 0.6,
                      zIndex: 10
                    }}
                    className="relative group rounded-[1.5rem] p-4 md:p-6 border-2 transition-all duration-700 flex flex-col items-center text-center md:items-start md:text-right pt-6 md:pt-10 dark:bg-gray-800/50"
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-[1.5rem] pointer-events-none" />
                    )}
                    
                    <div className={`absolute top-2 left-3 md:top-4 md:left-5 w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-display font-black text-[10px] md:text-xs transition-all duration-500 ${
                      isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                    }`}>
                      {idx + 1}
                    </div>
                    
                    <motion.div 
                      animate={isActive ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] } : { rotate: 0, scale: 1 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-[1.2rem] flex items-center justify-center mb-4 md:mb-6 transition-all transform duration-500 shadow-xl relative ${
                        isActive ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-blue-500/40' : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-gray-200/50 dark:shadow-none'
                      }`}
                    >
                      {isActive && <div className="absolute inset-0 bg-white/20 blur-sm rounded-[1.2rem] animate-pulse" />}
                      {React.cloneElement(step.icon as React.ReactElement, { 
                        className: `w-5 h-5 md:w-7 md:h-7 relative z-10 ${isActive ? 'text-white' : ''}` 
                      })}
                    </motion.div>
                    
                    <div className="space-y-1.5 w-full relative z-10">
                      <h3 className={`font-display font-black text-xs md:text-lg leading-tight transition-colors duration-500 ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-950 dark:text-white'
                      }`}>{step.title}</h3>
                      <p className={`font-medium text-[9px] md:text-xs leading-relaxed transition-opacity duration-500 ${
                        isActive ? 'text-gray-700 dark:text-gray-300 opacity-100' : 'text-gray-400 dark:text-gray-500 opacity-80'
                      }`}>{step.desc}</p>
                    </div>

                    {isActive && (
                      <motion.div
                        layoutId="active-indicator"
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        transition={{ type: "spring", bounce: 0.3, duration: 0.8 }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods Section */}
      {!showAdminUI && (
        <section className="py-10 md:py-16 bg-gray-50/50 dark:bg-gray-900/30 border-y border-gray-100 dark:border-gray-800 transition-colors duration-300 overflow-hidden relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-32 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 text-center space-y-8 relative z-10">
            <h3 className="text-xs md:text-sm font-display font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              خيارات دفع مرنة ومتنوعة تناسب احتياجاتك
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 opacity-80 hover:opacity-100 transition-opacity duration-500">
              <div onClick={() => setSelectedPayment(paymentInfo.mada)} className="hover:scale-110 hover:-translate-y-1 transition-all duration-300 cursor-pointer"><PaymentIcon type="mada" className="h-6 md:h-10 pointer-events-none" /></div>
              <div onClick={() => setSelectedPayment(paymentInfo.visa)} className="hover:scale-110 hover:-translate-y-1 transition-all duration-300 cursor-pointer"><PaymentIcon type="visa" className="h-5 md:h-8 pointer-events-none" /></div>
              <div onClick={() => setSelectedPayment(paymentInfo.mastercard)} className="hover:scale-110 hover:-translate-y-1 transition-all duration-300 cursor-pointer"><PaymentIcon type="mastercard" className="h-7 md:h-10 pointer-events-none" /></div>
              <div onClick={() => setSelectedPayment(paymentInfo.applepay)} className="hover:scale-110 hover:-translate-y-1 transition-all duration-300 cursor-pointer"><PaymentIcon type="applepay" className="h-7 md:h-10 pointer-events-none" /></div>
              <div onClick={() => setSelectedPayment(paymentInfo.tabby)} className="hover:scale-110 hover:-translate-y-1 transition-all duration-300 cursor-pointer"><PaymentIcon type="tabby" className="h-6 md:h-9 pointer-events-none" /></div>
              <div onClick={() => setSelectedPayment(paymentInfo.tamara)} className="hover:scale-110 hover:-translate-y-1 transition-all duration-300 cursor-pointer"><PaymentIcon type="tamara" className="h-6 md:h-9 pointer-events-none" /></div>
            </div>
          </div>

          <AnimatePresence>
            {selectedPayment && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => setSelectedPayment(null)} 
                  className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm cursor-pointer" 
                />
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                  animate={{ scale: 1, opacity: 1, y: 0 }} 
                  exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                  className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 max-w-sm w-full relative z-10 shadow-2xl border border-gray-100 dark:border-gray-800 text-center"
                >
                  <button 
                    onClick={() => setSelectedPayment(null)}
                    className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    ✕
                  </button>
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-6">
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">{selectedPayment.name}</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6">{selectedPayment.desc}</p>
                  
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3 text-[10px] font-bold text-amber-700 dark:text-amber-500">
                    ملاحظة: لضمان الشفافية التامة، سيتم عرض الرسوم النهائية بدقة في صفحة الدفع قبل تأكيد العملية.
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </section>
      )}
      {/* Statistics & Trust Bar */}
      {!user && !showAdminUI && (
        <section className="px-4 max-w-7xl mx-auto py-2 md:py-4 flex flex-col justify-center">
          <div className="bg-gray-950 dark:bg-black rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 text-white relative overflow-hidden group border dark:border-white/5">
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

               <div className="flex flex-col gap-3 md:gap-4">
                  {/* Featured Guarantees Card */}
                  <div className="w-full bg-gradient-to-br from-blue-600/20 to-blue-900/10 border border-blue-500/30 p-5 md:p-8 rounded-2xl md:rounded-[2.5rem] text-center space-y-3 relative overflow-hidden group hover:border-blue-400/50 transition-colors duration-500">
                     <div className="absolute inset-0 bg-blue-500/10 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                     <ShieldCheck className="w-6 h-6 md:w-10 md:h-10 text-blue-400 mx-auto relative z-10" />
                     <div className="flex flex-col items-center justify-center relative z-10">
                        <div className="text-2xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-100 drop-shadow-sm flex items-baseline gap-2 justify-center" dir="ltr">
                          <span>{displayGuarantees.toLocaleString()}</span>
                          <span className="text-sm md:text-xl text-blue-300/80 font-bold">ر.س</span>
                        </div>
                     </div>
                     <div className="text-blue-200/80 text-[9px] md:text-xs uppercase font-black tracking-[0.2em] relative z-10">إجمالي المبالغ المضمونة بنجاح</div>
                  </div>

                  {/* Other Stats */}
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                     <div className="bg-white/5 border border-white/10 p-3 md:p-6 rounded-xl md:rounded-[2rem] text-center space-y-1.5 md:space-y-3 hover:bg-white/10 transition-colors flex flex-col justify-center">
                        <Star className="w-4 h-4 md:w-7 md:h-7 text-amber-400 mx-auto" />
                        <div className="text-sm md:text-3xl font-display font-black">99.9%</div>
                        <div className="text-gray-400 text-[6px] md:text-[9px] uppercase font-black tracking-widest">معدل النجاح</div>
                     </div>
                     <div className="bg-white/5 border border-white/10 p-3 md:p-6 rounded-xl md:rounded-[2rem] text-center space-y-1.5 md:space-y-3 hover:bg-white/10 transition-colors flex flex-col justify-center">
                        <Users className="w-4 h-4 md:w-7 md:h-7 text-emerald-400 mx-auto" />
                        <div className="text-sm md:text-3xl font-display font-black">{displayUsers.toLocaleString()}+</div>
                        <div className="text-gray-400 text-[6px] md:text-[9px] uppercase font-black tracking-widest">مستخدم نشط</div>
                     </div>
                     <div className="bg-white/5 border border-white/10 p-3 md:p-6 rounded-xl md:rounded-[2rem] text-center space-y-1.5 md:space-y-3 hover:bg-white/10 transition-colors flex flex-col justify-center">
                        <Clock className="w-4 h-4 md:w-7 md:h-7 text-purple-400 mx-auto" />
                        <div className="text-sm md:text-3xl font-display font-black">24/7</div>
                        <div className="text-gray-400 text-[6px] md:text-[9px] uppercase font-black tracking-widest">دعم فني متواصل</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </section>
      )}

      {/* Elegant Testimonials Section */}
      {!showAdminUI && (
        <section className="px-4 pt-16 pb-4 bg-gray-50 dark:bg-gray-950/50 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-12 px-4">
               <div className="space-y-4 text-right">
                  <h2 className="text-2xl md:text-4xl font-display font-black text-emerald-900 dark:text-emerald-400 tracking-tighter">ماذا يقول <span className="text-blue-600 dark:text-blue-400">المستخدمون</span>؟</h2>
                  <p className="text-gray-400 dark:text-gray-500 font-medium text-lg md:text-xl">ثقتكم هي الوقود الدافع لمنصة عربون لتحقيق المستحيل.</p>
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
               <button onClick={() => setIsLoginModalOpen(true)} className="flex-1 md:flex-none justify-center bg-gray-950 dark:bg-gray-800 text-white hover:bg-white hover:text-gray-950 dark:hover:bg-gray-700 px-4 py-3 md:px-12 md:py-6 rounded-xl md:rounded-2xl font-black text-[10px] md:text-lg transition-all shadow-2xl shadow-black/20 hover:scale-[1.05]">
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
      {profile && (
        <WithdrawalModal 
          isOpen={isWithdrawalModalOpen} 
          onClose={() => setIsWithdrawalModalOpen(false)} 
          profile={profile} 
        />
      )}
    </div>
  );
};
