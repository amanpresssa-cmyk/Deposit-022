import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shield, ChevronRight, AlertCircle, Search, Smartphone, Mail, CreditCard } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { sendOrderSMS } from '../lib/smsService';

export const CreateOrderPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<'buyer' | 'seller'>('buyer');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    targetEmail: '',
    targetPhone: '',
    category: 'عام'
  });

  // Smart Auto-fill from URL params (e.g., from seller's external landing page)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const email = params.get('email');
    const phone = params.get('phone');
    const title = params.get('title');
    const amount = params.get('amount');
    const category = params.get('category');
    const desc = params.get('desc') || params.get('description');
    const targetId = params.get('targetId');
    
    if (email || phone || title || amount || category || desc) {
      setFormData(prev => ({
        ...prev,
        targetEmail: email || prev.targetEmail,
        targetPhone: phone || prev.targetPhone,
        title: title || prev.title,
        amount: amount || prev.amount,
        category: category || prev.category,
        description: desc || prev.description
      }));
    }

    if (targetId) {
      getDoc(doc(db, 'users', targetId)).then(snap => {
        if (snap.exists()) {
          const u = snap.data();
          setFormData(prev => ({
            ...prev,
            targetEmail: u.email || prev.targetEmail,
            targetPhone: u.phoneNumber || prev.targetPhone
          }));
        }
      });
    }
  }, [location.search]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-gray-100 shadow-sm text-center space-y-6">
        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-blue-600">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-900">سجل دخولك لبدء صفقة جديدة</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          لتتمكن من إنشاء صفقة ضمان مالي آمنة ومتابعة محادثات البائعين وحجم صفقاتك، يرجى تسجيل الدخول أولاً عن طريق حساب جوجل الموثق.
        </p>
        <button
          onClick={login}
          className="w-full bg-[#2563eb] text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 text-lg"
        >
          <span>تسجيل الدخول باستخدام جوجل</span>
        </button>
      </div>
    );
  }

  const categories = ['عقارات', 'سيارات', 'خدمات إلكترونية', 'تعقيب معاملات', 'برمجة وتطوير', 'صناعة تطبيقات', 'مواقع إلكترونية', 'استضافات', 'أجهزة إلكترونية', 'عام'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    // Basic Validation
    if (!formData.title.trim()) {
      setError('يرجى إدخال عنوان للصفقة');
      return;
    }
    
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    if (!formData.targetEmail && !formData.targetPhone) {
      setError('يجب إدخال البريد الإلكتروني أو رقم الجوال للطرف الآخر للتمكن من دعوته');
      return;
    }

    setLoading(true);
    try {
      // Find target user
      let targetRef = null;
      
      try {
        if (formData.targetEmail) {
          const emailQuery = query(collection(db, 'users'), where('email', '==', formData.targetEmail.trim().toLowerCase()), limit(1));
          const snap = await getDocs(emailQuery);
          if (!snap.empty) targetRef = snap.docs[0];
        }
        
        if (!targetRef && formData.targetPhone) {
          let phone = formData.targetPhone.trim();
          if (!phone.startsWith('+')) {
            phone = `+966${phone.replace(/^0/, '')}`;
          }
          const phoneQuery = query(collection(db, 'users'), where('phoneNumber', '==', phone), limit(1));
          const snap = await getDocs(phoneQuery);
          if (!snap.empty) targetRef = snap.docs[0];
        }
      } catch (searchErr) {
        console.warn("User search failed (likely permission), proceeding as unknown:", searchErr);
        // We continue even if search fails, the order creator will be fine
      }
      
      const targetUserId = targetRef ? targetRef.id : 'unknown';

      const orderData = {
        buyerId: myRole === 'buyer' ? user.uid : targetUserId,
        sellerId: myRole === 'seller' ? user.uid : targetUserId,
        sellerEmail: myRole === 'seller' ? (user.email || null) : (formData.targetEmail.trim().toLowerCase() || null),
        sellerPhone: myRole === 'seller' ? (user.phoneNumber || null) : (formData.targetPhone.trim() || null),
        buyerEmail: myRole === 'buyer' ? (user.email || null) : (formData.targetEmail.trim().toLowerCase() || null),
        buyerPhone: myRole === 'buyer' ? (user.phoneNumber || null) : (formData.targetPhone.trim() || null),
        creatorId: user.uid,
        title: formData.title.trim(),
        description: formData.description.trim(),
        amount: amountNum,
        status: 'pending',
        visibility: 'public',
        category: formData.category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Smart Logic: Send SMS invitation if phone is provided
      if (formData.targetPhone) {
        try {
          await sendOrderSMS(
            formData.targetPhone.trim(), 
            docRef.id, 
            formData.title, 
            amountNum
          );
        } catch (smsErr) {
          console.error("SMS Invite failed:", smsErr);
          // Don't block the user if SMS fails, the order is created anyway
        }
      }

      navigate(`/order/${docRef.id}`);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('permission')) {
        handleFirestoreError(err, OperationType.CREATE, 'orders');
        setError('خطأ في الصلاحيات: لم نتمكن من إنشاء الطلب. يرجى التأكد من صحة البيانات أو التواصل مع الدعم التقني.');
      } else {
        setError(err.message || 'حدث خطأ أثناء إنشاء الصفقة، يرجى المحاولة لاحقاً');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => navigate('/dashboard')} className="hover:text-blue-600 transition-colors">لوحة التحكم</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">إنشاء طلب ضمان جديد</span>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-[#2563eb] p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">بدء عملية ضمان مالي</h1>
          </div>
          <p className="opacity-90 leading-relaxed font-light">
            قم بتعبئة بيانات الصفقة ليتم دعوتكم أنت والطرف الآخر لبدء عملية الوساطة وتأمين المبلغ.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-6">
            <h3 className="font-bold text-gray-900 border-b pb-2">تفاصيل الصفقة</h3>
            
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 block">من أنت في هذه الصفقة؟</label>
              <div className="grid grid-cols-2 gap-4">
                 <button
                   type="button"
                   onClick={() => setMyRole('buyer')}
                   className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                     myRole === 'buyer' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-400'
                   }`}
                 >
                   <CreditCard className="w-6 h-6" />
                   <span className="font-bold">أنا المشتري (من سيدفع)</span>
                 </button>
                 <button
                   type="button"
                   onClick={() => setMyRole('seller')}
                   className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                     myRole === 'seller' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-400'
                   }`}
                 >
                   <Shield className="w-6 h-6" />
                   <span className="font-bold">أنا البائع/المعقب (من سينفذ)</span>
                 </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 block">عنوان الصفقة</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                placeholder="مثال: شراء سيارة تويوتا كامري 2020"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block">التصنيف</label>
                <select
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none appearance-none bg-no-repeat bg-[right_1rem_center] bg-gray-50"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block">المبلغ الإجمالي (ر.س)</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 block">شروط وتفاصيل الصفقة</label>
              <textarea
                required
                rows={4}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none resize-none"
                placeholder="اكتب بوضوح التفاصيل المتفق عليها، الشروط، ومواعيد التسليم..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-900">بيانات الطرف الآخر ({myRole === 'buyer' ? 'البائع/المعقب' : 'المشتري/العميل'})</h3>
              <div className="flex gap-2">
                <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-1 rounded-lg font-black flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  دعوة SMS ذكية
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block">رقم جوال الطرف الآخر</label>
                <div className="relative">
                  <input
                    type="tel"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none pr-12"
                    placeholder="05XXXXXXXX"
                    value={formData.targetPhone}
                    onChange={(e) => setFormData({...formData, targetPhone: e.target.value})}
                  />
                  <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block">البريد الإلكتروني للطرف الآخر</label>
                <div className="relative">
                  <input
                    type="email"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none pr-12"
                    placeholder="name@example.com"
                    value={formData.targetEmail}
                    onChange={(e) => setFormData({...formData, targetEmail: e.target.value})}
                  />
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl space-y-3">
              <p className="text-sm text-blue-700 font-bold flex items-center gap-2">
                <Shield className="w-4 h-4" />
                كيف يعمل النظام الذكي؟
              </p>
              <ul className="text-xs text-blue-600 space-y-2 pr-2 border-r-2 border-blue-100">
                <li>• سيتم إرسال رسالة نصية فورية للبائع تحتوي على رابط مباشر للصفقة.</li>
                <li>• إذا لم يكن للبائع حساب، سيوجهه الرابط لإنشاء حساب وربطه بالصفقة تلقائياً.</li>
                <li>• يتم ربط الصفقة برقم الجوال أو الإيميل المدخل لضمان عدم وصولها لغير المعني.</li>
              </ul>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl flex gap-4 text-orange-800 text-sm">
            <Shield className="w-6 h-6 shrink-0 text-orange-500" />
            <p className="leading-relaxed">عند استكمال الطلب، سيتم تجميد المبلغ في منصة عربون. بمجرد تنفيذ الخدمة أو استلام المنتج وتأكيدك لذلك، سيتم تحويل المبلغ للطرف الآخر فوراً.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3 text-red-700 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-bold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563eb] text-white py-4 rounded-2xl font-bold text-xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'جاري إنشاء الصفقة...' : 'بدء الصفقة الآن'}
          </button>
        </form>
      </div>
    </div>
  );
};
