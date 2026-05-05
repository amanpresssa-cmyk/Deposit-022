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
  const [index, setIndex] = useState(0);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Logic: 
    // 1. Public sees only rating >= 4
    // 2. Author sees their own feedback regardless of rating
    // 3. Admin sees everything
    const feedbackRef = collection(db, 'platform_feedback');
    const q = query(feedbackRef, orderBy('rating', 'desc'), orderBy('createdAt', 'desc'), limit(15));

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

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  if (testimonials.length === 0) return null;

  const current = testimonials[index];

  return (
    <div className="bg-white rounded-[2rem] p-6 md:p-12 border border-blue-50 shadow-xl shadow-blue-100/30 relative overflow-hidden flex flex-col justify-center">
      <Quote className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 md:w-24 md:h-24 text-blue-50 opacity-40 -rotate-12" />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.6, ease: "circOut" }}
          className="relative z-10 text-center"
        >
          {current.isHidden && (
            <div className="flex items-center justify-center gap-1 text-orange-500 mb-2 md:mb-4 bg-orange-50 w-fit mx-auto px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-wider">
              <EyeOff className="w-2.5 h-2.5 md:w-3 md:h-3" />
              مخفي: تقييم منخفض
            </div>
          )}

          <div className="flex justify-center gap-1 mb-4 md:mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-4 h-4 md:w-6 md:h-6 transition-colors ${i < current.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-100'}`} />
            ))}
          </div>

          <p className="text-sm md:text-xl font-bold text-gray-800 leading-relaxed mb-6 md:mb-8 px-2 md:px-8 max-w-2xl mx-auto">
            {current.comment}
          </p>

          <div className="flex flex-col items-center">
            <div className="bg-gray-100 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2 md:mb-3 border-2 border-white shadow-sm">
              <User className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
            </div>
            <h4 className="text-sm md:text-lg font-black text-gray-900">{current.name}</h4>
            <div className="mt-1 px-3 py-0.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 flex items-center gap-1 md:gap-2">
              <ShieldCheck className="w-2.5 h-2.5 md:w-3 md:h-3" />
              مستخدم موثق
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {testimonials.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1 md:h-1.5 rounded-full transition-all duration-500 ${
                index === i ? 'w-6 md:w-8 bg-blue-600 shadow-sm shadow-blue-200' : 'w-2 bg-gray-200 hover:bg-gray-300'
              }`} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

