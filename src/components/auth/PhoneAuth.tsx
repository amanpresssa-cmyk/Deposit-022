import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, ChevronLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { ConfirmationResult } from 'firebase/auth';

interface PhoneAuthProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const PhoneAuth: React.FC<PhoneAuthProps> = ({ onSuccess, onCancel }) => {
  const { sendOTP, verifyOTP, error, clearError } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) return;

    setLoading(true);
    clearError();
    
    // Ensure phone number starts with + and country code
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+966' + (formattedPhone.startsWith('0') ? formattedPhone.slice(1) : formattedPhone);
    }

    try {
      const result = await sendOTP(formattedPhone, 'recaptcha-container');
      if (result) {
        setConfirmationResult(result);
        setStep('otp');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6 || !confirmationResult) return;

    setLoading(true);
    clearError();
    try {
      await verifyOTP(confirmationResult, otp);
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div id="recaptcha-container"></div>
      
      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.div
            key="phone-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <Phone className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">تسجيل الدخول بالجوال</h2>
              <p className="text-gray-500 font-medium">سوف نرسل لك كود تحقق عبر الرسائل النصية.</p>
            </div>

            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <span className="text-gray-400 font-bold">+966</span>
                </div>
                <input
                  type="tel"
                  placeholder="5xxxxxxxx"
                  className="w-full pl-16 pr-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-left font-bold text-lg"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm font-bold text-center bg-red-50 py-2 rounded-xl border border-red-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || phoneNumber.length < 9}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <span>إرسال الكود</span>
                    <ChevronLeft className="w-5 h-5 group-hover:translate-x-[-4px] transition-transform" />
                  </>
                )}
              </button>
            </form>

            <button
              onClick={onCancel}
              className="w-full text-gray-500 font-bold hover:text-gray-700 transition-all"
            >
              العودة للطرق الأخرى
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-100">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">تأكيد الرمز</h2>
              <p className="text-gray-500 font-medium">أدخل الرمز المكون من 6 أرقام المرسل إلى {phoneNumber}</p>
            </div>

            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <input
                type="text"
                maxLength={6}
                placeholder="------"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-center font-black text-2xl tracking-[0.5em]"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
              />

              {error && (
                <p className="text-red-500 text-sm font-bold text-center bg-red-50 py-2 rounded-xl border border-red-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <span>تأكيد وتسجيل الدخول</span>
                    <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="flex flex-col gap-3 items-center">
              <button
                onClick={() => setStep('phone')}
                className="text-blue-600 font-bold hover:underline"
              >
                تغيير رقم الهاتف
              </button>
              <button
                onClick={onCancel}
                className="text-gray-400 text-sm font-bold hover:text-gray-600 transition-all"
              >
                إلغاء العملية
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
