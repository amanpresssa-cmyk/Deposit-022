import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, Upload, AlertCircle, X, CheckCircle2, FileText, Smartphone, Camera, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { getGemini } from "../lib/gemini";

interface Props {
  onClose: () => void;
}

export const IdentityVerification: React.FC<Props> = ({ onClose }) => {
  const { profile, submitVerification, error, clearError } = useAuth();
  const [step, setStep] = useState<'info' | 'details' | 'success'>('info');
  const [formData, setFormData] = useState({
    idNumber: '',
    phoneNumber: profile?.phoneNumber || '',
    idPhotoUrl: '',
    agreedToTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error' | 'analyzing'>('idle');
  const [aiFeedback, setAiFeedback] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Gemini lazily
  const getAI = () => {
    try {
      return getGemini();
    } catch (error) {
      if (error instanceof Error && error.message === 'API_KEY_MISSING') {
        throw new Error("عذراً، لم يتم إعداد نظام التحقق الذكي بالكامل. يرجى التواصل مع الدعم.");
      }
      throw error;
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAiStatus('error');
      setAiFeedback('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت.');
      return;
    }

    setAiAnalyzing(true);
    setAiStatus('analyzing');
    setAiFeedback('جاري فحص المستند باستخدام الذكاء الاصطناعي...');

    try {
      const ai = getAI();
      const base64 = await fileToBase64(file);
      const base64Data = base64.split(',')[1];

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Is this a real governmental ID card, national identity card, or passport? Answer only with 'valid' or 'invalid' followed by a short reason in Arabic if invalid. Example: invalid: الصورة لا تبدو كبطاقة هوية رسمية." },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]
          }
        ]
      });

      const responseText = response.text?.toLowerCase() || '';
      
      if (responseText.includes('valid')) {
        setAiStatus('success');
        setAiFeedback('تم التحقق بنجاح من جودة ونوع المستند.');
        // In a real app, you'd upload this to Firebase Storage first
        setFormData({ ...formData, idPhotoUrl: base64 }); 
      } else {
        setAiStatus('error');
        setAiFeedback(responseText.split(': ')[1] || 'عذراً، الصورة لا تبدو كبطاقة هوية رسمية واضحة. يرجى إعادة التصوير بوضوح.');
      }
    } catch (err) {
      console.error('AI Verification Error:', err);
      setAiStatus('error');
      setAiFeedback('حدث خطأ أثناء فحص الصورة. تأكد من وضوح الصورة وحاول مجدداً.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreedToTerms || aiStatus !== 'success') return;
    
    setLoading(true);
    clearError();

    try {
      await submitVerification({
        idNumber: formData.idNumber,
        phoneNumber: formData.phoneNumber,
        idPhotoUrl: formData.idPhotoUrl,
        agreedToTerms: formData.agreedToTerms
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
                             <Smartphone className="w-8 h-8 text-blue-500" />
                             <div>
                                <h4 className="font-bold text-gray-900">رقم الجوال</h4>
                                <p className="text-xs text-gray-400">يجب أن يكون رقمك نشطاً لاستقبال التنبيهات.</p>
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
                       className="space-y-5"
                    >
                       <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 block mr-1">رقم الهوية الوطنية / الإقامة</label>
                          <input
                             type="text"
                             required
                             maxLength={10}
                             className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-lg font-bold tracking-widest text-right"
                             placeholder="1XXXXXXXXX"
                             value={formData.idNumber}
                             onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 block mr-1">رقم الجوال</label>
                          <div className="relative">
                            <input
                               type="tel"
                               required
                               placeholder="05XXXXXXXX"
                               className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-lg font-bold text-right"
                               value={formData.phoneNumber}
                               onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                            />
                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 block mr-1">صورة إثبات الهوية (فحص ذكي)</label>
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all cursor-pointer relative overflow-hidden group ${
                              aiStatus === 'success' ? 'bg-green-50 border-green-200' : 
                              aiStatus === 'error' ? 'bg-red-50 border-red-200' :
                              aiStatus === 'analyzing' ? 'bg-blue-50 border-blue-200 cursor-wait' :
                              'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-blue-300'
                            }`}
                          >
                             {aiAnalyzing ? (
                               <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-2 animate-spin" />
                             ) : formData.idPhotoUrl ? (
                               <div className="relative w-20 h-20 mx-auto mb-2">
                                 <img src={formData.idPhotoUrl} className="w-full h-full object-cover rounded-xl border-2 border-white shadow-sm" alt="Preview" />
                                 {aiStatus === 'success' && (
                                   <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-sm">
                                      <CheckCircle2 className="w-4 h-4" />
                                   </div>
                                 )}
                               </div>
                             ) : (
                               <Camera className="w-10 h-10 text-gray-400 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
                             )}
                             <p className={`text-sm font-bold ${aiStatus === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                               {aiStatus === 'idle' ? 'اضغط لرفع صورة الهوية' : aiFeedback}
                             </p>
                             <p className="text-xs text-gray-400 mt-1">نظامنا الذكي سيفحص جودة الهوية فوراً</p>
                             <input 
                                ref={fileInputRef}
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleFileChange}
                                disabled={aiAnalyzing}
                             />
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
                          disabled={loading || aiStatus !== 'success' || !formData.agreedToTerms}
                          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50"
                       >
                          {loading ? 'جاري إرسال الطلب...' : aiAnalyzing ? 'جاري فحص الصورة...' : 'إرسال طلب التوثيق'}
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
                          طلب التوثيق الخاص بك الآن قيد المراجعة من قبل فريقنا المختص. سيتم تحديث حالة حسابك خلال 24-48 ساعة عمل بعد مطابقة البيانات.
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
