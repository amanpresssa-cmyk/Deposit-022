import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Quote, User, Briefcase } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: 'buyer' | 'seller';
  comment: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'أحمد القحطاني',
    role: 'buyer',
    comment: 'منصة رائعة وفرت علي الكثير من الوقت والجهد في تعقيب معاملاتي الحكومية بكل أمان.',
    rating: 5
  },
  {
    id: '2',
    name: 'سارة محمد',
    role: 'seller',
    comment: 'كفنّية برمجة، وجدت في عربون بيئة آمنة تضمن لي استلام مستحقاتي فور تسليم العمل للعميل.',
    rating: 5
  },
  {
    id: '3',
    name: 'فيصل العتيبي',
    role: 'buyer',
    comment: 'نظام الوساطة (الاسكرو) يعطي راحة بال كبيرة، لا أدفع إلا عندما أستلم الخدمة كما تم الاتفاق.',
    rating: 4
  },
  {
    id: '4',
    name: 'خالد المطيري',
    role: 'seller',
    comment: 'أفضل منصة للعمل الحر في المملكة. التوثيق بالهوية يزيد من مصداقية حسابي أمام العملاء.',
    rating: 5
  },
  {
    id: '5',
    name: 'نورة السبيعي',
    role: 'buyer',
    comment: 'خدمة العملاء سريعة جداً ونظام التنبيهات يبقيني على اطلاع بكل خطوة في طلبي.',
    rating: 5
  }
];

export const TestimonialSlider: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const current = testimonials[index];

  return (
    <div className="bg-white rounded-[3rem] p-12 border border-blue-50 shadow-xl shadow-blue-100/20 relative overflow-hidden min-h-[300px] flex flex-col justify-center">
      <Quote className="absolute top-8 right-8 w-20 h-20 text-blue-50 opacity-50" />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 text-center"
        >
          <div className="flex justify-center gap-1 mb-6 text-orange-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-6 h-6 ${i < current.rating ? 'fill-orange-400' : 'text-gray-200'}`} />
            ))}
          </div>

          <p className="text-2xl font-bold text-gray-800 leading-relaxed mb-8 px-10">
            "{current.comment}"
          </p>

          <div className="flex flex-col items-center">
            <h4 className="text-xl font-black text-gray-900">{current.name}</h4>
            <div className={`mt-2 px-4 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
              current.role === 'seller' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {current.role === 'seller' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {current.role === 'seller' ? 'بائع معتمد' : 'مشتري موثق'}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
        {testimonials.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-500 ${
              index === i ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200'
            }`} 
          />
        ))}
      </div>
    </div>
  );
};
