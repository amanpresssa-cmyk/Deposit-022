import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ArrowLeftRight, CheckCircle, Search, Clock, MessageSquare, Star, LayoutGrid, Users, Briefcase, Lock, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, limit, getDocs, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { SellerCard } from '../components/SellerCard';
import { TestimonialSlider } from '../components/TestimonialSlider';
import { GeneralFeedbackForm } from '../components/GeneralFeedbackForm';

export const Home: React.FC = () => {
  const { login, user } = useAuth();
  const [featuredSellers, setFeaturedSellers] = React.useState<UserProfile[]>([]);
  const [homeCard, setHomeCard] = useState<any>(null);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [trustIndex, setTrustIndex] = useState(0);
  const navigate = useNavigate();

  const trustMessages = [
    { text: "الخيار الأول للتعاملات الآمنة", icon: <ShieldCheck className="w-4 h-4" /> },
    { text: "وساطة مالية ذكية وموثوقة", icon: <Lock className="w-4 h-4" /> },
    { text: "حقك محفوظ بأمان تام", icon: <CheckCircle className="w-4 h-4" /> },
    { text: "دفع إلكتروني معتمد 100%", icon: <Zap className="w-4 h-4" /> }
  ];

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
    const fetchSellers = async () => {
      try {
        setLoadingSellers(true);
        // Fetch real sellers with high potential (isVerified or High Rating)
        const q = query(
          collection(db, 'users'), 
          where('isSeller', '==', true),
          limit(12)
        );
        
        const snap = await getDocs(q);
        let sellers = snap.docs
          .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
          .filter(u => u.isBlocked !== true && u.displayName);
        
        // Custom sort logic:
        // 1. Featured sellers first
        // 2. Verified sellers next
        // 3. Then by rating (desc)
        // 4. Then by review count (desc)
        sellers.sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
          if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
          if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
          return (b.reviewsCount || 0) - (a.reviewsCount || 0);
        });

        setFeaturedSellers(sellers);
      } catch (e) {
        console.error("Error fetching featured sellers:", e);
      } finally {
        setLoadingSellers(false);
      }
    };
    fetchSellers();
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
      {/* Dynamic Hero Section */}
      <section className="relative pt-8 pb-12 overflow-hidden px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold ring-1 ring-blue-100 shadow-sm mb-4 min-w-[220px] justify-center h-9 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={trustIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2"
              >
                {trustMessages[trustIndex].icon}
                <span>{trustMessages[trustIndex].text}</span>
              </motion.div>
            </AnimatePresence>
          </div>
          <h1 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.1]">
            حقك محفوظ <br/> مع <span className="text-blue-600 relative inline-block">
              عربون
              <motion.div 
                className="absolute -bottom-2 left-0 right-0 h-2 bg-blue-100 -z-10 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed font-medium">
            المنصة السعودية الأولى لحفظ حقوق البائع والمشتري في الخدمات والسلع والوساطة المالية.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
              >
                لوحة التحكم
                <ArrowLeftRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
            ) : (
              <button
                onClick={login}
                className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
              >
                ابدأ رحلتك الآن
                <ArrowLeftRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
            )}
            <button
               onClick={() => navigate('/search')}
               className="bg-white text-gray-900 border-2 border-gray-100 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all"
            >
              استكشاف الخدمات
            </button>
          </div>
        </motion.div>

        {/* Floating Decorative Elements */}
        <div className="absolute top-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute top-40 -left-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

        {/* Payment Methods Trust Bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-16 border-t border-gray-50 pt-8"
        >
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">وسائل دفع آمنة ومعتمدة</p>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Mada_Logo.svg/512px-Mada_Logo.svg.png" alt="Mada" className="h-4 md:h-6 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Visa_2021.svg/512px-Visa_2021.svg.png" alt="Visa" className="h-3 md:h-5 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/512px-Mastercard-logo.svg.png" alt="Mastercard" className="h-6 md:h-8 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Apple_Pay_logo.svg/512px-Apple_Pay_logo.svg.png" alt="Apple Pay" className="h-5 md:h-7 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/512px-Google_Pay_Logo.svg.png" alt="Google Pay" className="h-4 md:h-6 object-contain" />
          </div>
        </motion.div>
      </section>

      {/* Quick Access Actions Grid */}
      <section className="px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: 'طلب وساطة', color: 'bg-emerald-50 text-emerald-600', icon: ShieldCheck, path: '/orders/create' },
            { title: 'البحث عن بائع', color: 'bg-blue-50 text-blue-600', icon: Search, path: '/search' },
            { title: 'أعمال التعقيب', color: 'bg-orange-50 text-orange-600', icon: Briefcase, path: '/search?category=تعقيب' },
            { title: 'إدارة الطلبات', color: 'bg-purple-50 text-purple-600', icon: Clock, path: '/dashboard' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(item.path)}
              className="group cursor-pointer bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-4 text-center"
            >
              <div className={`${item.color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
                <item.icon className="w-8 h-8" />
              </div>
              <span className="font-bold text-gray-900">{item.title}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Sellers - Mobile Grid/Scroll */}
      <section className="px-4 space-y-6">
        <div className="flex justify-between items-end">
          <div className="text-right w-full">
            <h2 className="text-xl font-black text-gray-900 leading-none">بائعين متميزين</h2>
            <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-tight">نخبة المعقبين والوسطاء الموثوقين الذين أثبتوا كفاءتهم</p>
          </div>
        </div>
        
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto pb-6 snap-x no-scrollbar -mx-4 px-4 scroll-smooth">
          {loadingSellers ? (
            // Skeleton Loading
            [1, 2, 3, 4].map(i => (
              <div key={i} className="min-w-[280px] md:min-w-0 h-64 bg-gray-50 animate-pulse rounded-[2rem] border border-gray-100" />
            ))
          ) : featuredSellers.length > 0 ? (
            featuredSellers.map(seller => (
              <motion.div 
                key={seller.uid} 
                className="min-w-[280px] md:min-w-0 snap-center"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <SellerCard seller={seller} />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 w-full">
               <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Users className="w-10 h-10 text-blue-200" />
               </div>
               <h3 className="font-bold text-gray-900 text-lg">بانتظار الباعة المتميزين الجدد</h3>
               <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">كن أول من يوثق حسابه ويظهر في واجهة المنصة لزيادة مبيعاتك.</p>
               <button 
                 onClick={() => navigate('/dashboard')}
                 className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-blue-100 hover:scale-105 transition-all"
               >
                 التوثيق كبائع متميز
               </button>
            </div>
          )}
        </div>
      </section>

      {/* Trust & Stats Section - COMPACT */}
      {!user && (
        <section className="px-4">
          <div className="bg-gray-900 rounded-[2rem] p-6 text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4 md:max-w-[60%]">
                <h2 className="text-lg md:text-2xl font-black leading-tight">انضم كبائع موثوق</h2>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  ابدأ رحلتك التجارية الآن واستقبل دفعاتك بأمان تام تحت مظلة "عربون".
                </p>
                <button onClick={() => navigate('/dashboard')} className="w-full md:w-auto bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-600 transition-all">
                   سجل مجاناً
                </button>
              </div>
              
              <div className="flex gap-3">
                {[
                  { label: 'عملية', val: '50K+', icon: ShieldCheck },
                  { label: 'ثقة', val: '4.9/5', icon: Star },
                ].map((stat, i) => (
                  <div key={i} className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                    <stat.icon className="w-4 h-4 text-blue-400 mb-2" />
                    <div className="text-lg font-black">{stat.val}</div>
                    <div className="text-slate-500 font-bold text-[8px] uppercase tracking-widest">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/20 rounded-full blur-[60px] -mr-20 -mt-10" />
          </div>
        </section>
      )}

      {/* How it Works - Horizontal Scroll / Mobile Grid */}
      <section className="px-4 space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-xl md:text-3xl font-black text-gray-900">كيف نضمن حقك؟</h2>
          <p className="text-[10px] md:text-sm text-gray-500 mt-2 font-bold uppercase tracking-wider">عملية بسيطة تضمن الشفافية والعدالة</p>
        </div>

        <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto pb-4 snap-x no-scrollbar -mx-4 px-4 relative pt-2">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-10 left-0 right-0 h-0.5 bg-gray-100 -z-10" />
          
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              className="min-w-[180px] md:min-w-0 snap-center relative flex flex-col items-center md:items-start text-center md:text-right space-y-3 bg-white p-4 rounded-3xl border border-gray-50 shadow-sm"
            >
              <div className="w-10 h-10 rounded-2xl bg-gray-50 border-2 border-white shadow-sm flex items-center justify-center text-base font-black text-blue-600 relative z-10">
                {step.icon}
              </div>
              <div className="space-y-1.5 flex-1 w-full">
                <h3 className="font-bold text-sm text-gray-900 leading-none">{step.title}</h3>
                <p className="text-gray-500 text-[10px] md:text-xs font-medium leading-relaxed line-clamp-3">{step.desc}</p>
              </div>
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xs border-2 border-white shadow-md z-10">
                {idx + 1}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-8">
        <div className="bg-blue-50/50 rounded-3xl p-6 md:p-12 border border-blue-100/50">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-lg md:text-2xl font-black text-gray-900">تجارب المستخدمين</h2>
              <div className="flex justify-center gap-0.5 text-orange-400">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 md:w-5 md:h-5 fill-current" />)}
              </div>
            </div>
            <TestimonialSlider />
          </div>
        </div>
      </section>

      {/* App Download / CTA Final */}
      {!user && (
        <section className="px-4">
          <div className="bg-blue-600 rounded-[2rem] p-6 md:p-12 text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 md:space-y-4 md:max-w-[70%]">
                <h2 className="text-xl md:text-3xl font-black leading-tight text-right">جاهز لتجربة بيع وشراء؟</h2>
                <p className="text-xs md:text-sm text-blue-100 font-medium leading-relaxed text-right">
                  التحق بأكثر من 10 آلاف بائع ومشترٍ يثقون بعربون يومياً.
                </p>
              </div>
              <button 
                onClick={login}
                className="w-full md:w-auto bg-white text-blue-600 px-6 py-3 rounded-xl font-black text-sm hover:bg-gray-50 transition-all shadow-lg text-center"
              >
                أنشئ حسابك
              </button>
            </div>
            
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[60px] -mr-20 -mt-10" />
          </div>
        </section>
      )}

      {/* Feedback Form */}
      <section className="px-4 pt-12">
        <div className="max-w-xl mx-auto">
          <GeneralFeedbackForm />
        </div>
      </section>
    </div>
  );
};
