import React, { useState } from 'react';
import { Link2, Copy, Check, Clock, CreditCard, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const InvoiceLinkGenerator: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'عام',
    description: '',
    deliveryDays: '3',
    allowBNPL: true
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);

  const categories = ['عقارات', 'سيارات', 'خدمات إلكترونية', 'تعقيب معاملات', 'برمجة وتطوير', 'صناعة تطبيقات', 'مواقع إلكترونية', 'استضافات', 'أجهزة إلكترونية', 'عام'];

  const generateLink = async () => {
    if (!formData.title || !formData.amount) {
      toast.error('يرجى إدخال عنوان الخدمة والمبلغ');
      return;
    }
    
    if (parseFloat(formData.amount) < 50) {
      toast.error('أقل مبلغ للطلب هو 50 ريال');
      return;
    }

    setLoading(true);
    try {
      const shortId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const docRef = doc(db, 'payment_links', shortId);
      
      await setDoc(docRef, {
        sellerId: user?.uid,
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        allowBNPL: formData.allowBNPL,
        deliveryDays: parseInt(formData.deliveryDays) || 3,
        status: 'active',
        createdAt: serverTimestamp()
      });

      const baseUrl = window.location.origin;
      setGeneratedLink(`${baseUrl}/pay/${shortId}`);
      toast.success('تم إنشاء الرابط بنجاح');
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء توليد الرابط: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success('تم نسخ رابط الطلب الذكي بنجاح!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden mb-8">
      <div 
        className="p-6 md:p-8 bg-gradient-to-l from-blue-600 to-indigo-700 flex justify-between items-center cursor-pointer hover:opacity-95 transition-opacity"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4 text-white">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black font-display">رابط الدفع الذكي (فاتورة سريعة)</h3>
            <p className="text-blue-100 text-sm font-medium mt-1">أنشئ رابطاً مخصصاً لعميلك ليدفع لك فوراً بأمان</p>
          </div>
        </div>
        <button className="bg-white text-blue-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg transition-all hidden md:block">
          {isOpen ? 'إغلاق' : 'إنشاء رابط جديد'}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 md:p-8 space-y-6">
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">عنوان الخدمة أو الفاتورة</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-bold"
                    placeholder="مثال: تصميم هوية تجارية كاملة"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">المبلغ الإجمالي (ر.س)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-black"
                    placeholder="1500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">القسم / التصنيف</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-bold"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">مدة التسليم (بالأيام)</label>
                  <div className="relative">
                    <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.deliveryDays}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliveryDays: e.target.value }))}
                      className="w-full pl-5 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-black"
                      placeholder="3"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">تفاصيل وشروط العمل (اختياري)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium min-h-[100px] resize-none"
                  placeholder="اكتب هنا أي شروط أو تفاصيل ليوافق عليها العميل قبل الدفع..."
                />
              </div>

              <div className="bg-green-50 border border-green-100 rounded-2xl p-5 flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">إتاحة الدفع الآجل (تابي/تمارا) للمشتري؟</h4>
                    <p className="text-xs text-gray-500 font-medium">لن يتم خصم أي رسوم إضافية من أرباحك، سيتحملها المشتري.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    checked={formData.allowBNPL}
                    onChange={(e) => setFormData(prev => ({ ...prev, allowBNPL: e.target.checked }))}
                    className="sr-only peer" 
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <button
                onClick={generateLink}
                disabled={loading}
                className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black text-lg transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'توليد الرابط الذكي'}
              </button>

              {generatedLink && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between gap-4 mt-6"
                >
                  <div className="flex-1 truncate dir-ltr text-left font-mono text-sm text-blue-800 font-medium">
                    {generatedLink}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-all shadow-md active:scale-90 flex items-center gap-2"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    <span className="font-bold text-sm hidden md:block">{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
