import React, { useState, useEffect } from 'react';
import { Share, SquarePlus, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const InstallPWAHint: React.FC = () => {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window as any).navigator.standalone;
    
    // Check if user has seen hint recently
    const hasSeenHint = localStorage.getItem('pwa_hint_shown');
    
    // Simple check for mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && !isStandalone && !hasSeenHint) {
      const timer = setTimeout(() => setShowHint(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeHint = () => {
    setShowHint(false);
    localStorage.setItem('pwa_hint_shown', 'true');
  };

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <AnimatePresence>
      {showHint && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-[60] bg-white rounded-2xl shadow-2xl border border-blue-100 p-5 rtl"
          dir="rtl"
        >
          <button 
            onClick={closeHint}
            className="absolute top-3 left-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="bg-blue-600 p-3 rounded-xl shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900">ثبّت "عربون" على جوالك</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                استمتع بتجربة أسرع وسهولة في تتبع طلباتك عبر إضافة المنصة لشاشتك الرئيسية.
              </p>
              
              <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100 italic text-[11px] text-gray-600 space-y-2">
                {isIOS ? (
                  <p className="flex items-center gap-2">
                    اضغط على <Share className="w-4 h-4 inline text-blue-500" /> ثم اختر <span className="font-bold">"إضافة إلى الشاشة الرئيسية"</span>
                  </p>
                ) : (
                  <p className="flex items-center gap-2">
                    اضغط على <SquarePlus className="w-4 h-4 inline text-blue-500" /> في شريط العنوان أو خيارات المتصفح ثم <span className="font-bold">"تثبيت التطبيق"</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
