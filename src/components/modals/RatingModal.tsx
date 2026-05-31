import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, MessageSquare, Send, CheckCircle2, Heart } from 'lucide-react';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { sendAdminNotification, recordAuditLog, updateSellerPerformance } from '../../lib/notificationService';
import { motion } from 'motion/react';

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
  
  // Order Rating State
  const [orderRating, setOrderRating] = useState(0);
  const [orderHover, setOrderHover] = useState(0);
  const [orderComment, setOrderComment] = useState('');
  
  // Platform Rating State
  const [platformRating, setPlatformRating] = useState(0);
  const [platformHover, setPlatformHover] = useState(0);
  const [platformComment, setPlatformComment] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderRating === 0) {
      alert('الرجاء اختيار تقييم الصفقة بالنجوم أولاً.');
      return;
    }
    if (!revieweeId || revieweeId === 'unknown') {
      alert('لا يمكن إرسال التقييم: حساب الطرف الآخر غير معروف.');
      return;
    }
    if (loading || !user) return;
    
    setLoading(true);
    try {
      // 1. Submit Platform Feedback (if provided)
      if (isFirstOrder && platformRating > 0) {
        try {
          await addDoc(collection(db, 'platform_feedback'), {
            userId: user.uid,
            userName: user.displayName || 'مستخدم',
            comment: platformComment,
            rating: platformRating,
            orderId,
            createdAt: serverTimestamp()
          });
        } catch(e) { console.error('Platform rating failed', e); throw new Error('فشل تقييم المنصة'); }
      }

      // 2. Submit Order Rating
      try {
        await addDoc(collection(db, 'reviews'), {
          orderId,
          reviewerId,
          revieweeId,
          rating: orderRating,
          comment: orderComment,
          type,
          createdAt: serverTimestamp()
        });
      } catch(e) { console.error('Reviews addDoc failed', e); throw new Error('فشل إضافة تقييم الصفقة'); }

      // Calculate dynamic rating change
      let ratingChange = 0;
      if (orderRating >= 4) ratingChange = 0.1;
      else if (orderRating <= 2) ratingChange = -0.1;

      // Update reviewee stats
      const userRef = doc(db, 'users', revieweeId);
      const userSnap = await getDoc(userRef);
      const currentRating = userSnap.data()?.rating || 3;
      const newRating = Math.min(5, Math.max(0, currentRating + ratingChange));

      try {
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            reviewsCount: increment(1),
            rating: newRating,
            trustLevel: increment(orderRating >= 4 ? 5 : -5) 
          });
        } else {
          await setDoc(userRef, {
            reviewsCount: 1,
            rating: newRating,
            trustLevel: orderRating >= 4 ? 5 : -5
          }, { merge: true });
        }
      } catch(e) { console.error('Users updateDoc failed', e); throw new Error('فشل تحديث ملف المستخدم'); }

      // Audit Log & Notifications
      try {
        await recordAuditLog({
          action: 'order_rated',
          targetId: revieweeId,
          details: { rating: orderRating, comment: orderComment, orderId }
        });
      } catch(e) { console.error('Audit log failed', e); throw new Error('فشل سجل النظام'); }

      try {
        if (orderRating <= 2) {
          await sendAdminNotification(
            'تقييم سيء لمستخدم',
            `تلقى المستخدم ${revieweeId} تقييماً سيئاً (${orderRating} نجوم) مع تعليق: ${orderComment}`,
            revieweeId
          );
        } else {
          await sendAdminNotification(
            'تقييم جديد',
            `تلقى المستخدم ${revieweeId} تقييماً جديداً (${orderRating} نجوم)`,
            revieweeId
          );
        }
      } catch(e) { console.error('Admin notif failed', e); throw new Error('فشل إرسال الإشعار'); }

      // Update order status
      const orderRef = doc(db, 'orders', orderId);
      try {
        if (type === 'buyer-to-seller') {
          await updateDoc(orderRef, { 
            buyerRatingCompleted: true,
            sellerRating: orderRating
          });
        } else {
          await updateDoc(orderRef, { 
            sellerRatingCompleted: true,
            buyerRating: orderRating
          });
        }
      } catch(e) { console.error('Orders updateDoc failed', e); throw new Error('فشل تحديث حالة الطلب'); }

      // Update Performance
      await updateSellerPerformance(revieweeId);

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error("Error submitting rating:", error);
      alert(`حدث خطأ أثناء التقييم: ${error?.message || 'تأكد من تحديث قواعد Firebase.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-gray-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-orange-400 fill-orange-400" />
            تقييم الطلب
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto w-full">
          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 p-6 rounded-2xl border border-green-100 flex flex-col items-center justify-center text-center shadow-sm"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-green-900 mb-2">تم التقييم بنجاح</h3>
              <p className="text-sm text-green-700 font-medium">شكراً لمساهمتك في بناء مجتمع آمن</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* 1. Order Rating (Primary) */}
              <div className="bg-white p-4 rounded-2xl border border-blue-50 shadow-sm">
                <div className="text-center mb-4">
                  <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3">
                     <Star className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-black text-gray-900 mb-1">
                     {type === 'buyer-to-seller' ? 'كيف كانت تجربتك مع الطرف الآخر؟' : 'كيف كان تعاملك مع المشتري؟'}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">تقييمك يساعدنا في حفظ حقوق الجميع.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="transition-all transform hover:scale-110 focus:outline-none p-1.5"
                        onMouseEnter={() => setOrderHover(star)}
                        onMouseLeave={() => setOrderHover(0)}
                        onClick={() => setOrderRating(star)}
                      >
                        <Star className={`w-7 h-7 ${star <= (orderHover || orderRating) ? 'fill-orange-400 text-orange-400' : 'text-gray-200'} transition-colors`} />
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <MessageSquare className="absolute right-3 top-3 text-gray-400 w-4 h-4" />
                    <textarea
                      value={orderComment}
                      onChange={(e) => setOrderComment(e.target.value)}
                      placeholder="اكتب تعليقك هنا (اختياري)..."
                      className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all text-xs font-medium text-gray-700 min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Platform Feedback (Optional for first orders) */}
              {isFirstOrder && (
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                      <Heart className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900">كيف كانت تجربتك مع عربون؟</h3>
                      <p className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5">تهمنا معرفة رأيك بالمنصة (اختياري)</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-1 justify-center bg-gray-50 p-2 rounded-xl">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseEnter={() => setPlatformHover(s)}
                          onMouseLeave={() => setPlatformHover(0)}
                          onClick={() => setPlatformRating(s)}
                          className="p-1.5 transition-all transform hover:scale-110 focus:outline-none"
                        >
                          <Star className={`w-6 h-6 ${s <= (platformHover || platformRating) ? 'fill-gray-700 text-gray-700' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <MessageSquare className="absolute right-2.5 top-2.5 text-gray-400 w-3 h-3" />
                      <textarea
                        value={platformComment}
                        onChange={(e) => setPlatformComment(e.target.value)}
                        placeholder="ما رأيك في سهولة استخدام المنصة؟..."
                        className="w-full pr-8 pl-3 py-2 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-50 transition-all text-[11px] font-medium text-gray-700 min-h-[50px] resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* UNIFIED SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    إرسال التقييم {isFirstOrder && platformRating > 0 ? 'الشامل' : ''}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
