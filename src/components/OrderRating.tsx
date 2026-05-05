import React, { useState } from 'react';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Star, MessageSquare, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendAdminNotification, recordAuditLog } from '../lib/notificationService';

interface OrderRatingProps {
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  type: 'buyer-to-seller' | 'seller-to-buyer';
  onSuccess: () => void;
}

export const OrderRating: React.FC<OrderRatingProps> = ({ orderId, reviewerId, revieweeId, type, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setLoading(true);
    try {
      // 1. Add the review document
      await addDoc(collection(db, 'reviews'), {
        orderId,
        reviewerId,
        revieweeId,
        rating,
        comment,
        type,
        createdAt: serverTimestamp()
      });

      // 2. Calculate dynamic rating change
      let ratingChange = 0;
      if (rating >= 4) ratingChange = 0.1;
      else if (rating <= 2) ratingChange = -0.1;

      // 3. Update reviewee's stats and trustLevel
      const userRef = doc(db, 'users', revieweeId);
      const userSnap = await getDoc(userRef);
      const currentRating = userSnap.data()?.rating || 3;
      const newRating = Math.min(5, Math.max(0, currentRating + ratingChange));

      await updateDoc(userRef, {
        reviewsCount: increment(1),
        rating: newRating,
        trustLevel: increment(rating >= 4 ? 5 : -5) 
      });

      // 4. Audit Log
      await recordAuditLog({
        action: 'order_rated',
        targetId: revieweeId,
        details: { rating, comment, orderId }
      });

      // 5. Notifications
      if (rating <= 2) {
        await sendAdminNotification(
          'تقييم سيء لمستخدم',
          `تلقى المستخدم ${revieweeId} تقييماً سيئاً (${rating} نجوم) مع تعليق: ${comment}`,
          revieweeId
        );
      } else {
        await sendAdminNotification(
          'تقييم جديد',
          `تلقى المستخدم ${revieweeId} تقييماً جديداً (${rating} نجوم)`,
          revieweeId
        );
      }

      // 6. Update order status to mark rating as completed
      const orderRef = doc(db, 'orders', orderId);
      if (type === 'buyer-to-seller') {
        await updateDoc(orderRef, { buyerRatingCompleted: true });
      } else {
        await updateDoc(orderRef, { sellerRatingCompleted: true });
      }

      onSuccess();
    } catch (error) {
      console.error("Error submitting rating:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-xl shadow-blue-100/20"
    >
      <div className="text-center mb-8">
        <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
           <Star className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">
           {type === 'buyer-to-seller' ? 'كيف كانت تجربتك مع البائع؟' : 'كيف كان التعامل مع العميل؟'}
        </h3>
        <p className="text-gray-500 font-medium">تقييمك الصادق يساعد في بناء مجتمع أكثر أماناً.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex justify-center gap-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="transition-all transform hover:scale-125 focus:outline-none"
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
            >
              <Star
                className={`w-12 h-12 ${
                  star <= (hover || rating) ? 'fill-orange-400 text-orange-400' : 'text-gray-200'
                } transition-colors`}
              />
            </button>
          ))}
        </div>

        <div className="relative">
          <MessageSquare className="absolute right-4 top-4 text-gray-400 w-5 h-5" />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="اكتب تعليقك هنا (اختياري)..."
            className="w-full pr-12 pl-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-700 min-h-[120px]"
          />
        </div>

        <button
          type="submit"
          disabled={rating === 0 || loading}
          className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
             <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
               <Send className="w-6 h-6" />
               إرسال التقييم
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};
