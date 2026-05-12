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

  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || testimonials.length === 0) return;
    
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        // In RTL scrollLeft is negative or starts at 0 and goes left
        // Simple approach: if we reached the end, reset or just increment
        const isEnd = Math.abs(scrollLeft) + clientWidth >= scrollWidth - 10;
        
        if (isEnd) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: -280, behavior: 'smooth' }); // Slide one card width approx
        }
      }
    }, 5000); // Scroll every 5 seconds

    return () => clearInterval(interval);
  }, [loading, testimonials]);

  if (loading) return (
    <div className="flex overflow-x-auto gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-8 pb-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="min-w-[250px] md:min-w-0 h-48 bg-gray-50 rounded-2xl animate-pulse border border-gray-100" />
      ))}
    </div>
  );

  if (testimonials.length === 0) return null;

  return (
    <div 
      ref={scrollRef}
      className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 pb-8 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
    >
      {testimonials.map((t, idx) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
          className="min-w-[260px] md:min-w-0 snap-center bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden flex flex-col h-full group"
        >
          <Quote className="absolute top-4 right-4 w-10 h-10 text-blue-50 opacity-30 -rotate-12 group-hover:scale-110 transition-transform" />
          
          <div className="relative z-10 flex flex-col h-full">
            {t.isHidden && (
              <div className="flex items-center gap-1 text-orange-500 mb-3 bg-orange-50 w-fit px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                <EyeOff className="w-2.5 h-2.5" />
                مخفي
              </div>
            )}

            <div className="flex gap-0.5 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 transition-colors ${i < t.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-100'}`} />
              ))}
            </div>

            <p className="text-gray-700 font-bold text-sm leading-relaxed mb-6 italic relative line-clamp-4">
              {t.comment}
            </p>

            <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-50">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center border border-blue-100/50 group-hover:bg-blue-600 transition-all">
                <User className="w-5 h-5 text-blue-400 group-hover:text-white" />
              </div>
              <div className="text-right">
                <h4 className="text-xs font-black text-gray-950 group-hover:text-blue-600 transition-colors uppercase">{t.name}</h4>
                <div className="text-[8px] font-black text-blue-600/60 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  مستخدم موثق
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

