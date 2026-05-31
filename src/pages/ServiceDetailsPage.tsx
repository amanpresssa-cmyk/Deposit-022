import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order, UserProfile } from '../types';
import { motion } from 'motion/react';
import { 
  Shield, 
  ArrowRight, 
  Star, 
  Calendar, 
  CheckCircle2, 
  Share2, 
  AlertCircle,
  MessageCircle,
  CreditCard,
  User,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { calculateOrderFees } from '../lib/payment-utils';
import { LoginModal } from '../components/auth/LoginModal';
import { sendNotification } from '../lib/notificationService';

export const ServiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [service, setService] = useState<Order | null>(null);
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        const serviceDoc = await getDoc(doc(db, 'orders', id));
        if (serviceDoc.exists()) {
          const data = { id: serviceDoc.id, ...serviceDoc.data() } as Order;
          setService(data);

          // Fetch seller details
          const sellerDoc = await getDoc(doc(db, 'users', data.sellerId));
          if (sellerDoc.exists()) {
            setSeller(sellerDoc.data() as UserProfile);
          }
        } else {
          toast.error('الخدمة غير موجودة');
          navigate('/search');
        }
      } catch (err) {
        console.error('Error fetching service details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, navigate]);

  const handleStartOrder = async () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!service) return;

    if (user.uid === service.sellerId) {
      toast.error('لا يمكنك شراء خدمتك الخاصة');
      return;
    }

    setCreatingOrder(true);
    try {
      // Create a fresh order based on this service template
      const newOrder = {
        title: service.title,
        description: service.description,
        amount: service.amount,
        category: service.category,
        buyerId: user.uid,
        buyerEmail: user.email || '',
        sellerId: service.sellerId,
        sellerEmail: service.sellerEmail || '',
        status: 'pending',
        visibility: 'private', // User-specific orders are private
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Generate a highly recognizable, unique, and search-friendly Order ID (6-digit random numbers + exactly one letter)
      const generateOrderNumberId = () => {
        const numbers = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
        return `${numbers}${randomLetter}`; // e.g. "839204A"
      };

      const orderId = generateOrderNumberId();
      const docRef = doc(db, 'orders', orderId);
      await setDoc(docRef, newOrder);
      
      // Trigger automatic platform, push, and WhatsApp notifications to the seller
      try {
        await sendNotification(
          service.sellerId,
          '🔔 طلب جديد على خدمتك',
          `لقد قام العميل ${user?.displayName || 'مشتري'} بطلب خدمتك (${service.title}) بقيمة ${service.amount} ر.س. يرجى مراجعة تفاصيل الطلب والموافقة عليه للبدء.`,
          'order_update',
          'normal',
          docRef.id
        );
        console.log(`📡 Notification recorded in Firestore for seller ${service.sellerId}`);
      } catch (notifErr) {
        console.error("Failed to send catalog order notification:", notifErr);
      }

      toast.success('تم إنشاء الطلب بنجاح! ننتظر موافقة البائع.');
      navigate(`/order/${docRef.id}`);
    } catch (err) {
      console.error('Error starting order:', err);
      toast.error('حدث خطأ أثناء إنشاء الطلب');
    } finally {
      setCreatingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!service) return null;

  const fees = calculateOrderFees(service.amount, 'standard');
  const isOwner = user?.uid === service.sellerId;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 py-8" dir="rtl">
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      <div className="flex items-center gap-4 text-gray-400">
        <Link to="/search" className="hover:text-blue-600 transition-colors flex items-center gap-2 font-bold text-sm">
           <ArrowRight className="w-4 h-4" />
           العودة للبحث
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-xl shadow-blue-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
            
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100 italic">
                  {service.category}
                </span>
                {service.isVerified && (
                  <span className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-xs font-black uppercase tracking-widest border border-green-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    موثق آلياً
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight italic tracking-tight">
                {service.title}
              </h1>

              <div className="flex items-center gap-6 text-gray-400 font-bold mb-10 border-b border-gray-50 pb-8">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>نشر في {service.createdAt ? format(service.createdAt.toDate(), 'd MMM yyyy', { locale: ar }) : 'قريباً'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>{seller?.rating || 'جديد'} التقييم</span>
                </div>
              </div>

              <div className="prose prose-blue max-w-none">
                <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                  {service.description}
                </p>
              </div>
            </div>
          </div>

          {/* Why choose this? */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-gray-900 mb-1">دفع آمن بالضمان</h4>
                <p className="text-sm text-gray-500 leading-relaxed">أموالك في أمان حتى تستلم العمل وتوافق عليه بالكامل.</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-gray-900 mb-1">خيارات دفع متعددة</h4>
                <p className="text-sm text-gray-500 leading-relaxed">ادفع عبر مدى، فيزا، ماستركارد، آبل باي أو بالتقسيط عبر تابي/تمارا.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Order Box */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-2xl shadow-blue-900/5 sticky top-8">
            <div className="text-center mb-8">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 italic">تكلفة الخدمة الإجمالية</p>
              <h2 className="text-5xl font-black text-gray-900 italic tabular-nums tracking-tighter">
                {service.amount.toLocaleString()} 
                <span className="text-xl font-bold text-gray-400 ml-2">ر.س</span>
              </h2>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm font-bold p-4 bg-gray-50 rounded-2xl">
                <span className="text-gray-500">رسوم الوساطة الآمنة</span>
                <span className="text-blue-600 italic">3% شاملة الضريبة</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black p-4 border border-gray-100 rounded-2xl">
                <span className="text-gray-900">المجموع النهائي للدفع</span>
                <span className="text-gray-900">{(service.amount + (service.amount * 0.03)).toLocaleString()} ر.س</span>
              </div>
            </div>

            {isOwner ? (
              <button 
                onClick={() => navigate(`/settings`)}
                className="w-full bg-gray-950 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Zap className="w-5 h-5 text-amber-400" />
                إدارة هذه الخدمة
              </button>
            ) : (
              <button 
                onClick={handleStartOrder}
                disabled={creatingOrder}
                className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {creatingOrder ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    اطلب هذه الخدمة الآن
                  </>
                )}
              </button>
            )}

            <p className="text-[10px] text-gray-400 font-bold text-center mt-6 leading-relaxed">
              بالضغط على الطلب، فأنت توافق على <Link to="/terms" className="text-blue-500 underline">شروط استخدام</Link> منصة عربون وسياسة الوساطة.
            </p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h4 className="font-black text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              مقدم الخدمة
            </h4>
            
            <div className="flex items-center gap-4 mb-6">
              <img 
                src={seller?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller?.displayName || 'S')}&background=random`} 
                className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-50"
                alt=""
              />
              <div>
                <h5 className="font-black text-gray-900 italic">{seller?.displayName}</h5>
                <p className="text-xs text-gray-400 font-bold">{seller?.reviewsCount || 0} عملية مكتملة</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button className="flex items-center justify-center gap-2 py-3 bg-gray-50 rounded-xl text-xs font-black text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
                 <MessageCircle className="w-4 h-4" />
                 مراسلة
               </button>
               <Link to={`/seller/${service.sellerId}`} className="flex items-center justify-center gap-2 py-3 bg-gray-50 rounded-xl text-xs font-black text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all text-center">
                 الملف الشخصي
               </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
