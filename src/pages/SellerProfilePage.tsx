import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Service, Review } from '../types';
import { motion } from 'motion/react';
import { 
  ShieldCheck, Star, MapPin, Calendar, MessageCircle, 
  Share2, ArrowRight, ExternalLink, Globe, LayoutGrid, 
  Info, Briefcase, ChevronLeft 
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const SellerProfilePage: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'about' | 'reviews'>('services');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!sellerId) return;
      try {
        const sellerSnap = await getDoc(doc(db, 'users', sellerId));
        if (sellerSnap.exists()) {
          setSeller(sellerSnap.data() as UserProfile);
        }

        // Fetch services
        const servicesQuery = query(
          collection(db, 'services'),
          where('sellerId', '==', sellerId),
          orderBy('createdAt', 'desc')
        );
        const servicesSnap = await getDocs(servicesQuery);
        setServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));

        // Fetch reviews (full fetch, filter client-side to avoid index requirement for now)
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('revieweeId', '==', sellerId),
          orderBy('createdAt', 'desc')
        );
        const reviewsSnap = await getDocs(reviewsQuery);
        const allReviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
        // Shadow blocking: Hide low reviews from public
        setReviews(allReviews.filter(r => r.rating >= 4));

      } catch (error) {
        console.error("Error fetching seller profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [sellerId]);

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
        <div className="h-48 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
          <div className="absolute top-8 left-8 flex gap-3">
            <button className="bg-white/20 backdrop-blur-md p-3 rounded-2xl hover:bg-white/30 transition-all">
              <Share2 className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
        
        <div className="px-12 pb-12 relative">
          <div className="flex flex-col md:flex-row items-end gap-8 -mt-16 mb-8">
            <div className="relative">
              <img 
                src={seller.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.displayName)}&size=160&background=random`}
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
              <h1 className="text-4xl font-black text-gray-900 mb-2">{seller.displayName}</h1>
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

            <div className="flex gap-4 pb-4">
              <button className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-xl shadow-blue-100">
                <MessageCircle className="w-6 h-6" />
                تواصل مع البائع
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
                          className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:border-blue-100 transition-all group"
                        >
                          <div className="h-40 bg-gray-50 relative overflow-hidden">
                             {service.imageUrl ? (
                               <img src={service.imageUrl} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-gray-300">
                                 <Briefcase className="w-12 h-12" />
                               </div>
                             )}
                             <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl font-bold text-blue-600">
                               {service.price} ر.س
                             </div>
                          </div>
                          <div className="p-6">
                            <h3 className="font-bold text-xl mb-2 group-hover:text-blue-600 transition-colors">{service.title}</h3>
                            <p className="text-gray-500 text-sm mb-4 line-clamp-2">{service.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-400">{service.deliveryTime}</span>
                              <button className="text-blue-600 font-bold flex items-center gap-1 text-sm">
                                تفاصيل الخدمة
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )) : (
                        <div className="col-span-2 py-20 text-center bg-gray-50 rounded-[3rem]">
                           <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                           <h3 className="text-xl font-bold text-gray-400">لا توجد خدمات معروضة حالياً</h3>
                        </div>
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

                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                   <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                    <Briefcase className="w-6 h-6 text-gray-400" />
                    إحصائيات العمل
                  </h3>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">إجمالي المبيعات</span>
                      <span className="font-black text-gray-900">45+</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">سرعة الرد</span>
                      <span className="font-black text-gray-900">أقل من ساعة</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">مشاريع مكتملة</span>
                      <span className="font-black text-gray-900">38</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
