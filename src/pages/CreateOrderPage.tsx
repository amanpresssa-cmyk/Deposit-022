import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shield, ChevronRight, AlertCircle, Search, Smartphone, Mail } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { sendOrderSMS } from '../lib/smsService';

export const CreateOrderPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    sellerEmail: '',
    sellerPhone: '',
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
    
    if (email || phone || title || amount || category || desc) {
      setFormData(prev => ({
        ...prev,
        sellerEmail: email || prev.sellerEmail,
        sellerPhone: phone || prev.sellerPhone,
        title: title || prev.title,
        amount: amount || prev.amount,
        category: category || prev.category,
        description: desc || prev.description
      }));
    }
  }, [location.search]);

  const categories = ['عقارات', 'سيارات', 'خدمات إلكترونية', 'تعقيب معاملات', 'برمجة وتطوير', 'أجهزة إلكترونية', 'عام'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.sellerEmail && !formData.sellerPhone) {
      alert('يجب إدخال البريد الإلكتروني أو رقم الجوال للطرف الآخر');
      return;
    }

    setLoading(true);
    try {
      // Find seller by email or phone to link if they already exist
      let sellerRef = null;
      
      if (formData.sellerEmail) {
        const sellerEmailQuery = query(collection(db, 'users'), where('email', '==', formData.sellerEmail.trim()));
        const sellerSnap = await getDocs(sellerEmailQuery);
        if (!sellerSnap.empty) sellerRef = sellerSnap.docs[0];
      }
      
      if (!sellerRef && formData.sellerPhone) {
        let phone = formData.sellerPhone.trim();
        if (!phone.startsWith('+')) {
          phone = `+966${phone.replace(/^0/, '')}`;
        }
        const sellerPhoneQuery = query(collection(db, 'users'), where('phoneNumber', '==', phone));
        const sellerSnap = await getDocs(sellerPhoneQuery);
        if (!sellerSnap.empty) sellerRef = sellerSnap.docs[0];
      }
      
      const targetSellerId = sellerRef ? sellerRef.id : 'unknown';

      const orderData = {
        buyerId: user.uid,
        sellerId: targetSellerId,
        sellerEmail: formData.sellerEmail.trim() || null,
        sellerPhone: formData.sellerPhone.trim() || null,
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount),
        status: 'pending',
        visibility: 'public',
        category: formData.category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Smart Logic: Send SMS invitation if phone is provided
      if (formData.sellerPhone) {
        await sendOrderSMS(
          formData.sellerPhone.trim(), 
          docRef.id, 
          formData.title, 
          parseFloat(formData.amount)
        );
      }

      navigate(`/order/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
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
              <h3 className="font-bold text-gray-900">بيانات الطرف الآخر (البائع/المعقب)</h3>
              <div className="flex gap-2">
                <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-1 rounded-lg font-black flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  دعوة SMS ذكية
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block">رقم الجوال (يفضل لإسراع العملية)</label>
                <div className="relative">
                  <input
                    type="tel"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none pr-12"
                    placeholder="05XXXXXXXX"
                    value={formData.sellerPhone}
                    onChange={(e) => setFormData({...formData, sellerPhone: e.target.value})}
                  />
                  <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block">البريد الإلكتروني (اختياري)</label>
                <div className="relative">
                  <input
                    type="email"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none pr-12"
                    placeholder="name@example.com"
                    value={formData.sellerEmail}
                    onChange={(e) => setFormData({...formData, sellerEmail: e.target.value})}
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
