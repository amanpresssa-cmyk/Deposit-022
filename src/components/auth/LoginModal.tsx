import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, Phone, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PhoneAuth } from './PhoneAuth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [method, setMethod] = useState<'selection' | 'phone'>('selection');

  const handleGoogleLogin = async () => {
    await login();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl relative z-10"
          >
            <div className="absolute top-6 left-6">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-8 pb-4 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-blue-100">
                <Shield className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2">مرحباً بك في عربون</h2>
              <p className="text-gray-500 font-medium leading-relaxed">
                سجل دخولك الآن للبدء في استخدام منصة الوساطة المالية الأكثر أماناً.
              </p>
            </div>

            <div className="p-8 pt-4">
              <AnimatePresence mode="wait">
                {method === 'selection' ? (
                  <motion.div
                    key="selection"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4"
                  >
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full bg-white border-2 border-gray-100 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-3 group"
                    >
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
                      <span>تسجيل الدخول عبر جوجل</span>
                    </button>

                    <button
                      onClick={() => setMethod('phone')}
                      className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3"
                    >
                      <Phone className="w-6 h-6" />
                      <span>تسجيل الدخول عبر الجوال</span>
                    </button>

                    <div className="pt-4 border-t border-gray-100 flex flex-col items-center gap-2 mt-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">أو تصفح عبر الجوال مباشرة</span>
                      <a
                        href="/arboon.apk"
                        download="arboon.apk"
                        className="w-full bg-slate-950 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-md border border-slate-900"
                      >
                        <svg className="w-4 h-4 text-green-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.5 1h-11C5.12 1 4 2.12 4 3.5v17C4 21.88 5.12 23 6.5 23h11c1.38 0 2.5-1.12 2.5-2.5v-17C20 2.12 18.88 1 17.5 1zm-5.5 21c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm6-5H6V4h12v13z" />
                        </svg>
                        <span>تحميل تطبيق الأندرويد مباشرة (APK)</span>
                        <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    </div>

                    <div className="pt-4 text-center">
                      <p className="text-xs text-gray-400 font-medium px-4">
                        بتسجيلك في المنصة، أنت توافق على <a href="#" className="text-blue-600 hover:underline">شروط الاستخدام</a> و <a href="#" className="text-blue-600 hover:underline">سياسة الخصوصية</a>.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <PhoneAuth 
                    onSuccess={onClose} 
                    onCancel={() => setMethod('selection')} 
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="p-4 bg-gray-50 text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <Shield className="w-3 h-3" />
              تشفير البيانات وحماية الخصوصية 100%
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
