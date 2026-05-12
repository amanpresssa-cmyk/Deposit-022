import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Quote, User, Briefcase, EyeOff, ShieldCheck } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';

interface Testimonial {
  id: string;
  name: string;
  role: 'buyer' | 'seller';
  comment: string;
  rating: number;
  userId?: string;
  isHidden?: boolean;
}

export const TestimonialSlider: React.FC = () => {
  const { user, profile } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Logic: 
    // 1. Public sees only rating >= 4
    // 2. Author sees their own feedback regardless of rating
    // 3. Admin sees everything
    const feedbackRef = collection(db, 'platform_feedback');
    const q = query(feedbackRef, orderBy('rating', 'desc'), orderBy('createdAt', 'desc'), limit(6));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      const filtered = items.filter(item => {
        const isHighRating = item.rating >= 4;
        const isAuthor = user && item.userId === user.uid;
        const isAdmin = profile?.isAdmin;
        return isHighRating || isAuthor || isAdmin;
      }).map(item => ({
        ...item,
        name: item.userName || 'مستخدم',
        role: 'buyer', // Default role for feedback
        isHidden: item.rating < 4
      }));

      setTestimonials(filtered);
      setLoading(false);
    }, (error) => {
      console.warn('Testimonial snapshot error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, profile]);

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-64 bg-gray-50 rounded-[2.5rem] animate-pulse border border-gray-100" />
      ))}
    </div>
  );

  if (testimonials.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {testimonials.map((t, idx) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
          whileHover={{ y: -8, scale: 1.02 }}
          className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden flex flex-col h-full group"
        >
          <Quote className="absolute top-6 right-6 w-16 h-16 text-blue-50 opacity-40 -rotate-12 group-hover:scale-110 transition-transform" />
          
          <div className="relative z-10 flex flex-col h-full">
            {t.isHidden && (
              <div className="flex items-center gap-1 text-orange-500 mb-4 bg-orange-50 w-fit px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                <EyeOff className="w-3 h-3" />
                مخفي: تقييم منخفض
              </div>
            )}

            <div className="flex gap-1 mb-8">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-5 h-5 transition-colors ${i < t.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-100'}`} />
              ))}
            </div>

            <p className="text-gray-700 font-bold text-lg leading-[1.8] mb-10 italic relative">
              <span className="text-blue-500 text-3xl absolute -right-4 -top-2 opacity-50 font-serif">"</span>
              {t.comment}
              <span className="text-blue-500 text-3xl absolute -left-2 bottom-[-10px] opacity-50 font-serif">"</span>
            </p>

            <div className="flex items-center gap-4 mt-auto pt-8 border-t border-gray-50">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center border border-blue-100/50 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                <User className="w-7 h-7 text-blue-400 group-hover:text-white" />
              </div>
              <div className="text-right">
                <h4 className="text-base font-black text-gray-950 group-hover:text-blue-600 transition-colors">{t.name}</h4>
                <div className="text-[10px] font-black uppercase text-blue-600/60 flex items-center gap-1.5 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  مستخدم موثق بالبصمة
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

