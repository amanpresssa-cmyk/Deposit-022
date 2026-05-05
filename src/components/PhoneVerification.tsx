import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ConfirmationResult } from 'firebase/auth';
import { Phone, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PhoneVerificationProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({ onSuccess, onClose }) => {
  const { sendOTP, verifyOTP, error, clearError } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();

    // Basic phone validation (Saudi format example)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+966${phoneNumber.replace(/^0/, '')}`;
    
    try {
      const result = await sendOTP(formattedPhone, 'recaptcha-auto');
      if (result) {
        setConfirmationResult(result);
        setStep('verify');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;

    setLoading(true);
    clearError();

    try {
      await verifyOTP(confirmationResult, otp);
      if (onSuccess) onSuccess();
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
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden relative shadow-2xl"
      >
        <button 
          onClick={onClose}
          className="absolute left-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>

        <div className="p-10">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-50 p-5 rounded-[2rem]">
              <ShieldCheck className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">تأكيد رقم الجوال</h2>
          <p className="text-gray-500 text-center mb-8">
            تأكيد جوالك يزيد من موثوقيتك في "عربون" ويضمن أمان صفقاتك
          </p>

          <AnimatePresence mode="wait">
            {step === 'input' ? (
              <motion.form 
                key="input"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSendOTP} 
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 block mr-1">رقم الجوال</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="5XXXXXXXX"
                      className="w-full pl-4 pr-12 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-lg tracking-widest"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    <Phone className="absolute right-4 top-4.5 w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-400 mr-1">مثال: 05XXXXXXXX</p>
                </div>

                <div id="recaptcha-auto"></div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50"
                >
                  {loading ? 'جاري الإرسال...' : 'إرسال كود التحقق'}
                </button>
              </motion.form>
            ) : (
              <motion.form 
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOTP} 
                className="space-y-6"
              >
                <div className="space-y-2 text-center">
                  <label className="text-sm font-bold text-gray-700 block">أدخل الكود المكوّن من 6 أرقام</label>
                  <p className="text-xs text-blue-600 mb-4">تم إرسال الكود إلى {phoneNumber}</p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    dir="ltr"
                    className="w-full px-4 py-5 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-3xl text-center font-bold tracking-[0.5em]"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 shadow-xl shadow-green-100 transition-all disabled:opacity-50"
                >
                  {loading ? 'جاري التأكيد...' : 'تأكيد الحساب الآن'}
                </button>

                <button 
                  type="button"
                  onClick={() => setStep('input')}
                  className="w-full text-gray-400 text-sm py-2 hover:text-gray-600"
                >
                  تعديل رقم الجوال؟
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
