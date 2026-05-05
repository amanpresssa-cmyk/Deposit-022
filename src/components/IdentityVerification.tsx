import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, Upload, AlertCircle, X, CheckCircle2, FileText, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onClose: () => void;
}

export const IdentityVerification: React.FC<Props> = ({ onClose }) => {
  const { profile, submitVerification, error, clearError } = useAuth();
  const [step, setStep] = useState<'info' | 'details' | 'success'>('info');
  const [formData, setFormData] = useState({
    idNumber: '',
    idPhotoUrl: '',
    agreedToTerms: false
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreedToTerms) return;
    
    setLoading(true);
    clearError();

    try {
      // Mock photo upload process
      const mockPhotoUrl = "https://example.com/id-photo.jpg"; 
      await submitVerification({
        ...formData,
        idPhotoUrl: mockPhotoUrl
      });
      setStep('success');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden relative shadow-2xl"
      >
        <button 
          onClick={onClose}
          className="absolute left-8 top-8 p-2 hover:bg-gray-100 rounded-full transition-colors z-20"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>

        <div className="grid md:grid-cols-5 h-full">
           <div className="md:col-span-2 bg-blue-600 p-10 text-white flex flex-col justify-between">
              <div>
                <ShieldCheck className="w-16 h-16 mb-8 text-blue-200" />
                <h2 className="text-3xl font-black mb-4">توثيق الهوية</h2>
                <p className="text-blue-100 font-medium leading-relaxed">
                  نظام التوثيق المتطور يضمن مصداقية التعاملات بين كافة الأطراف داخل المنصة.
                </p>
              </div>
              <div className="space-y-4">
                 <div className="flex items-center gap-3 text-sm font-bold bg-white/10 p-3 rounded-xl border border-white/10">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ضمان الحقوق المالية
                 </div>
                 <div className="flex items-center gap-3 text-sm font-bold bg-white/10 p-3 rounded-xl border border-white/10">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    شارة "موثوق" للملف الشخصي
                 </div>
              </div>
           </div>

           <div className="md:col-span-3 p-10 max-h-[85vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                 {step === 'info' && (
                    <motion.div 
                       key="info"
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       className="space-y-8"
                    >
                       <div className="space-y-4">
                          <h3 className="text-2xl font-bold text-gray-900">المعلومات المطلوبة</h3>
                          <p className="text-gray-500">لبدء عملية التوثيق، سنحتاج منك التأكد من جاهزية الآتي:</p>
                       </div>

                       <div className="space-y-4">
                          <div className="flex gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
                             < smartphone className="w-8 h-8 text-blue-500" />
                             <div>
                                <h4 className="font-bold text-gray-900">توثيق رقم الجوال</h4>
                                <p className="text-xs text-gray-400">يجب أن يكون رقمك نشطاً لاستقبال كود التحقق.</p>
                             </div>
                          </div>
                          <div className="flex gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
                             <FileText className="w-8 h-8 text-blue-500" />
                             <div>
                                <h4 className="font-bold text-gray-900">رقم الهوية / الإقامة</h4>
                                <p className="text-xs text-gray-400">سيتم مطابقة رقم الهوية مع صورة إثبات الهوية.</p>
                             </div>
                          </div>
                       </div>

                       <button 
                          onClick={() => setStep('details')}
                          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
                       >
                          بدء التوثيق الآن
                       </button>
                    </motion.div>
                 )}

                 {step === 'details' && (
                    <motion.form 
                       key="details"
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       onSubmit={handleSubmit}
                       className="space-y-6"
                    >
                       <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 block mr-1">رقم الهوية الوطنية / الإقامة</label>
                          <input
                             type="text"
                             required
                             maxLength={10}
                             className="w-full px-4 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-lg font-bold tracking-widest"
                             placeholder="1XXXXXXXXX"
                             value={formData.idNumber}
                             onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 block mr-1">صورة إثبات الهوية</label>
                          <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center bg-gray-50 hover:bg-gray-100 hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden group">
                             <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
                             <p className="text-sm font-bold text-gray-500">اضغط لرفع الصورة أو اسحبها هنا</p>
                             <p className="text-xs text-gray-400 mt-1">يجب أن تكون الصورة واضحة وبحجم لا يتعدى 5 ميجا</p>
                             <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                          </div>
                       </div>

                       <div className="space-y-4">
                          <label className="flex items-start gap-3 cursor-pointer group">
                             <input 
                                type="checkbox" 
                                required
                                className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={formData.agreedToTerms}
                                onChange={(e) => setFormData({...formData, agreedToTerms: e.target.checked})}
                             />
                             <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">
                                أقر بصحة البيانات المقدمة وأوافق على <span className="text-blue-600 font-bold underline cursor-pointer">سياسة الخصوصية</span> و <span className="text-blue-600 font-bold underline cursor-pointer">شروط الاستخدام</span> الخاصة بمنصة عربون.
                             </span>
                          </label>
                       </div>

                       <button 
                          type="submit"
                          disabled={loading}
                          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50"
                       >
                          {loading ? 'جاري إرسال الطلب...' : 'إرسال طلب التوثيق'}
                       </button>
                    </motion.form>
                 )}

                 {step === 'success' && (
                    <motion.div 
                       key="success"
                       initial={{ opacity: 0, scale: 0.9 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="text-center py-10"
                    >
                       <div className="bg-green-50 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                          <CheckCircle2 className="w-12 h-12 text-green-500" />
                       </div>
                       <h3 className="text-2xl font-black text-gray-900 mb-4">تم استلام طلبك بنجاح!</h3>
                       <p className="text-gray-500 leading-loose mb-8">
                          طلب التوثيق الخاص بك الآن قيد المراجعة من قبل فريقنا المختص. سيتم تحديث حالة حسابك خلال 24-48 ساعة عمل.
                       </p>
                       <button 
                          onClick={onClose}
                          className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
                       >
                          العودة لوحة التحكم
                       </button>
                    </motion.div>
                 )}
              </AnimatePresence>

              {error && (
                 <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                 </div>
              )}
           </div>
        </div>
      </motion.div>
    </div>
  );
};
