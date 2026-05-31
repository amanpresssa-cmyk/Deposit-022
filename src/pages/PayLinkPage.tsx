import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FileText, Clock, CheckCircle2, ChevronRight, Shield, AlertCircle } from 'lucide-react';
import { sendNotification, recordOrderEvent } from '../lib/notificationService';

export const PayLinkPage: React.FC = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<any>(null);
  const [sellerName, setSellerName] = useState('بائع مستقل');

  useEffect(() => {
    const fetchLink = async () => {
      if (!linkId) return;
      try {
        const linkRef = doc(db, 'payment_links', linkId);
        const snap = await getDoc(linkRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.status !== 'active') {
            setError('عذراً، هذا الرابط تم استخدامه لإنشاء طلب مسبقاً ولا يمكن استخدامه مرة أخرى.');
          } else {
            setLinkData(data);
            const sellerSnap = await getDoc(doc(db, 'users', data.sellerId));
            if (sellerSnap.exists()) {
              setSellerName(sellerSnap.data().displayName || 'بائع مستقل');
            }
          }
        } else {
          setError('رابط الفاتورة غير صحيح أو غير موجود.');
        }
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء جلب بيانات الفاتورة.');
      } finally {
        setLoading(false);
      }
    };
    fetchLink();
  }, [linkId]);

  const handleSubmit = async () => {
    if (!user || !linkData || !linkId) return;
    setSubmitting(true);
    try {
      // 1. Verify link is still active to prevent race conditions
      const linkRef = doc(db, 'payment_links', linkId);
      const snap = await getDoc(linkRef);
      if (snap.exists() && snap.data().status !== 'active') {
        throw new Error('تم استخدام هذا الرابط مؤخراً.');
      }

      // 2. Create the Order
      const newOrderId = Math.floor(10000000 + Math.random() * 90000000).toString();
      const orderRef = doc(db, 'orders', newOrderId);
      
      const orderData = {
        buyerId: user.uid,
        sellerId: linkData.sellerId,
        creatorId: linkData.sellerId,
        title: linkData.title,
        description: linkData.description,
        amount: linkData.amount,
        status: 'pending',
        visibility: 'public',
        category: linkData.category,
        allowBNPL: linkData.allowBNPL,
        deliveryDays: linkData.deliveryDays,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(orderRef, orderData);

      // 3. Mark the link as used
      await updateDoc(linkRef, {
        status: 'used',
        usedBy: user.uid,
        orderId: newOrderId,
        usedAt: serverTimestamp()
      });

      // 4. Send Notifications
      await recordOrderEvent(
        newOrderId,
        user.uid,
        'تغيير الحالة: pending',
        'link_creation',
        'pending',
        'قام المشتري بقبول رابط الدفع وتعميد الفاتورة (رابط سريع)'
      );

      await sendNotification(
        linkData.sellerId,
        '🔔 العميل جاهز للدفع',
        `قام العميل (${user.displayName}) باستكمال بيانات الرابط لطلب (${linkData.title})، وهو الآن في خطوة الدفع.`,
        'order_update',
        'normal',
        newOrderId
      );

      navigate(`/order/${newOrderId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء إنشاء الطلب.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-20 text-center text-gray-500 font-bold">جاري تحميل الفاتورة...</div>;
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-[3rem] border border-gray-100 shadow-xl text-center">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-4">{error}</h2>
        <button onClick={() => navigate('/dashboard')} className="mt-4 bg-gray-900 text-white px-8 py-3 rounded-xl font-bold">العودة للوحة التحكم</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent"></div>
      <div className="relative z-10 text-center space-y-6">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-blue-200 rotate-3">
          <FileText className="w-10 h-10 text-white -rotate-3" />
        </div>
        
        <div>
          <h2 className="text-3xl font-black text-gray-900 font-display">فاتورة طلب جديدة</h2>
          <p className="text-gray-500 mt-2">قام <span className="font-bold text-blue-600">{sellerName}</span> بإنشاء هذا الطلب خصيصاً لك.</p>
        </div>

        <div className="bg-gray-50 rounded-3xl p-6 text-right space-y-4 border border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">عنوان الخدمة</p>
            <p className="font-black text-gray-900 text-lg">{linkData.title}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-y border-gray-200 py-4">
             <div>
               <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">المبلغ المطلوب</p>
               <p className="font-black text-blue-600 text-2xl">{linkData.amount.toLocaleString()} <span className="text-sm">ر.س</span></p>
             </div>
             <div>
               <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">مدة التسليم</p>
               <p className="font-black text-gray-900 flex items-center gap-1"><Clock className="w-4 h-4 text-orange-500" /> {linkData.deliveryDays} أيام</p>
             </div>
          </div>

          {linkData.description && (
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">تفاصيل وشروط البائع</p>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">{linkData.description}</p>
            </div>
          )}
        </div>

        {!user ? (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-4 font-bold">يرجى تسجيل الدخول بحساب جوجل للموافقة وبدء الدفع بأمان.</p>
            <button
              onClick={login}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 text-lg"
            >
              تسجيل الدخول للمتابعة
            </button>
          </div>
        ) : (
          <div className="pt-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 text-lg"
            >
              {submitting ? 'جاري المعالجة...' : 'موافق ومتابعة للدفع'}
              {!submitting && <ChevronRight className="w-5 h-5 rtl:rotate-180" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
