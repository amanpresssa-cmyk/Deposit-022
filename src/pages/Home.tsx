import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ArrowLeftRight, CheckCircle, Search, Clock, MessageSquare, Star, LayoutGrid, Users, Briefcase, Lock, Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, limit, getDocs, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Service } from '../types';
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

  const [featuredSellers, setFeaturedSellers] = React.useState<UserProfile[]>([]);
  const [liveOffers, setLiveOffers] = React.useState<Service[]>([]);
  const [homeCard, setHomeCard] = useState<any>(null);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [trustIndex, setTrustIndex] = useState(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const trustMessages = [
    { text: showAdminUI ? "أهلاً بك في نظام الإدارة" : "الخيار الأول للتعاملات الآمنة", icon: <ShieldCheck className="w-4 h-4" /> },
    { text: showAdminUI ? "تتبع العمليات والمنازعات بدقة" : "وساطة مالية ذكية وموثوقة", icon: <Lock className="w-4 h-4" /> },
    { text: showAdminUI ? "إدارة الأعضاء والطلبات بسهولة" : "حقك محفوظ بأمان تام", icon: <CheckCircle className="w-4 h-4" /> },
    { text: showAdminUI ? "تقارير مالية تفصيلية ولحظية" : "دفع إلكتروني معتمد 100%", icon: <Zap className="w-4 h-4" /> }
  ];

  useEffect(() => {
    if (isAdmin && !isViewingAsUser) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, isViewingAsUser, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTrustIndex((prev) => (prev + 1) % trustMessages.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'home_card'), (doc) => {
      if (doc.exists()) {
        setHomeCard(doc.data());
      }
    }, (error) => {
      console.warn('Could not load home_card:', error);
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    // Live Users/Sellers
    const sellersQ = query(
      collection(db, 'users'), 
      where('isSeller', '==', true),
      limit(12)
    );
    
    const unsubSellers = onSnapshot(sellersQ, (snap) => {
      let sellers = snap.docs
        .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
        .filter(u => u.isBlocked !== true && u.displayName);
      
      sellers.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
        if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
        return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      });

      setFeaturedSellers(sellers);
      setLoadingSellers(false);
    }, (error) => {
      console.error("Error fetching featured sellers:", error);
      setLoadingSellers(false);
    });

    // Live Offers
    const offersQ = query(
      collection(db, 'services'), 
      where('isActive', '!=', false),
      limit(6)
    );
    
    const unsubOffers = onSnapshot(offersQ, (snap) => {
      const offers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setLiveOffers(offers);
      setLoadingOffers(false);
    }, (error) => {
      console.error("Error fetching live offers:", error);
      setLoadingOffers(false);
    });

    return () => {
      unsubSellers();
      unsubOffers();
    };
  }, []);

  const steps = [
    {
      title: 'اتفاق الطرفين',
      desc: 'يتفق العميل والبائع على تفاصيل الخدمة أو المنتج والسعر.',
      icon: <MessageSquare className="w-6 h-6 text-blue-500" />
    },
    {
      title: 'حجز المبلغ',
      desc: 'يقوم العميل بتحويل المبلغ لمنصة عربون ليتم حجزه بأمان.',
      icon: <Clock className="w-6 h-6 text-orange-500" />
    },
    {
      title: 'تنفيذ الخدمة',
      desc: 'يبدأ البائع بتنفيذ العمل المطلوب بكل طمأنينة.',
      icon: <ArrowLeftRight className="w-6 h-6 text-purple-500" />
    },
    {
      title: 'استلام وتحرير',
      desc: 'بعد موافقة العميل، يتم تحرير المبلغ للبائع فوراً.',
      icon: <CheckCircle className="w-6 h-6 text-green-500" />
    }
  ];

  return (
    <div className="space-y-16 pb-20 overflow-x-hidden">
      {/* Redesigned Premium Hero Section */}
      <section className="relative pt-12 pb-24 overflow-hidden px-4">
        {/* Advanced Background Layers */}
        <div className="absolute inset-0 -z-20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px]" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-5xl mx-auto text-center space-y-8 md:space-y-10"
        >
          {/* Enhanced Trust Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/40 backdrop-blur-xl border border-white/40 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/5 min-w-[260px] md:min-w-[280px] justify-center h-10 md:h-12 italic overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={trustIndex}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, ease: "circOut" }}
                  className="flex items-center gap-3"
                >
                  <div className="p-1.5 bg-blue-600/10 rounded-lg">
                    {React.cloneElement(trustMessages[trustIndex].icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
                  </div>
                  <span>{trustMessages[trustIndex].text}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-8xl font-black text-gray-950 tracking-tighter leading-[0.95] italic">
              حقك محفوظ <br/> 
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-700 via-blue-500 to-blue-400 relative">
                مع عربون
                <motion.div 
                  className="absolute -bottom-2 right-0 h-2 bg-blue-100 -z-10 rounded-full"
                  initial={{ width: 0 }}
                  whileInView={{ width: '100%' }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6, duration: 1 }}
                />
              </span>
            </h1>
            
            <p className="text-base md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-bold tracking-tight opacity-80 italic">
              المنصة السعودية <span className="text-gray-900 underline decoration-blue-500/30 decoration-4 underline-offset-8">الأولى</span> لحفظ حقوق البائع والمشتري في الخدمات والسلع والوساطة المالية.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 md:gap-6 pt-4 md:pt-6">
            {user ? (
              <button
                onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}
                className={`
                  relative overflow-hidden w-full sm:w-auto
                  ${showAdminUI ? 'bg-red-600 shadow-red-200' : 'bg-gray-950 shadow-gray-200'}
                  text-white px-8 md:px-12 py-5 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-base md:text-lg shadow-2xl transition-all 
                  hover:scale-[1.03] active:scale-95 group flex items-center justify-center gap-3
                `}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative z-10 text-center">{showAdminUI ? 'لوحة الإدارة' : 'ابدأ التداول الآمن'}</span>
                <ArrowLeftRight className="w-5 h-5 relative z-10 opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-blue-600 text-white px-8 md:px-12 py-5 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-lg md:text-xl hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-4 group w-full sm:w-auto"
              >
                انضم إلينا الآن
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </div>
              </button>
            )}
            {!showAdminUI && (
              <button
                 onClick={() => navigate('/search')}
                 className="group bg-white text-gray-950 border border-gray-100 px-8 md:px-10 py-5 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-base md:text-lg hover:bg-gray-50 transition-all hover:border-gray-200 flex items-center justify-center gap-3 w-full sm:w-auto"
              >
                <span>استكشاف الخدمات</span>
                <Search className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Enhanced Trust Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-20 md:mt-32 max-w-5xl mx-auto"
        >
          <div className="relative group p-8 md:p-12 bg-white/40 backdrop-blur-2xl rounded-[3rem] md:rounded-[4rem] border border-white/60 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-blue-50/10 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center gap-8">
              <div className="flex items-center gap-4">
                <div className="h-px w-12 md:w-20 bg-gradient-to-r from-transparent to-gray-200" />
                <p className="text-[10px] md:text-xs text-gray-500 font-black uppercase tracking-[0.3em] italic text-center">بنية تحتية آمنة للمدفوعات</p>
                <div className="h-px w-12 md:w-20 bg-gradient-to-l from-transparent to-gray-200" />
              </div>
              
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 group-hover:opacity-100 transition-all duration-1000 grayscale group-hover:grayscale-0">
                <PaymentIcon type="mada" className="h-8 md:h-11 transition-all hover:scale-110" />
                <PaymentIcon type="visa" className="h-5 md:h-8 transition-all hover:scale-110" />
                <PaymentIcon type="mastercard" className="h-8 md:h-11 transition-all hover:scale-110" />
                <PaymentIcon type="applepay" className="h-8 md:h-11 transition-all hover:scale-110" />
                <PaymentIcon type="stcpay" className="h-5 md:h-8 transition-all hover:scale-110" />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Refined Quick Access Bento Grid */}
      {!showAdminUI && (
        <section className="px-4 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { title: 'طلب وساطة', color: 'bg-emerald-500/10 text-emerald-600', icon: ShieldCheck, path: '/orders/create', desc: 'ابدأ صفقة آمنة' },
              { title: 'البحث عن بائع', color: 'bg-blue-500/10 text-blue-600', icon: Search, path: '/search', desc: 'نجد لك الأفضل' },
              { title: 'أعمال التعقيب', color: 'bg-orange-500/10 text-orange-600', icon: Briefcase, path: '/search?category=تعقيب', desc: 'خدمات إدارية' },
              { title: 'إدارة الطلبات', color: 'bg-purple-500/10 text-purple-600', icon: Clock, path: '/dashboard', desc: 'تتبع عملياتك' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8, shadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                onClick={() => navigate(item.path)}
                className="group cursor-pointer bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all flex flex-col items-center gap-5 text-center relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 -mr-12 -mt-12 group-hover:bg-blue-50 transition-colors duration-500" />
                <div className={`${item.color} p-5 rounded-2xl group-hover:scale-110 transition-transform relative z-10`}>
                  <item.icon className="w-8 h-8" />
                </div>
                <div className="relative z-10 space-y-1">
                  <span className="font-black text-gray-950 block text-lg italic tracking-tight">{item.title}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.desc}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Modern Live Marketplace Section */}
      {!showAdminUI && (
        <section className="py-20 md:py-32 relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 md:gap-10 mb-12 md:mb-20">
               <div className="text-right space-y-4">
                  <div className="flex items-center gap-3 justify-end">
                     <div className="flex -space-x-2 rtl:space-x-reverse">
                       {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-blue-100" />)}
                     </div>
                     <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] italic">نبض السوق</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-gray-950 tracking-tighter italic">سوق <span className="text-blue-600 italic">مباشر</span> للمهام</h2>
                  <p className="text-gray-400 font-bold max-w-xl text-lg md:text-xl leading-snug">عشرات الصفقات المتاحة الآن للبدء الفوري مع ضمان كامل لمستحقاتك المالية.</p>
               </div>
               <Link to="/search" className="group flex items-center justify-center gap-4 bg-gray-950 text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black text-sm hover:bg-blue-600 transition-all shadow-2xl shadow-gray-200 shrink-0">
                  <span>استكشف المنصة</span>
                  <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </div>
               </Link>
            </div>

            {loadingOffers ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 bg-gray-50 rounded-[3rem] animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : liveOffers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                 {liveOffers.map((offer) => (
                    <motion.div
                       key={offer.id}
                       initial={{ opacity: 0, y: 30 }}
                       whileInView={{ opacity: 1, y: 0 }}
                       viewport={{ once: true }}
                       onClick={() => navigate(`/seller/${offer.sellerId}`)}
                       className="bg-gray-50/50 rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 border border-gray-100 hover:bg-white hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] transition-all duration-700 cursor-pointer group flex flex-col h-full hover:border-blue-100/50 relative overflow-hidden"
                    >
                       <div className="flex justify-between items-start mb-6 md:mb-8">
                          <div className="space-y-3 md:space-y-4">
                            <span className="inline-block px-3 py-1.5 bg-white text-blue-600 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest border border-blue-50 shadow-sm">
                              {offer.category}
                            </span>
                            <h3 className="text-xl md:text-2xl font-black text-gray-950 group-hover:text-blue-600 transition-colors italic leading-none">{offer.title}</h3>
                          </div>
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-green-500 shadow-sm group-hover:border-green-100 group-hover:bg-green-50 transition-all">
                             <Zap className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                          </div>
                       </div>
                       
                       <p className="text-gray-400 font-bold text-xs md:text-sm leading-relaxed mb-8 md:mb-10 opacity-70 line-clamp-3">{offer.description}</p>
                       
                       <div className="mt-auto pt-6 md:pt-8 border-t border-gray-100 flex items-end justify-between">
                          <div>
                            <p className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1 italic">الميزانية المطروحة</p>
                            <div className="text-2xl md:text-3xl font-black text-gray-950 italic">
                               {offer.price} <span className="text-xs md:text-sm opacity-30">SAR</span>
                            </div>
                          </div>
                          <div className="px-5 md:px-6 py-2.5 md:py-3 bg-gray-950 text-white rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 transition-all whitespace-nowrap">
                             التفاصيل
                          </div>
                       </div>
                    </motion.div>
                 ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-gray-50/50 rounded-[4rem] border-2 border-dashed border-gray-100 italic font-black text-gray-300">
                <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-10" />
                لا توجد عروض مباشرة متاحة حالياً
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Sellers - High Impact Grid */}
      {!showAdminUI && (
        <section className="py-20 md:py-32 bg-gray-50 relative overflow-hidden">
          {/* Background Detail */}
          <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-40">
             <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 relative z-10">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 md:gap-10 mb-12 md:mb-20">
               <div className="text-right space-y-4">
                  <div className="flex items-center gap-3 justify-end">
                     <ShieldCheck className="w-5 h-5 text-blue-600" />
                     <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] italic leading-none">شبكة خبراء موثقة</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-gray-950 tracking-tighter italic">نخبة <span className="text-blue-600">الخبراء</span> والموثوقين</h2>
                  <p className="text-gray-400 font-bold max-w-xl text-lg md:text-xl leading-snug">أعضاء أتموا بنجاح اختبارات الأمان والالتزام الكامل بميثاق عربون لضمان حقوق الجميع.</p>
               </div>
            </div>
            
            <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 overflow-x-auto pb-12 snap-x no-scrollbar -mx-4 px-4 scroll-smooth">
              {loadingSellers ? (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className="min-w-[280px] md:min-w-0 h-[400px] md:h-[450px] bg-white rounded-[2.5rem] md:rounded-[3rem] border border-gray-100 animate-pulse" />
                ))
              ) : featuredSellers.length > 0 ? (
                featuredSellers.map(seller => (
                  <motion.div 
                    key={seller.uid} 
                    className="min-w-[280px] md:min-w-0 snap-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -10 }}
                  >
                    <SellerCard seller={seller} />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 md:py-32 text-center bg-white rounded-[2.5rem] md:rounded-[4rem] border border-gray-100 w-full shadow-2xl shadow-gray-100/50">
                   <div className="w-16 h-16 md:w-24 md:h-24 bg-blue-50 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center mx-auto mb-6 md:mb-8 rotate-12 group-hover:rotate-0 transition-transform">
                     <Users className="w-8 h-8 md:w-12 md:h-12 text-blue-200" />
                   </div>
                   <h3 className="font-black text-gray-950 text-2xl md:text-3xl italic tracking-tighter mb-4">بانتظار انضمامك للنخبة</h3>
                   <p className="text-gray-400 font-bold text-base md:text-lg max-w-sm mx-auto mb-8 md:mb-10 leading-relaxed opacity-70 italic">كن جزءاً من منصة "عربون" وقم بتوثيق حسابك لتظهر كخيار أول لآلاف العملاء يومياً.</p>
                   <button 
                     onClick={() => navigate('/dashboard')}
                     className="bg-gray-950 text-white px-8 md:px-12 py-4 md:py-6 rounded-2xl font-black text-xs md:text-sm shadow-2xl shadow-gray-200 hover:scale-[1.03] active:scale-95 transition-all"
                   >
                     ابدأ إجراءات التوثيق
                   </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Modern Trust & Statistics Bento Section */}
      {!user && !showAdminUI && (
        <section className="px-4 max-w-7xl mx-auto py-8 md:py-12">
          <div className="bg-gray-950 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-20 text-white relative overflow-hidden group">
            {/* Visual Flare */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -mr-64 -mt-64 group-hover:bg-blue-600/20 transition-colors duration-1000" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -ml-20 -mb-20" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 md:gap-16">
              <div className="space-y-6 md:space-y-8 text-right lg:max-w-[55%]">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">
                   <ShieldCheck className="w-4 h-4" />
                   شفافية وموثوقية
                </div>
                <h2 className="text-3xl md:text-6xl font-black leading-[1.05] italic tracking-tighter">انضم إلى مجتمع <br/><span className="text-blue-500">التجارة الآمنة</span></h2>
                <p className="text-base md:text-xl text-slate-400 font-bold leading-relaxed italic opacity-80">
                  سواء كنت باحثاً عن خدمة أو مقدم حلول، "عربون" هي شريكك التقني الأول لضمان نزاهة التعاملات وتحصيل الحقوق دون قلق.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button 
                    onClick={() => navigate('/dashboard')} 
                    className="group bg-blue-600 text-white px-8 md:px-10 py-4 md:py-5 rounded-[1.2rem] md:rounded-[1.5rem] font-black text-sm md:text-base hover:bg-blue-700 transition-all flex items-center justify-center gap-3 w-full sm:w-auto"
                  >
                    سجل حسابك مجاناً
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                  </button>
                  <button 
                    onClick={() => navigate('/how-it-works')} 
                    className="bg-white/5 border border-white/10 text-white px-8 md:px-10 py-4 md:py-5 rounded-[1.2rem] md:rounded-[1.5rem] font-black text-sm md:text-base hover:bg-white/10 transition-all w-full sm:w-auto"
                  >
                    اعرف المزيد
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 md:gap-6 w-full lg:w-auto">
                {[
                  { label: 'عملية وساطة', val: '50K+', icon: ShieldCheck, color: 'text-blue-400' },
                  { label: 'مؤشر الثقة', val: '4.9/5', icon: Star, color: 'text-orange-400' },
                  { label: 'بائع نشط', val: '12K+', icon: Users, color: 'text-emerald-400' },
                  { label: 'ضمان حقوق', val: '100%', icon: Lock, color: 'text-indigo-400' },
                ].map((stat, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white/5 border border-white/10 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] backdrop-blur-xl hover:bg-white/10 transition-colors flex flex-col items-center md:items-end text-center md:text-right"
                  >
                    <stat.icon className={`w-6 h-6 md:w-8 md:h-8 ${stat.color} mb-4 md:mb-6`} />
                    <div className="text-2xl md:text-4xl font-black mb-1 italic">{stat.val}</div>
                    <div className="text-slate-500 font-black text-[8px] md:text-[10px] uppercase tracking-widest leading-none">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sophisticated How it Works Section */}
      {!showAdminUI && (
        <section className="py-24 px-4 bg-white">
          <div className="max-w-7xl mx-auto space-y-20">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest italic">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                بروتوكول العمل
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-950 tracking-tighter italic">كيف نضمن <span className="text-blue-600">حقك</span>؟</h2>
              <p className="text-gray-400 font-bold max-w-xl mx-auto text-lg leading-relaxed opacity-70 italic">أربع خطوات بسيطة تفصلك عن تجربة تداول رقمية آمنة بنسبة 100%.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Connecting line for desktop */}
              <div className="hidden lg:block absolute top-[40%] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent -z-10" />
              
              {steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15 }}
                  className="relative group bg-gray-50/50 p-8 rounded-[3rem] border border-gray-100 hover:bg-white hover:shadow-2xl transition-all duration-500 text-center md:text-right"
                >
                  <div className="absolute -top-4 -right-4 w-10 h-10 bg-gray-950 text-white rounded-2xl flex items-center justify-center font-black text-xs border-4 border-white shadow-xl z-20 group-hover:scale-110 transition-transform">
                    {idx + 1}
                  </div>
                  
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white border border-gray-100 shadow-sm flex items-center justify-center mx-auto md:mr-0 mb-6 group-hover:scale-110 transition-transform bg-gradient-to-br from-white to-gray-50/50">
                    {step.icon}
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-black text-xl text-gray-950 italic leading-none">{step.title}</h3>
                    <p className="text-gray-400 font-bold text-sm leading-relaxed opacity-80">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Elegant Testimonials Section */}
      {!showAdminUI && (
        <section className="px-4 py-8 md:py-12">
          <div className="max-w-7xl mx-auto bg-gray-950 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] -mr-32 -mt-32" />
            
            <div className="relative z-10 space-y-8 md:space-y-12">
              <div className="text-center space-y-3 md:space-y-4">
                <h2 className="text-2xl md:text-4xl font-black text-white italic tracking-tighter">ماذا يقول <span className="text-blue-500">شركاؤنا</span>؟</h2>
                <div className="flex justify-center gap-1.5 text-orange-400">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3 md:w-4 h-3 md:h-4 fill-current" />)}
                </div>
              </div>
              <div className="max-w-4xl mx-auto">
                <TestimonialSlider />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* High-Impact Final CTA */}
      {!user && !showAdminUI && (
        <section className="px-4 py-8 md:py-12 max-w-7xl mx-auto">
          <div className="bg-blue-600 rounded-[2.5rem] md:rounded-[4rem] p-10 md:p-24 text-white relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center text-center gap-8 md:gap-10">
              <div className="space-y-3 md:space-y-4 max-w-2xl">
                <h2 className="text-3xl md:text-7xl font-black leading-none italic tracking-tighter">جاهز لتجربة <br/> بيع وشراء حقيقية؟</h2>
                <p className="text-base md:text-xl text-blue-100 font-bold leading-relaxed opacity-80 italic">
                  انضم لأكثر من 10 آلاف مستخدم يعتمدون على عربون كطرف ثالث موثوق لحماية أموالهم وأعمالهم.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6 w-full sm:w-auto">
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-gray-950 text-white px-10 md:px-12 py-5 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-base md:text-lg hover:bg-white hover:text-gray-950 transition-all shadow-2xl shadow-black/20 hover:scale-[1.05] w-full"
                >
                  أنشئ حسابك المجاني
                </button>
                <div className="flex items-center justify-center gap-4 text-white/60 font-bold text-xs md:text-sm italic">
                   <div className="w-8 md:w-12 h-0.5 bg-white/20" />
                   تحتاج مساعدة؟
                   <Link to="/help" className="text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-all">تحدث معنا</Link>
                </div>
              </div>
            </div>
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full blur-[100px] -ml-40 -mb-40" />
          </div>
        </section>
      )}

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* Feedback Form */}
      {!showAdminUI && (
        <section className="px-4 pt-12">
          <div className="max-w-xl mx-auto">
            <GeneralFeedbackForm />
          </div>
        </section>
      )}
    </div>
  );
};
