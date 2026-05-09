import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, AlertCircle, X, CheckCircle2, Smartphone, Loader2 } from 'lucide-react';
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
      // Simulation of SMS OTP sending
      // Integration keys would be used here in a real scenario
      console.log('Sending OTP via mediator for ID:', formData.idNumber);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep('otp');
      setTimer(60);
      toast.success('تم إرسال رمز التحقق إلى جوالك المسجّل في نظام الهوية');
    } catch (err) {
      toast.error('فشل إرسال الرمز، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp.length < 4) return;

    setLoading(true);
    try {
      // Verification logic via SMS mediator integration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Submit verification data and update status
      await submitVerification({
        idNumber: formData.idNumber,
        phoneNumber: formData.phoneNumber,
        agreedToTerms: true
      });

      setStep('success');
    } catch (err) {
      toast.error('رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white sm:bg-black/60 sm:backdrop-blur-sm z-50 flex items-center justify-center sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 1, y: 0 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white sm:rounded-[3rem] w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden relative sm:shadow-2xl flex flex-col md:block"
      >
        <button 
          onClick={onClose}
          className="absolute left-4 top-4 md:left-8 md:top-8 p-2 hover:bg-gray-100 rounded-full transition-colors z-30 bg-white/80 backdrop-blur-sm shadow-sm md:shadow-none"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>

        <div className="grid md:grid-cols-5 h-full overflow-y-auto md:overflow-visible">
           <div className="md:col-span-2 bg-blue-600 p-6 md:p-10 text-white flex flex-col justify-center md:justify-between shrink-0">
              <div>
                <ShieldCheck className="w-10 h-10 md:w-16 md:h-16 mb-4 md:mb-8 text-blue-200 mx-auto md:mx-0" />
                <h2 className="text-xl md:text-3xl font-black mb-2 md:mb-4 text-center md:text-right">توثيق الهوية الرقمي</h2>
                <p className="text-blue-100 text-xs md:text-base font-medium leading-relaxed text-center md:text-right">
                  نظام التوثيق عبر النفاذ الوطني يضمن أمان تعاملاتك وسرعة تفعيل حسابك فوراً.
                </p>
              </div>
              <div className="hidden md:block space-y-3 md:space-y-4 mt-6 md:mt-0">
                 <div className="flex items-center gap-3 text-xs md:text-sm font-bold bg-white/10 p-3 rounded-xl border border-white/10">
                    <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                    توثيق عبر رقم الجوال
                 </div>
                 <div className="flex items-center gap-3 text-xs md:text-sm font-bold bg-white/10 p-3 rounded-xl border border-white/10">
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                    تفعيل فوري للحساب
                 </div>
              </div>
           </div>

           <div className="md:col-span-3 p-6 md:p-10 flex flex-col justify-center">
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
                          <h3 className="text-2xl font-black text-gray-900 border-r-4 border-blue-600 pr-3">التوثيق السريع</h3>
                          <p className="text-gray-500 font-medium leading-relaxed">سيتم التحقق من هويتك عبر الرمز المرسل لجوالك المسجل في أبشر/النفاذ الوطني.</p>
                       </div>

                       <div className="space-y-4">
                          <div className="flex gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
                             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                <Smartphone className="w-6 h-6" />
                             </div>
                             <div>
                                <h4 className="font-black text-gray-900">بدون رفع مستندات</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">لا حاجة لتصوير الهوية يدوياً</p>
                             </div>
                          </div>
                       </div>

                       <button 
                          onClick={() => setStep('form')}
                          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
                       >
                          بدء التوثيق الآن
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
                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-500 block mr-1 text-right uppercase tracking-widest">رقم الهوية الوطنية / الإقامة</label>
                          <input
                             type="text"
                             required
                             maxLength={10}
                             className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-xl font-black tracking-[0.3em] text-center"
                             placeholder="1XXXXXXXXX"
                             value={formData.idNumber}
                             onChange={(e) => setFormData({...formData, idNumber: e.target.value.replace(/\D/g, '')})}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-500 block mr-1 text-right uppercase tracking-widest">رقم الجوال المرتبط بالهوية</label>
                          <div className="relative">
                            <input
                               type="tel"
                               required
                               placeholder="05XXXXXXXX"
                               className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-xl font-black text-center"
                               value={formData.phoneNumber}
                               onChange={(e) => setFormData({...formData, phoneNumber: e.target.value.replace(/\D/g, '')})}
                            />
                             <Smartphone className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                          </div>
                       </div>

                       <button 
                          type="submit"
                          disabled={loading || formData.idNumber.length !== 10 || formData.phoneNumber.length < 10}
                          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50"
                       >
                          {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'إرسال رمز التحقق'}
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
                          <h3 className="text-xl font-black text-gray-900">أدخل رمز التحقق</h3>
                          <p className="text-xs font-bold text-gray-400">تم إرسال الرمز إلى {formData.phoneNumber}</p>
                       </div>

                       <div className="space-y-4">
                          <input
                             type="text"
                             required
                             maxLength={4}
                             autoFocus
                             className="w-full px-6 py-6 rounded-3xl border-2 border-gray-100 focus:border-blue-500 focus:ring-8 focus:ring-blue-50 outline-none transition-all text-4xl font-black tracking-[1em] text-center"
                             placeholder="----"
                             value={formData.otp}
                             onChange={(e) => setFormData({...formData, otp: e.target.value.replace(/\D/g, '')})}
                          />
                          
                          <div className="flex justify-center">
                            {timer > 0 ? (
                               <p className="text-[10px] font-black text-gray-400">إعادة الإرسال خلال {timer} ثانية</p>
                            ) : (
                               <button 
                                 type="button"
                                 onClick={handleSendOTP}
                                 className="text-[10px] font-black text-blue-600 underline"
                               >
                                 إعادة إرسال الرمز
                               </button>
                            )}
                          </div>
                       </div>

                       <button 
                          type="submit"
                          disabled={loading || formData.otp.length < 4}
                          className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-gray-800 shadow-xl shadow-gray-200 transition-all disabled:opacity-50"
                       >
                          {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'تأكيد التفعيل'}
                       </button>
                       
                       <button 
                          type="button" 
                          onClick={() => setStep('form')}
                          className="w-full text-xs font-black text-gray-400 py-2"
                        >
                          تعديل رقم الهوية / الجوال
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
                       <div className="bg-green-50 p-8 rounded-full w-28 h-28 flex items-center justify-center mx-auto mb-8 relative">
                          <CheckCircle2 className="w-14 h-14 text-green-500" />
                          <div className="absolute inset-0 bg-green-500/10 rounded-full animate-ping" />
                       </div>
                       <h3 className="text-3xl font-black text-gray-900 mb-4 italic">تم التوثيق بنجاح!</h3>
                       <p className="text-gray-500 font-medium leading-loose mb-10 max-w-sm mx-auto">
                          مبروك! حسابك الآن موثق بالكامل بشارة "موثوق" ويمكنك البدء في كافة المعاملات المالية فوراً.
                       </p>
                       <button 
                          onClick={onClose}
                          className="w-full bg-blue-600 text-white py-4 rounded-3xl font-black text-lg hover:bg-blue-700 shadow-2xl shadow-blue-100 transition-all"
                       >
                          استكشف المنصة كعضو موثق
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
