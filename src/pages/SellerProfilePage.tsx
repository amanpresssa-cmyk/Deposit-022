import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Service, Review, Order } from '../types';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { 
  ShieldCheck, Star, MapPin, Calendar, MessageCircle, 
  Share2, ArrowRight, ExternalLink, Globe, LayoutGrid, 
  Info, Briefcase, ChevronLeft, Copy, Check 
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AddServiceModal } from '../components/AddServiceModal';

export const SellerProfilePage: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const { user, profile, login } = useAuth();
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'about' | 'reviews'>('services');
  const [stats, setStats] = useState({ completed: 0, failed: 0, disputed: 0, cancelled: 0, total: 0 });
  const [confidence, setConfidence] = useState(100);
  const [copied, setCopied] = useState(false);
  const [copiedServiceId, setCopiedServiceId] = useState<string | null>(null);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!sellerId) return;
      try {
        const sellerSnap = await getDoc(doc(db, 'users', sellerId));
        if (sellerSnap.exists()) {
          setSeller(sellerSnap.data() as UserProfile);
        }

        // Fetch user's orders to see if they've traded with this seller
        if (user) {
          try {
            const q1 = query(collection(db, 'orders'), where('buyerId', '==', user.uid));
            const q2 = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
            const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            const allOrders = [...s1.docs, ...s2.docs].map(d => ({ id: d.id, ...d.data() } as Order));
            const filteredOrders = allOrders.filter(o => o.sellerId === sellerId || o.buyerId === sellerId);
            setOrders(filteredOrders);
          } catch (queryErr) {
            console.warn("Index-free order load failed, trying direct query:", queryErr);
            const q1 = query(collection(db, 'orders'), where('buyerId', '==', user.uid), where('sellerId', '==', sellerId));
            const q2 = query(collection(db, 'orders'), where('buyerId', '==', sellerId), where('sellerId', '==', user.uid));
            const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            const userOrders = [...s1.docs, ...s2.docs].map(d => ({ id: d.id, ...d.data() } as Order));
            setOrders(userOrders);
          }
        }

        // Fetch services
        const servicesQuery = query(
          collection(db, 'services'),
          where('sellerId', '==', sellerId),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        );
        const servicesSnap = await getDocs(servicesQuery);
        setServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));

        // Fetch Stats - RESTRICTED TO PUBLIC FOR VISITORS
        const ordersQuery = query(
          collection(db, 'orders'),
          where('sellerId', '==', sellerId),
          where('visibility', '==', 'public')
        );
        const ordersSnap = await getDocs(ordersQuery);
        const ordersData = ordersSnap.docs.map(d => d.data());
        
        const completed = ordersData.filter(o => o.status === 'completed').length;
        const disputed = ordersData.filter(o => o.status === 'disputed').length;
        const cancelled = ordersData.filter(o => o.status === 'cancelled').length;
        const failed = disputed + cancelled;

        setStats({
          completed,
          failed,
          disputed,
          cancelled,
          total: ordersData.length
        });

        // Fetch reviews
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('revieweeId', '==', sellerId),
          orderBy('createdAt', 'desc')
        );
        const reviewsSnap = await getDocs(reviewsQuery);
        const allReviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
        
        // Calculate Confidence Level (Real Monitoring Engine)
        let score = 100;
        score -= (allReviews.filter(r => r.rating < 3).length * 10);
        score -= (disputed * 15);
        score -= (cancelled * 5);
        setConfidence(Math.max(10, score));

        // Shadow blocking: Hide low reviews from public, show only to author or admin
        const isAdmin = profile?.isAdmin || profile?.role === 'admin';
        const filteredReviews = allReviews.filter(r => {
          if (r.rating >= 4) return true;
          if (isAdmin) return true;
          if (user && r.reviewerId === user.uid) return true;
          return false;
        });
        setReviews(filteredReviews);

      } catch (error) {
        console.error("Error fetching seller profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [sellerId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const copyServiceLink = (e: React.MouseEvent, service: Service) => {
    e.stopPropagation();
    if (!seller) return;
    const url = `${window.location.origin}/create-order?email=${encodeURIComponent(seller.email || '')}&targetId=${sellerId}&title=${encodeURIComponent(service.title)}&amount=${service.price}&category=${encodeURIComponent(service.category)}`;
    navigator.clipboard.writeText(url);
    setCopiedServiceId(service.id);
    toast.success('تم نسخ رابط الشراء السريع');
    setTimeout(() => setCopiedServiceId(null), 2000);
  };

  const handleChat = async () => {
    if (!seller) return;

    if (!user) {
      toast.info('يرجى تسجيل الدخول أولاً لتتمكن من التواصل مع البائع');
      try {
        await login();
      } catch (err) {
        console.error("Login failed:", err);
      }
      return;
    }

    if (user.uid === sellerId) {
      toast.error('لا يمكنك التواصل مع نفسك كبائع');
      return;
    }
    
    // Check if we have an existing order with this seller
    const existingOrder = orders.find(o => o.sellerId === sellerId || o.buyerId === sellerId);
    
    if (existingOrder) {
      navigate(`/dashboard?tab=messages&orderId=${existingOrder.id}`);
    } else {
      // If no order, redirect to create order with targetId to automatically retrieve their verified contact details and initiate contact/negotiation
      navigate(`/create-order?email=${encodeURIComponent(seller.email || '')}&title=${encodeURIComponent('مناقشة مشروع جديد')}&targetId=${sellerId}`);
    }
  };

  const handleOrder = async (service?: Service) => {
    if (!seller) return;

    if (!user) {
      toast.info('يرجى تسجيل الدخول أولاً لتتمكن من طلب خدمة');
      try {
        await login();
      } catch (err) {
        console.error("Login failed:", err);
      }
      return;
    }

    if (user.uid === sellerId) {
      toast.error('لا يمكنك طلب خدمة من حسابك الخاص');
      return;
    }

    let url = `/create-order?email=${encodeURIComponent(seller.email || '')}&targetId=${sellerId}`;
    if (service) {
      url += `&title=${encodeURIComponent(service.title)}&amount=${service.price}&category=${encodeURIComponent(service.category)}`;
    }
    navigate(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">المستخدم غير موجود</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 font-bold">العودة للخلف</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header Profile Section */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-blue-100/20 overflow-hidden mb-12">
        <div className="h-80 bg-gradient-to-r from-blue-600 to-indigo-700 relative bg-cover bg-center" style={{ backgroundImage: seller.bannerUrl ? `url(${seller.bannerUrl})` : undefined }}>
          {seller.bannerUrl && <div className="absolute inset-0 bg-black/40" />}
          <div className="absolute top-8 left-8 flex gap-3 z-10">
            <button 
              onClick={handleShare}
              className="bg-white/20 backdrop-blur-md p-3 rounded-2xl hover:bg-white/30 transition-all flex items-center gap-2"
            >
              <Share2 className="w-6 h-6 text-white" />
              {copied && <span className="text-white text-sm font-bold">تم النسخ!</span>}
            </button>
          </div>
        </div>
        
        <div className="px-12 pb-12 relative">
          <div className="flex flex-col md:flex-row items-end gap-8 -mt-16 mb-8">
            <div className="relative">
              <img 
                src={seller.avatarUrl || seller.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.displayName)}&size=160&background=random`}
                alt={seller.displayName}
                className="w-40 h-40 rounded-[2.5rem] border-8 border-white object-cover shadow-lg bg-white"
                referrerPolicy="no-referrer"
              />
              {seller.isVerified && (
                <div className="absolute -bottom-2 -right-2 bg-blue-600 border-4 border-white rounded-full p-2">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-black text-gray-900">{seller.displayName}</h1>
                {(seller.isEliteSeller || seller.isFeatured) && (
                  <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse border border-orange-100 shadow-sm">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-wider">بائع متميز</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-6 text-gray-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <Star className="w-5 h-5 text-orange-400 fill-orange-400" />
                  <span className="text-gray-900 font-bold">{seller.rating.toFixed(1)}</span>
                  <span className="text-sm">({seller.reviewsCount} تقييم)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span>المملكة العربية السعودية</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span>انضم {format(seller.createdAt?.toDate?.() || new Date(), 'MMMM yyyy', { locale: ar })}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pb-4">
              {seller.websiteUrl && (
                <a 
                  href={seller.websiteUrl.startsWith('http') ? seller.websiteUrl : `https://${seller.websiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-blue-600 border-2 border-blue-100 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Globe className="w-6 h-6" />
                  زيارة الموقع الإلكتروني
                </a>
              )}
              
              <button 
                onClick={handleChat}
                className="bg-white text-gray-900 border-2 border-gray-100 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
              >
                <MessageCircle className="w-6 h-6 text-blue-600 pointer-events-none" />
                تواصل مع البائع
              </button>
              
              <button 
                onClick={() => handleOrder()}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-xl shadow-blue-100"
              >
                <Briefcase className="w-6 h-6 pointer-events-none" />
                اطلب خدمة الآن
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-4 border-t border-gray-100 pt-8 gap-8">
             <div className="md:col-span-3">
                <div className="flex gap-8 border-b border-gray-100 mb-8">
                  {[
                    { id: 'services', label: 'الخدمات المعروضة', icon: LayoutGrid },
                    { id: 'about', label: 'عن البائع', icon: Info },
                    { id: 'reviews', label: 'الآراء والتقييمات', icon: Star }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 pb-4 font-bold transition-all relative ${
                        activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="min-h-[400px]">
                  {activeTab === 'services' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {services.length > 0 ? services.map(service => (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={service.id}
                          onClick={() => handleOrder(service)}
                          className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:border-blue-100 transition-all group cursor-pointer"
                        >
                          <div className="h-48 bg-gray-50 relative overflow-hidden flex items-center justify-center">
                             {service.imageUrl ? (
                               <img 
                                 src={service.imageUrl} 
                                 className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" 
                                 referrerPolicy="no-referrer"
                                 alt=""
                               />
                             ) : service.externalUrl ? (
                               <div className="w-full h-full p-4 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50/30">
                                 <div className="bg-white/60 p-4 rounded-full mb-3 backdrop-blur-sm border border-white/40">
                                    <Globe className="w-8 h-8 text-blue-500" />
                                 </div>
                                 <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest mb-1">رابط المعاينة</p>
                                 <span className="text-[9px] font-mono text-gray-400 break-all text-center px-6 line-clamp-2">
                                   {service.externalUrl.replace('https://', '')}
                                 </span>
                               </div>
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-gray-300">
                                 <Briefcase className="w-12 h-12" />
                               </div>
                             )}
                             <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl font-bold text-blue-600 shadow-sm z-10 transition-transform group-hover:scale-105">
                               {service.price} ر.س
                             </div>
                          </div>
                          <div className="p-6">
                            <h3 className="font-bold text-xl mb-2 group-hover:text-blue-600 transition-colors">{service.title}</h3>
                            <p className="text-gray-500 text-sm mb-4 line-clamp-2">{service.description}</p>
                            <div className="flex items-center justify-between mt-4 border-t border-gray-50 pt-4">
                              <button 
                                onClick={(e) => copyServiceLink(e, service)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${copiedServiceId === service.id ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                              >
                                {copiedServiceId === service.id ? (
                                  <><Check className="w-3 h-3" /> تم النسخ</>
                                ) : (
                                  <><Copy className="w-3 h-3" /> نسخ الرابط للمشتري</>
                                )}
                              </button>
                              <button className="text-blue-600 font-bold flex items-center gap-1 text-sm bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all">
                                اطلب الآن
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )) : (
                        <div className="col-span-2 py-20 text-center bg-gray-50 rounded-[3rem]">
                           <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                           <h3 className="text-xl font-bold text-gray-400 mb-6">لا توجد خدمات معروضة حالياً</h3>
                           {user?.uid === sellerId && (
                             <button
                               onClick={() => setIsAddServiceModalOpen(true)}
                               className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                             >
                               إضافة خدمة جديدة
                             </button>
                           )}
                        </div>
                      )}
                      
                      {/* Show Add button even if there are services if owner */}
                      {services.length > 0 && user?.uid === sellerId && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => setIsAddServiceModalOpen(true)}
                          className="bg-blue-50/50 rounded-3xl border-2 border-dashed border-blue-200 overflow-hidden hover:bg-blue-50 hover:border-blue-300 transition-all group cursor-pointer flex flex-col items-center justify-center min-h-[300px]"
                        >
                           <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                           </div>
                           <h3 className="font-bold text-xl text-blue-600">إضافة خدمة جديدة</h3>
                           <p className="text-sm text-blue-400 mt-2">قم بنشر المزيد من خدماتك للعملاء</p>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {activeTab === 'about' && (
                    <div className="bg-gray-50 rounded-[3rem] p-10 space-y-8">
                       <div>
                         <h3 className="font-black text-2xl text-gray-900 mb-4">النبذة التعريفية</h3>
                         <p className="text-gray-600 leading-loose text-lg">
                           {seller.bio || 'لم يقم البائع حتى الآن بتحديث نبذته التعريفية.'}
                         </p>
                       </div>
                       <div>
                         <h3 className="font-black text-2xl text-gray-900 mb-4">التخصصات</h3>
                         <div className="flex flex-wrap gap-3">
                           {seller.specialties?.map(s => (
                             <span key={s} className="bg-white px-5 py-2.5 rounded-2xl border border-gray-100 font-bold text-gray-700 shadow-sm">
                               {s}
                             </span>
                           )) || <span className="text-gray-400">لا توجد تخصصات محددة</span>}
                         </div>
                       </div>
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div className="space-y-6">
                       {reviews.length > 0 ? reviews.map(review => (
                         <div key={review.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex gap-1 text-orange-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-5 h-5 ${i < review.rating ? 'fill-orange-400' : 'text-gray-200'}`} />
                                ))}
                              </div>
                              <span className="text-xs text-gray-400">
                                {format(review.createdAt?.toDate?.() || new Date(), 'dd MMMM yyyy', { locale: ar })}
                              </span>
                            </div>
                            <p className="text-gray-700 leading-relaxed font-medium">"{review.comment}"</p>
                         </div>
                       )) : (
                         <div className="py-20 text-center bg-gray-50 rounded-[3rem]">
                           <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                           <h3 className="text-xl font-bold text-gray-400">لا توجد تقييمات حتى الآن</h3>
                         </div>
                       )}
                    </div>
                  )}
                </div>
             </div>

             <div className="space-y-8">
                <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100">
                  <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6" />
                    توثيق البائع
                  </h3>
                  <div className="space-y-4">
                     <div className="flex items-center gap-3 bg-white/20 p-4 rounded-2xl">
                       <ShieldCheck className={`w-5 h-5 ${seller.isVerified ? 'text-green-300' : 'opacity-50'}`} />
                       <span className="font-bold">رقم الجوال موثق</span>
                     </div>
                     <div className="flex items-center gap-3 bg-white/20 p-4 rounded-2xl">
                       <ShieldCheck className="w-5 h-5 text-green-300" />
                       <span className="font-bold">البريد الإلكتروني موثق</span>
                     </div>
                  </div>
                </div>

                {stats.completed >= 5 && (
                  <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                      <Briefcase className="w-6 h-6 text-gray-400 pointer-events-none" />
                      إحصائيات العمل
                    </h3>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">إجمالي المبيعات</span>
                        <span className="font-black text-gray-900">{stats.total}+</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">نسبة النجاح</span>
                        <span className="font-black text-gray-900">
                          {stats.total > 0 ? Math.round((stats.completed / (stats.completed + stats.failed || 1)) * 100) : 100}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">مشاريع مكتملة</span>
                        <span className="font-black text-gray-900">{stats.completed}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2.5rem] p-8 text-white shadow-xl">
                   <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-blue-400" />
                    نظام الرقابة الذكي
                  </h3>
                  <div className="space-y-6">
                    <div className="text-center py-4 bg-white/5 rounded-3xl border border-white/10">
                      <p className="text-sm text-gray-400 mb-1">مستوى الثقة الحقيقي</p>
                      <div className="text-4xl font-black text-blue-400">
                        {confidence}%
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed text-center">
                      يتم حساب مستوى الثقة تلقائياً بناءً على جودة التنفيذ، سرعة التجاوب، وخلو المعاملات من النزاعات القانونية.
                    </p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Add Service Modal */}
      {user?.uid === sellerId && (
        <AddServiceModal 
          isOpen={isAddServiceModalOpen}
          onClose={() => setIsAddServiceModalOpen(false)}
          sellerId={sellerId}
        />
      )}
    </div>
  );
};
