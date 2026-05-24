import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, MessageSquare, Send, ShieldCheck, Heart } from 'lucide-react';
import { OrderRating } from '../OrderRating';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  type: 'buyer-to-seller' | 'seller-to-buyer';
  isFirstOrder: boolean;
  onSuccess: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  orderId,
  reviewerId,
  revieweeId,
  type,
  isFirstOrder,
  onSuccess
}) => {
  const { user } = useAuth();
  const [platformRating, setPlatformRating] = useState(0);
  const [platformComment, setPlatformComment] = useState('');
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformSuccess, setPlatformSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePlatformSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformRating || platformLoading || !user) return;
    
    setPlatformLoading(true);
    try {
      await addDoc(collection(db, 'platform_feedback'), {
        userId: user.uid,
        userName: user.displayName || 'مستخدم',
        comment: platformComment,
        rating: platformRating,
        orderId, // Link feedback to this order context
        createdAt: serverTimestamp()
      });
      setPlatformSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setPlatformLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-gray-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 shrink-0">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-400 fill-orange-400" />
              تقييم الطلب
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-4 space-y-4 overflow-y-auto w-full">
            {/* 1. Order Rating (Primary) */}
            <OrderRating 
              orderId={orderId}
              reviewerId={reviewerId}
              revieweeId={revieweeId}
              type={type}
              onSuccess={() => {
                onSuccess();
                // We delay closing here slightly so they can see both success states if applicable
                setTimeout(() => {
                  onClose();
                }, 2000);
              }}
            />

            {/* 2. Platform Feedback (Optional for first orders) */}
            {isFirstOrder && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5 text-blue-500 fill-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">كيف كانت تجربتك مع عربون؟</h3>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5">بما أن هذا طلبك الأول، يهمنا رأيك بالمنصة (اختياري)</p>
                  </div>
                </div>

                {platformSuccess ? (
                  <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex items-center gap-2 text-green-700">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-bold">تم إرسال رأيك بالمنصة بنجاح. شكراً لك!</span>
                  </div>
                ) : (
                  <form onSubmit={handlePlatformSubmit} className="space-y-3">
                    <div className="flex gap-1 justify-center bg-gray-50 p-2 rounded-xl">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPlatformRating(s)}
                          className={`p-1.5 transition-all transform hover:scale-110 focus:outline-none ${platformRating >= s ? 'text-orange-400' : 'text-gray-300'}`}
                        >
                          <Star className={`w-6 h-6 ${platformRating >= s ? 'fill-orange-400' : ''}`} />
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <MessageSquare className="absolute right-2.5 top-2.5 text-gray-400 w-3 h-3" />
                      <textarea
                        value={platformComment}
                        onChange={(e) => setPlatformComment(e.target.value)}
                        placeholder="ما رأيك في سهولة استخدام المنصة؟ (اختياري)..."
                        className="w-full pr-8 pl-3 py-2 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all text-[11px] font-medium text-gray-700 min-h-[50px] resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={platformRating === 0 || platformLoading}
                      className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-gray-200"
                    >
                      {platformLoading ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          إرسال تقييم المنصة
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
