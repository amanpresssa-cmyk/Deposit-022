import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shield, ChevronRight, AlertCircle, Search, Smartphone, Mail, CreditCard, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { sendOrderSMS } from '../lib/smsService';
import { sendNotification, recordOrderEvent } from '../lib/notificationService';

export const CreateOrderPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Standard Form State
  const [myRole, setMyRole] = useState<'buyer' | 'seller'>('buyer');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    targetEmail: '',
    targetPhone: '',
    category: 'عام'
  });

  // Invoice Link State
  const [isInvoiceLink, setIsInvoiceLink] = useState(false);
  const [invoiceParams, setInvoiceParams] = useState<any>(null);
  const [sellerName, setSellerName] = useState('بائع مستقل');

  const categories = ['عقارات', 'سيارات', 'خدمات إلكترونية', 'تعقيب معاملات', 'برمجة وتطوير', 'صناعة تطبيقات', 'مواقع إلكترونية', 'استضافات', 'أجهزة إلكترونية', 'عام'];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetId = params.get('targetId');
    const title = params.get('title');
    const amount = params.get('amount');
    
    // Check if this is an automated Invoice Link from a seller
    if (targetId && title && amount) {
      setIsInvoiceLink(true);
      setInvoiceParams({
        sellerId: targetId,
        title,
        amount,
        category: params.get('category') || 'عام',
        desc: params.get('desc') || '',
        allowBNPL: params.get('bnpl') === 'true',
        deliveryDays: parseInt(params.get('days') || '3')
      });

      // Fetch Seller Name
      getDoc(doc(db, 'users', targetId)).then(snap => {
        if (snap.exists()) {
          setSellerName(snap.data().displayName || 'بائع مستقل');
        }
      });
    } else {
      // Regular URL autofill
      const email = params.get('email');
      const phone = params.get('phone');
      const desc = params.get('desc') || params.get('description');
      const category = params.get('category');
      
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
    }
  }, [location.search]);

  // --- 1. Invoice Link View ---
  if (isInvoiceLink && invoiceParams) {
    const handleInvoiceSubmit = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const orderData = {
          buyerId: user.uid,
          sellerId: invoiceParams.sellerId,
          creatorId: invoiceParams.sellerId, // Created by seller initially via link
          title: invoiceParams.title,
          description: invoiceParams.desc,
          amount: parseFloat(invoiceParams.amount),
          status: 'pending', // Instantly pending because buyer clicked accept
          visibility: 'public',
          category: invoiceParams.category,
          allowBNPL: invoiceParams.allowBNPL,
          deliveryDays: invoiceParams.deliveryDays,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'orders'), orderData);

        await recordOrderEvent(
          docRef.id,
          user.uid,
          'تغيير الحالة: pending',
          'link_creation',
          'pending',
          'قام المشتري بقبول رابط الدفع وتعميد الفاتورة'
        );

        await sendNotification(
          invoiceParams.sellerId,
          '🔔 العميل جاهز للدفع',
          `قام العميل (${user.displayName}) بقبول رابط الفاتورة لطلب (${invoiceParams.title})، وهو الآن في خطوة الدفع.`,
          'order_update',
          'normal',
          docRef.id
        );

        navigate(`/order/${docRef.id}`);
      } catch (err: any) {
        setError('حدث خطأ أثناء تأكيد الطلب.');
      } finally {
        setLoading(false);
      }
    };

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
              <p className="font-black text-gray-900 text-lg">{invoiceParams.title}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-y border-gray-200 py-4">
               <div>
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">المبلغ المطلوب</p>
                 <p className="font-black text-blue-600 text-2xl">{parseFloat(invoiceParams.amount).toLocaleString()} <span className="text-sm">ر.س</span></p>
               </div>
               <div>
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">مدة التسليم</p>
                 <p className="font-black text-gray-900 flex items-center gap-1"><Clock className="w-4 h-4 text-orange-500" /> {invoiceParams.deliveryDays} أيام</p>
               </div>
            </div>

            {invoiceParams.desc && (
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">تفاصيل وشروط البائع</p>
                <p className="text-sm text-gray-600 leading-relaxed font-medium">{invoiceParams.desc}</p>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 font-bold">{error}</p>}

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
                onClick={handleInvoiceSubmit}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 text-lg"
              >
                {loading ? 'جاري المعالجة...' : 'موافق ومتابعة للدفع'}
                {!loading && <ChevronRight className="w-5 h-5 rtl:rotate-180" />}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- 2. Standard Manual Form View ---
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-gray-100 shadow-sm text-center space-y-6">
        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-blue-600">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-900">سجل دخولك لبدء صفقة جديدة</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          لتتمكن من إنشاء صفقة ضمان مالي آمنة، يرجى تسجيل الدخول أولاً عن طريق حساب جوجل الموثق.
        </p>
        <button onClick={login} className="w-full bg-[#2563eb] text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl flex items-center justify-center gap-2 text-lg">
          <span>تسجيل الدخول باستخدام جوجل</span>
        </button>
      </div>
    );
  }

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    if (!formData.title.trim() || !formData.amount.trim()) {
      setError('يرجى إدخال عنوان ومبلغ الصفقة'); return;
    }
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من صفر'); return;
    }
    if (!formData.targetEmail && !formData.targetPhone) {
      setError('يجب إدخال البريد الإلكتروني أو رقم الجوال للطرف الآخر للتمكن من دعوته'); return;
    }

    setLoading(true);
    try {
      let targetRef = null;
      try {
        if (formData.targetEmail) {
          const emailQuery = query(collection(db, 'users'), where('email', '==', formData.targetEmail.trim().toLowerCase()), limit(1));
          const snap = await getDocs(emailQuery);
          if (!snap.empty) targetRef = snap.docs[0];
        }
        if (!targetRef && formData.targetPhone) {
          let phone = formData.targetPhone.trim();
          if (!phone.startsWith('+')) phone = `+966${phone.replace(/^0/, '')}`;
          const phoneQuery = query(collection(db, 'users'), where('phoneNumber', '==', phone), limit(1));
          const snap = await getDocs(phoneQuery);
          if (!snap.empty) targetRef = snap.docs[0];
        }
      } catch (err) { }
      
      const targetUserId = targetRef ? targetRef.id : 'unknown';

      const orderData = {
        buyerId: myRole === 'buyer' ? user.uid : targetUserId,
        sellerId: myRole === 'seller' ? user.uid : targetUserId,
        creatorId: user.uid,
        title: formData.title.trim(),
        description: formData.description.trim(),
        amount: amountNum,
        status: 'awaiting_acceptance',
        visibility: 'public',
        category: formData.category,
        allowBNPL: true, // Default to true for manual standard forms
        deliveryDays: 3, // Default to 3 days for standard forms
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);

      if (targetUserId !== 'unknown') {
        const titleText = myRole === 'buyer' ? '🔔 طلب خدمة جديد بانتظار قبولك' : '🔔 عرض خدمة جديد بانتظار تعميدك';
        const messageText = `لقد قام ${user.displayName} بطلب صفقة (${formData.title}) بقيمة ${amountNum} ر.س. يرجى المراجعة والقبول.`;
        await sendNotification(targetUserId, titleText, messageText, 'order_update', 'normal', docRef.id);
      }
      
      if (formData.targetPhone) {
        try { await sendOrderSMS(formData.targetPhone.trim(), docRef.id, formData.title, amountNum); } catch (e) {}
      }

      navigate(`/order/${docRef.id}`);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ، حاول لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => navigate('/dashboard')} className="hover:text-blue-600 transition-colors">لوحة التحكم</button>
        <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        <span className="text-gray-900 font-medium">إنشاء طلب ضمان جديد</span>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-[#2563eb] p-8 md:p-12 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black font-display">بدء عملية ضمان مالي</h1>
          </div>
          <p className="opacity-90 leading-relaxed font-medium">قم بتعبئة بيانات الصفقة ليتم دعوتكم أنت والطرف الآخر لبدء عملية الوساطة.</p>
        </div>

        <form onSubmit={handleStandardSubmit} className="p-8 md:p-12 space-y-8">
          <div className="space-y-6">
            <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">التفاصيل الأساسية</h3>
            <div className="space-y-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">من أنت في هذه الصفقة؟</label>
              <div className="grid grid-cols-2 gap-4">
                 <button type="button" onClick={() => setMyRole('buyer')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${myRole === 'buyer' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                   <CreditCard className="w-6 h-6" />
                   <span className="font-bold text-sm">المشتري (من سيدفع)</span>
                 </button>
                 <button type="button" onClick={() => setMyRole('seller')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${myRole === 'seller' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                   <Shield className="w-6 h-6" />
                   <span className="font-bold text-sm">البائع (من سينفذ)</span>
                 </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">عنوان الصفقة</label>
              <input type="text" required className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-bold text-sm" placeholder="مثال: شراء سيارة" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">التصنيف</label>
                <select className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold text-sm" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">المبلغ (ر.س)</label>
                <input type="number" required min="1" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-black text-sm" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">دعوة الطرف الآخر</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">رقم الجوال</label>
                <input type="tel" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 focus:border-blue-500 outline-none text-sm font-bold" placeholder="05XXXXXXXX" value={formData.targetPhone} onChange={(e) => setFormData({...formData, targetPhone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">البريد الإلكتروني</label>
                <input type="email" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 focus:border-blue-500 outline-none text-sm font-bold" placeholder="name@example.com" value={formData.targetEmail} onChange={(e) => setFormData({...formData, targetEmail: e.target.value})} />
              </div>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3 text-red-700 text-sm font-bold"><AlertCircle className="w-5 h-5 shrink-0" /><p>{error}</p></div>}

          <button type="submit" disabled={loading} className="w-full bg-[#2563eb] text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-50">
            {loading ? 'جاري المعالجة...' : 'بدء الصفقة الآن'}
          </button>
        </form>
      </div>
    </div>
  );
};
