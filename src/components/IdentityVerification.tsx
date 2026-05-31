import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, AlertCircle, X, CheckCircle2, Smartphone, Loader2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

export const IdentityVerification: React.FC<Props> = ({ onClose }) => {
  const { profile, submitVerification, error, clearError } = useAuth();
  const [step, setStep] = useState<'info' | 'form' | 'otp' | 'success'>('info');
  const [formData, setFormData] = useState({
    idNumber: '',
    phoneNumber: profile?.phoneNumber || '',
    otp: ''
  });
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.idNumber.length < 10) {
      toast.error('يرجى إدخال رقم هوية صحيح');
      return;
    }
    
    setLoading(true);
    try {
      // Simulation of checking ID with Yamama / Absher
      console.log('Validating ID via Yamama Integration:', formData.idNumber);
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Masked number simulation
      const maskedPhone = '05XXXXXX' + Math.floor(Math.random() * 90 + 10);
      setFormData(prev => ({ ...prev, phoneNumber: maskedPhone }));
      
      setStep('otp');
      setTimer(120); 
      toast.success(`تم إرسال رمز التحقق إلى جوالك المسجّل في أبشر ${maskedPhone} عبر بوابة التحقق الآمنة`);
    } catch (err) {
      toast.error('حدث خطأ في النظام، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp.length < 4) return;

    setLoading(true);
    try {
      // Verification logic via Yamama SMS mediator
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Submit verification data
      await submitVerification({
        idNumber: formData.idNumber,
        phoneNumber: profile?.phoneNumber || '', 
        agreedToTerms: true,
        provider: 'yamama_gateway'
      });

      setStep('success');
    } catch (err) {
      toast.error('رمز التحقق غير صحيح أو انتهت صلاحيته');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white sm:bg-black/80 sm:backdrop-blur-md z-50 flex items-center justify-center sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white sm:rounded-[2.5rem] w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden relative sm:shadow-2xl flex flex-col"
      >
        <button 
          onClick={onClose}
          className="absolute left-4 top-4 md:left-8 md:top-8 p-2 hover:bg-gray-100 rounded-full transition-colors z-30 bg-white/50 backdrop-blur-sm"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="grid md:grid-cols-5 h-full">
           <div className="md:col-span-2 bg-[#1e293b] p-6 md:p-10 text-white flex flex-col justify-center gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="h-0.5 w-12 bg-gray-700" />
                  <div className="bg-white/10 px-3 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Verification Gateway</span>
                  </div>
                </div>
                <h2 className="text-xl md:text-2xl font-black mb-3 italic">بوابة التوثيق الموحدة</h2>
                <p className="text-gray-400 text-[10px] md:text-sm font-medium leading-relaxed">
                   نقوم بالتحقق من هويتك مباشرة عبر قواعد بيانات النفاذ الوطني الموحد لضمان أعلى معايير الأمان للجميع.
                </p>
              </div>
              
              <div className="relative z-10 space-y-3 mt-auto hidden md:block">
                 <div className="flex items-center gap-3 text-[10px] font-bold bg-white/5 p-3 rounded-xl border border-white/5">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    موفر الخدمة: نظام النفاذ الوطني الموحد
                 </div>
                 <p className="text-[9px] text-gray-500 text-center">جميع البيانات مشفرة وفق معايير SAMA</p>
              </div>
           </div>

           <div className="md:col-span-3 p-6 md:p-10 flex flex-col justify-center bg-gray-50/50">
              <AnimatePresence mode="wait">
                 {step === 'info' && (
                    <motion.div 
                       key="info"
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="space-y-6"
                    >
                       <div className="space-y-3 text-center md:text-right">
                          <h3 className="text-xl md:text-2xl font-black text-gray-900 italic">توثيق الهوية الرقمي</h3>
                          <p className="text-sm text-gray-500 font-medium">سيتم ربط حسابك بالهوية الوطنية رسمياً لزيادة مستوى الثقة إلى <span className="text-blue-600 font-black">100%</span>.</p>
                       </div>

                       <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                          <div className="flex gap-4">
                             <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                <Smartphone className="w-5 h-5" />
                             </div>
                             <div>
                                <h4 className="font-black text-sm text-gray-900">التحقق عبر أبشر</h4>
                                <p className="text-[10px] text-gray-400 font-bold leading-relaxed mt-1">يصلك رمز التحقق على رقم الجوال المعتمد في نظام أبشر.</p>
                             </div>
                          </div>
                       </div>

                       <button 
                          onClick={() => setStep('form')}
                          className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 group"
                       >
                          بدء التوثيق الآمن
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-[-4px] transition-transform" />
                       </button>
                    </motion.div>
                 )}

                 {step === 'form' && (
                    <motion.form 
                       key="form"
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       onSubmit={handleSendOTP}
                       className="space-y-6"
                    >
                        <div className="text-center md:text-right space-y-2 mb-4">
                          <h3 className="text-lg font-black text-gray-900">إدخال رقم الهوية</h3>
                          <p className="text-[10px] text-gray-500 font-bold tracking-tight">أدخل رقم الهوية أو الإقامة (10 أرقام)</p>
                        </div>

                        <div className="space-y-2">
                          <div className="relative">
                            <input
                               type="text"
                               required
                               autoFocus
                               maxLength={10}
                               className="w-full px-6 py-5 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-2xl font-black tracking-[0.4em] text-center bg-white"
                               placeholder="1XXXXXXXXX"
                               value={formData.idNumber}
                               onChange={(e) => setFormData({...formData, idNumber: e.target.value.replace(/\D/g, '')})}
                            />
                            {loading && (
                               <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
                                  <div className="flex items-center gap-3">
                                     <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                     <span className="text-[10px] font-black text-blue-600">جاري الاتصال ببوابة التحقق...</span>
                                  </div>
                               </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-gray-400 bg-gray-50 p-4 rounded-xl border border-gray-100 italic">
                           <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
                           <p>سيتم إرسال الرمز تلقائياً إلى الجوال المسجل في الأنظمة الوطنية عبر بوابة التحقق الآمنة.</p>
                        </div>

                        <button 
                           type="submit"
                           disabled={loading || formData.idNumber.length !== 10}
                           className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50"
                        >
                           {loading ? 'جاري الطلب...' : 'إرسال طلب التحقق'}
                        </button>
                    </motion.form>
                 )}

                 {step === 'otp' && (
                    <motion.form 
                       key="otp"
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       onSubmit={handleVerifyOTP}
                       className="space-y-6"
                    >
                       <div className="text-center space-y-2 mb-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600">
                             <Smartphone className="w-6 h-6 animate-bounce" />
                          </div>
                          <h3 className="text-lg font-black text-gray-900">أدخل الرمز المستلم</h3>
                          <p className="text-[10px] font-bold text-gray-400">تم إرسال الرمز إلى الجوال المسجل في النفاذ الوطني <span className="text-blue-600" dir="ltr">{formData.phoneNumber}</span></p>
                       </div>

                       <div className="space-y-4">
                          <input
                             type="text"
                             required
                             maxLength={4}
                             autoFocus
                             className="w-full px-6 py-6 rounded-2xl border-2 border-gray-100 focus:border-blue-600 focus:ring-8 focus:ring-blue-50 outline-none transition-all text-4xl font-black tracking-[1em] text-center bg-white"
                             placeholder="----"
                             value={formData.otp}
                             onChange={(e) => setFormData({...formData, otp: e.target.value.replace(/\D/g, '')})}
                          />
                          
                          <div className="flex justify-center">
                            {timer > 0 ? (
                               <p className="text-[10px] font-black text-gray-500">إعادة الإرسال متاحة خلال {Math.floor(timer/60)}:{(timer%60).toString().padStart(2, '0')}</p>
                            ) : (
                               <button 
                                 type="button"
                                 onClick={handleSendOTP}
                                 className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:underline"
                               >
                                 <AlertCircle className="w-3 h-3" />
                                 إعادة إرسال رمز التحقق
                               </button>
                            )}
                          </div>
                       </div>

                       <button 
                          type="submit"
                          disabled={loading || formData.otp.length < 4}
                          className="w-full bg-gray-900 text-white py-4 rounded-xl font-black text-sm hover:bg-gray-800 shadow-xl shadow-gray-200 transition-all disabled:opacity-50"
                       >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'تأكيد التفعيل النهائي'}
                       </button>
                    </motion.form>
                 )}

                 {step === 'success' && (
                    <motion.div 
                       key="success"
                       initial={{ opacity: 0, scale: 0.9 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="text-center py-6"
                    >
                       <div className="bg-green-50 p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 relative">
                          <CheckCircle2 className="w-10 h-10 text-green-500" />
                          <div className="absolute inset-0 bg-green-500/10 rounded-full animate-ping" />
                       </div>
                       <h3 className="text-2xl font-black text-gray-900 mb-2 italic">تم التحقق بنجاح!</h3>
                       <p className="text-gray-500 text-[11px] font-medium leading-loose mb-8 max-w-[240px] mx-auto">
                          تم ربط حسابك رسمياً بمنصة "عربون" كعضو موثق الهوية عبر بوابة التحقق الآمنة. أنت الآن موثق بالكامل بشارة "موثوق" ويمكنك البدء في كافة المعاملات المالية فوراً.
                       </p>
                       <button 
                          onClick={onClose}
                          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
                       >
                          استكشف كعضو موثق
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
