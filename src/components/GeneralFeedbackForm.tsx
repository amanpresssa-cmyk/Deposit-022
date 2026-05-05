import React, { useState } from 'react';
import { Send, Star, MessageSquare, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';

export const GeneralFeedbackForm: React.FC = () => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment || loading) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'platform_feedback'), {
        userId: user?.uid || 'anonymous',
        userName: user?.displayName || 'زائر',
        comment,
        rating,
        createdAt: serverTimestamp()
      });
      setSuccess(true);
      setComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-green-600 rounded-[3rem] p-12 text-white text-center shadow-2xl shadow-green-100"
      >
        <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-green-200" />
        <h3 className="text-3xl font-black mb-4">شكراً لمساهمتك!</h3>
        <p className="text-green-100 text-lg mb-8">رأيك يهمنا ويساعدنا في تطوير منصة عربون للأفضل.</p>
        <button 
          onClick={() => setSuccess(false)}
          className="bg-white text-green-600 px-8 py-4 rounded-2xl font-bold hover:bg-green-50 transition-all"
        >
          إرسال رأي آخر
        </button>
      </motion.div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
      
      <div className="relative z-10 max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-4xl font-black">ما رأيك في <span className="text-blue-400">تجربتك</span> معنا؟</h2>
          <p className="text-slate-400 text-lg">نحن هنا لنسمع منك. شاركنا تجربتك أو مقترحاتك لتحسين الخدمة.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                className={`p-2 transition-all ${rating >= s ? 'text-blue-400 scale-110' : 'text-slate-700'}`}
              >
                <Star className={`w-8 h-8 ${rating >= s ? 'fill-blue-400' : ''}`} />
              </button>
            ))}
          </div>

          <div className="relative">
            <MessageSquare className="absolute right-6 top-6 text-slate-500 w-6 h-6" />
            <textarea
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="شاركنا رأيك هنا..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-[2rem] pr-16 pl-6 py-6 text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[150px]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !comment}
            className="bg-blue-600 text-white w-full py-5 rounded-2xl font-black text-xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? 'جاري الإرسال...' : (
              <>
                <Send className="w-6 h-6" />
                إرسال الرأي
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
