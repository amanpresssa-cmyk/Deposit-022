import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, CreditCard, MessageCircle, Star, X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const ProductTour: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('arboon_tour_completed');
    if (!hasSeenTour) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps: TourStep[] = [
    {
      title: 'مرحباً بك في عربون',
      description: 'منصتك الموثوقة للتوسط المالي وحفظ الحقوق. نحن هنا لنضمن لك تجربة تجارية آمنة بينك وبين الطرف الآخر.',
      icon: <Shield className="w-12 h-12" />,
      color: 'bg-blue-600'
    },
    {
      title: 'كيف نحمي أموالك؟',
      description: 'عند الاتفاق، يتم احتجاز المبلغ في "خزنة عربون". لا يستلم البائع المبلغ إلا بعد تأكيد استلامك للخدمة أو المنتج.',
      icon: <CreditCard className="w-12 h-12" />,
      color: 'bg-green-600'
    },
    {
      title: 'تواصل مباشر وآمن',
      description: 'نوفر لك غرف محادثة خاصة لكل صفقة، حيث يمكنك الاتفاق على التفاصيل وإرفاق المستندات لضمان التزام الطرفين.',
      icon: <MessageCircle className="w-12 h-12" />,
      color: 'bg-purple-600'
    },
    {
      title: 'التقييم والموثوقية',
      description: 'بعد كل عملية ناجحة، يمكنك تقييم الطرف الآخر. هذا يساعد في بناء مجتمع تجاري صادق وموثوق.',
      icon: <Star className="w-12 h-12" />,
      color: 'bg-orange-500'
    },
    {
      title: 'ابدأ صفقتك الأولى',
      description: 'أنت الآن جاهز! يمكنك البحث عن خدمات أو إنشاء طلب ضمان جديد فوراً. حقك محفوظ مع عربون.',
      icon: <CheckCircle2 className="w-12 h-12" />,
      color: 'bg-blue-600'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    setIsVisible(false);
    localStorage.setItem('arboon_tour_completed', 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm rtl" dir="rtl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative"
          >
            <button 
              onClick={completeTour}
              className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 z-10 p-2 hover:bg-gray-100 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col h-full">
              {/* Header Icon */}
              <div className={`${steps[currentStep].color} py-16 flex items-center justify-center transition-colors duration-500`}>
                <motion.div
                  key={currentStep}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-white"
                >
                  {steps[currentStep].icon}
                </motion.div>
              </div>

              {/* Content */}
              <div className="p-10 text-center space-y-6">
                <div className="space-y-4">
                  <motion.h2 
                    key={`title-${currentStep}`}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-3xl font-black text-gray-900 tracking-tight"
                  >
                    {steps[currentStep].title}
                  </motion.h2>
                  <motion.p 
                     key={`desc-${currentStep}`}
                     initial={{ y: 10, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     className="text-lg text-gray-500 leading-relaxed"
                  >
                    {steps[currentStep].description}
                  </motion.p>
                </div>

                {/* Progress Dots */}
                <div className="flex justify-center gap-2 py-4">
                  {steps.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === currentStep ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200'
                      }`} 
                    />
                  ))}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 gap-4">
                  <button
                    onClick={handleBack}
                    className={`flex items-center gap-2 text-gray-400 font-bold px-4 py-2 rounded-xl transition-all ${
                      currentStep === 0 ? 'invisible' : 'hover:text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronRight className="w-5 h-5" />
                    <span>السابق</span>
                  </button>

                  <button
                    onClick={handleNext}
                    className="bg-[#2563eb] text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center gap-2 min-w-[140px] justify-center transition-all"
                  >
                    <span>{currentStep === steps.length - 1 ? 'فهمت، لنبدأ!' : 'التالي'}</span>
                    {currentStep !== steps.length - 1 && <ChevronLeft className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
