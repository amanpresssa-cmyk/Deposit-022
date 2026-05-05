import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shield, ChevronRight, AlertCircle, Search } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export const CreateOrderPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    sellerEmail: '',
    category: 'عام'
  });

  const categories = ['عقارات', 'سيارات', 'خدمات إلكترونية', 'تعقيب معاملات', 'برمجة وتطوير', 'عام'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Find seller by email
      const sellerQuery = query(collection(db, 'users'), where('email', '==', formData.sellerEmail.trim()));
      const sellerSnap = await getDocs(sellerQuery);
      
      let targetSellerId = 'unknown';
      if (!sellerSnap.empty) {
        targetSellerId = sellerSnap.docs[0].id;
      }

      const orderData = {
        buyerId: user.uid,
        sellerId: targetSellerId,
        sellerEmail: formData.sellerEmail.trim(),
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount),
        status: 'pending',
        visibility: 'public', // Default to public for now so it shows in search
        category: formData.category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
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
        <div className="bg-blue-600 p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">بدء عملية ضمان مالي</h1>
          </div>
          <p className="opacity-90 leading-relaxed">
            قم بتعبئة بيانات الصفقة ليتم دعوتكم أنت والطرف الآخر لبدء عملية الوساطة وتأمين المبلغ.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">عنوان الصفقة</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              placeholder="مثال: شراء سيارة تويوتا كامري 2020"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 block">التصنيف</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none appearance-none bg-no-repeat bg-[right_1rem_center] bg-gray-50"
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">البريد الإلكتروني للطرف الآخر (البائع/المعقب)</label>
            <div className="relative">
               <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                placeholder="seller@example.com"
                value={formData.sellerEmail}
                onChange={(e) => setFormData({...formData, sellerEmail: e.target.value})}
              />
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
            <p className="text-xs text-blue-500 font-medium">سيتم إرسال دعوة للطرف الآخر عبر بريده الإلكتروني للانضمام لهذه الصفقة.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">شروط وتفاصيل الصفقة</label>
            <textarea
              required
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none resize-none"
              placeholder="اكتب بوضوح التفاصيل المتفق عليها، الشروط، ومواعيد التسليم..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex gap-3 text-orange-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>عند إنشاء الصفقة، سيتم إرسال إشعار للطرف الآخر. تذكر أن عربون هي وسيط فقط للحفظ واستلام المبالغ، وهي لا تتدخل في الشحن أو المعاملة إلا في حال النزاع.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563eb] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#1d4ed8] shadow-lg shadow-blue-100 transition-all disabled:opacity-50"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء الصفقة وبدء المحادثة'}
          </button>
        </form>
      </div>
    </div>
  );
};
