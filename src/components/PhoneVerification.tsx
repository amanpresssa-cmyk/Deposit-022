import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, CheckCircle2, AlertCircle, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ConfirmationResult } from 'firebase/auth';

interface PhoneVerificationProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({ onSuccess, onClose }) => {
  const { sendOTP, verifyOTP, error, clearError } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) return;
    
    setLoading(true);
    clearError();
    
    try {
      // Ensure the recaptcha container is present in the DOM
      const result = await sendOTP(phoneNumber.startsWith('+') ? phoneNumber : `+966${phoneNumber.replace(/^0/, '')}`, 'recaptcha-container');
      if (result) {
        setConfirmationResult(result);
        setShowOtpInput(true);
        setTimer(60);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !confirmationResult) return;
    
    setLoading(true);
    clearError();
    
    try {
      await verifyOTP(confirmationResult, verificationCode);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative">
      <div id="recaptcha-container"></div>
      
      <div className="p-8 text-center border-b border-gray-50">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
          <Phone className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 leading-tight">توثيق رقم الجوال</h3>
        <p className="text-gray-500 mt-2 text-sm">خطوة أساسية لضمان أمان حسابك وعملياتك المالية</p>
      </div>

      <div className="p-8 space-y-6">
        <AnimatePresence mode="wait">
          {!showOtpInput ? (
            <motion.form
              key="phone-input"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSendCode}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block text-right">رقم الجوال</label>
                <div className="relative">
                  <input
                    type="tel"
                    dir="ltr"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-16 text-lg font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
                    placeholder="5XXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    required
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-gray-200 pr-3 pointer-events-none">
                    <span className="text-gray-400 font-bold text-sm">+966</span>
                    <img src="https://flagcdn.com/w20/sa.png" alt="SA" className="w-4 h-3 rounded-sm" />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-medium text-right">* سيتم إرسال كود تحقق مكون من 6 أرقام عبر SMS</p>
              </div>

              {error && (
                <div className="flex gap-2 items-center bg-red-50 text-red-600 p-4 rounded-xl text-xs border border-red-100 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="font-bold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || phoneNumber.length < 9}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>إرسال كود التحقق</span>
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="otp-input"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyCode}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 font-medium">تم إرسال الكود إلى الرقم</p>
                  <p className="text-lg font-black text-gray-900" dir="ltr">+966 {phoneNumber}</p>
                  <button 
                    type="button" 
                    onClick={() => setShowOtpInput(false)}
                    className="text-blue-600 text-xs font-bold underline mt-1"
                  >
                    تعديل الرقم
                  </button>
                </div>

                <div className="flex justify-center gap-2" dir="ltr">
                  <input
                    type="text"
                    maxLength={6}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center text-2xl font-black tracking-[0.5em] focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-200"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="flex gap-2 items-center bg-red-50 text-red-600 p-4 rounded-xl text-xs border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="font-bold">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || verificationCode.length < 6}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : 'تأكيد الرمز'}
                </button>
                
                <div className="text-center">
                  {timer > 0 ? (
                    <p className="text-xs text-gray-400 font-medium">يمكنك إعادة الإرسال خلال {timer} ثانية</p>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleSendCode}
                      className="text-blue-600 text-xs font-black hover:underline"
                    >
                      إعادة إرسال الكود
                    </button>
                  )}
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-gray-50 text-[10px] text-center text-gray-400 flex items-center justify-center gap-2">
        <ShieldCheck className="w-3 h-3" />
        مدعوم من منصة عربون - خدمة التوثيق الوطنية
      </div>
      
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
