import React from 'react';
import { MessageCircle, X, Send, Phone, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SupportButton: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="w-80 bg-white rounded-[2rem] border border-gray-100 shadow-2xl p-6 pointer-events-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-sm">الدعم الفني المباشر</h4>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] text-gray-400 font-bold">متصل الآن</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
              مرحباً بك في عربون! كيف يمكننا مساعدتك اليوم؟ فريقنا جاهز للرد على استفساراتك وحل أي مشكلة تقنية.
            </p>

            <a 
              href="https://wa.me/966501505813" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white py-4 rounded-2xl font-black hover:scale-[1.02] transition-all shadow-lg shadow-green-100"
            >
              <Phone className="w-5 h-5" />
              المحادثة عبر واتساب
            </a>
            
            <div className="mt-4 text-center">
              <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">متاح على مدار الساعة</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        animate={{ 
          y: isOpen ? 0 : [0, -10, 0],
        }}
        transition={{ 
          repeat: isOpen ? 0 : Infinity,
          duration: 2,
          ease: "easeInOut"
        }}
        className="w-16 h-16 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-200 hover:scale-110 active:scale-95 transition-all pointer-events-auto"
      >
        <MessageCircle className="w-8 h-8" />
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-4 border-white rounded-full"></span>
        )}
      </motion.button>
    </div>
  );
};
