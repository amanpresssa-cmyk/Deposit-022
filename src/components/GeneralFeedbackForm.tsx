import React, { useState, useEffect } from 'react';
import { Send, Star, MessageSquare, ShieldCheck, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { addDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';

export const GeneralFeedbackForm: React.FC = () => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasRecentFeedback, setHasRecentFeedback] = useState(false);
  const [nextSubmissionDate, setNextSubmissionDate] = useState<Date | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const checkFeedbackStatus = async () => {
      if (!user) {
        setCheckingStatus(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'platform_feedback'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const lastFeedback = querySnapshot.docs[0].data();
          const createdAt = lastFeedback.createdAt as Timestamp;
          
          if (createdAt) {
            const lastDate = createdAt.toDate();
            const sevenDaysLater = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            const now = new Date();

            if (now < sevenDaysLater) {
              setHasRecentFeedback(true);
              setNextSubmissionDate(sevenDaysLater);
            }
          }
        }
      } catch (err) {
        console.error('Error checking feedback status:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkFeedbackStatus();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment || loading || hasRecentFeedback) return;
    
    setLoading(true);
    try {
      if (!user) {
        alert('يرجى تسجيل الدخول أولاً لإرسال رأيك');
        return;
      }
      await addDoc(collection(db, 'platform_feedback'), {
        userId: user.uid,
        userName: user.displayName || 'مستخدم',
        comment,
        rating,
        createdAt: serverTimestamp()
      });
      setSuccess(true);
      setComment('');
      
      // Update local state to reflect new submission
      setHasRecentFeedback(true);
      setNextSubmissionDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="bg-gray-900 rounded-[2rem] p-12 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (hasRecentFeedback && !success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-[2rem] p-8 md:p-12 text-white border border-gray-800 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-[40px] -mr-16 -mt-16"></div>
        <div className="relative z-10 text-center space-y-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl md:text-3xl font-black">نشكرك على مشاركتك الدائمة!</h3>
            <p className="text-slate-400 text-sm md:text-lg max-w-xl mx-auto leading-relaxed italic">
              لقد قمت بإرسال رأيك بالفعل. يمكنك إضافة تعليق جديد كل أسبوع للمساهمة في تحسين المنصة.
            </p>
          </div>
          {nextSubmissionDate && (
             <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-blue-400 text-xs md:text-sm font-bold">
               <ShieldCheck className="w-4 h-4" />
               متاح لك التعليق القادم في: {nextSubmissionDate.toLocaleDateString('ar-SA')}
             </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-green-600 rounded-[2rem] p-8 text-white text-center shadow-xl shadow-green-100"
      >
        <ShieldCheck className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 text-green-200" />
        <h3 className="text-xl md:text-3xl font-black mb-2 md:mb-4">شكراً لمساهمتك!</h3>
        <p className="text-green-100 text-sm md:text-lg mb-6 md:mb-8">رأيك يهمنا ويساعدنا في تطوير منصة عربون للأفضل.</p>
        <div className="text-xs font-bold bg-white/20 p-3 rounded-xl inline-block">
          تم استلام رأيك بنجاح. يمكنك إضافة تعليق جديد في غضون أسبوع.
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-[2rem] p-6 md:p-12 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 md:w-64 md:h-64 bg-blue-600/10 rounded-full blur-[60px] md:blur-[100px] -mr-20 -mt-20 md:-mr-32 md:-mt-32"></div>
      
      <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6 md:space-y-8">
        <div className="space-y-2 md:space-y-4">
          <h2 className="text-xl md:text-4xl font-black">ما رأيك في <span className="text-blue-400">تجربتك</span> معنا؟</h2>
          <p className="text-slate-400 text-xs md:text-lg">نحن هنا لنسمع منك. شاركنا تجربتك أو مقترحاتك لتحسين الخدمة.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {!user && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 md:p-4 rounded-xl md:rounded-2xl text-blue-300 text-[10px] md:text-sm font-bold">
              يرجى تسجيل الدخول لتتمكن من مشاركتنا رأيك وتتبع مراجعتك.
            </div>
          )}
          <div className="flex justify-center gap-1.5 md:gap-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                className={`p-1.5 md:p-2 transition-all ${rating >= s ? 'text-orange-400 scale-110' : 'text-slate-700'}`}
              >
                <Star className={`w-8 h-8 ${rating >= s ? 'fill-orange-400' : ''}`} />
              </button>
            ))}
          </div>

          <div className="relative">
            <MessageSquare className="absolute right-4 top-4 md:right-6 md:top-6 text-slate-500 w-5 h-5 md:w-6 md:h-6" />
            <textarea
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="شاركنا رأيك هنا..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl md:rounded-[2rem] pr-12 md:pr-16 pl-4 md:pl-6 py-4 md:py-6 text-sm md:text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[120px] md:min-h-[150px]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !comment}
            className="bg-blue-600 text-white w-full py-3 md:py-5 rounded-xl md:rounded-2xl font-black text-sm md:text-xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 md:gap-3 disabled:opacity-50"
          >
            {loading ? 'جاري الإرسال...' : (
              <>
                <Send className="w-5 h-5 md:w-6 md:h-6" />
                إرسال الرأي
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
