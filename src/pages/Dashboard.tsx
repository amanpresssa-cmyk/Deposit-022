import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, AlertCircle, MessageCircle, ArrowLeft, Plus, ShieldCheck, Wallet, ChevronRight, Briefcase, Globe, ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { IdentityVerification } from '../components/IdentityVerification';
import { TrustProgressBar } from '../components/TrustProgressBar';

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIdentityVerify, setShowIdentityVerify] = useState(false);
  const [isUpdatingSeller, setIsUpdatingSeller] = useState(false);
  const [editSpecialties, setEditSpecialties] = useState(false);
  const [newBio, setNewBio] = useState(profile?.bio || '');
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
        trustLevel: (profile?.trustLevel || 0)
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

      const qSellerEmail = query(
        collection(db, 'orders'),
        where('sellerEmail', '==', user.email),
        orderBy('createdAt', 'desc')
      );

      const unsubBuyer = onSnapshot(qBuyer, (snapshot) => {
        const buyerOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(prev => {
          const others = prev.filter(o => o.sellerId === user.uid || o.sellerEmail === user.email);
          const combined = [...buyerOrders, ...others].sort((a, b) => 
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
          );
          // Deduplicate by ID
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders (buyer)');
      });

      const unsubSeller = onSnapshot(qSeller, (snapshot) => {
        const sellerOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(prev => {
          const others = prev.filter(o => o.buyerId === user.uid || o.sellerEmail === user.email);
          const combined = [...sellerOrders, ...others].sort((a, b) => 
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
          );
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders (seller)');
      });

      const unsubSellerEmail = onSnapshot(qSellerEmail, (snapshot) => {
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">مرحباً بك في لوحة التحكم</h1>
          <p className="text-gray-500 mt-1">تتبع كافة طلباتك وحالة الضمان المالي.</p>
        </div>
        <button
          onClick={() => navigate('/create-order')}
          className="flex items-center gap-2 bg-[#2563eb] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1d4ed8] transition-all shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>رفع طلب جديد</span>
        </button>
      </div>

      {!profile?.isVerified && (
        <div className="grid md:grid-cols-3 gap-8">
           <div className="md:col-span-2">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-xl shadow-blue-100"
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="bg-white/20 p-5 rounded-[2rem] backdrop-blur-md border border-white/10">
                      <ShieldCheck className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black mb-2">وثّق هويتك لزيادة أمانك</h2>
                      <p className="text-blue-100 opacity-90 max-w-md font-medium">
                         التوثيق بالهوية الوطنية يمنحك الأولوية في معالجة الطلبات ويزيد من مستوى الثقة في حسابك.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowIdentityVerify(true)}
                    className="bg-white text-blue-600 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all flex items-center gap-2 whitespace-nowrap shadow-xl"
                  >
                    بدء عملية التوثيق الشامل
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
              </motion.div>
           </div>
           <div>
              <TrustProgressBar level={profile?.trustLevel || 0} />
           </div>
        </div>
      )}

      {profile?.isVerified && !profile?.isSeller && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border-2 border-blue-100 rounded-[2.5rem] p-10 shadow-sm overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
              <Briefcase className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-4">انتقل لمستوى "المعقب المعتمد"</h2>
            <p className="text-gray-500 mb-10 text-lg leading-relaxed">
              بصفتك معقب، يمكنك الآن تفعيل حسابك كبائع لبدء استقبال طلبات التعميد والوساطة. ستحصل على صفحة مبيعات خاصة وتقييمات ترفع من قيمتك السوقية.
            </p>
            
            <div className="space-y-6 text-right mb-10">
              <p className="font-black text-gray-700 mb-2">اختر تخصصاتك الرئيسية:</p>
              <div className="flex flex-wrap justify-end gap-3">
                {specialtiesList.map(s => (
                  <button 
                    key={s}
                    onClick={() => handleUpdateProfile([s])}
                    className="px-6 py-3 bg-gray-50 hover:bg-blue-600 hover:text-white rounded-2xl font-bold transition-all border border-gray-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => handleUpdateProfile(['عام'])}
              disabled={isUpdatingSeller}
              className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
            >
              {isUpdatingSeller ? 'جاري التفعيل...' : 'تفعيل وضع البائع الآن'}
            </button>
          </div>
        </motion.div>
      )}

      {profile?.isSeller && (
        <div className="bg-white rounded-[2.5rem] p-8 border border-blue-50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-6">
             <div className="bg-blue-50 p-5 rounded-[2rem]">
               <Globe className="w-10 h-10 text-blue-600" />
             </div>
             <div>
               <h3 className="text-2xl font-black text-gray-900">موقعك الشخصي جاهز!</h3>
               <p className="text-gray-500">يمكنك الآن مشاركة رابط ملفك الشخصي مع عملائك خارج المنصة.</p>
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
      )}

      {showIdentityVerify && (
        <IdentityVerification 
          onClose={() => {
            setShowIdentityVerify(false);
            window.location.reload();
          }} 
        />
      )}

      <div className="grid md:grid-cols-3 gap-6">
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
            <p className="text-sm font-medium text-gray-500">طلبات مكتملة</p>
            <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === 'completed').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-red-50 p-3 rounded-xl text-red-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">نزاعات حالية</p>
            <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === 'disputed').length}</p>
          </div>
        </div>
      </div>

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
    </div>
  );
};
