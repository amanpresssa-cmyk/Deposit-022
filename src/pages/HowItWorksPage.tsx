import React from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  CreditCard, 
  Zap, 
  CheckCircle2, 
  ShieldCheck, 
  UserPlus,
  ArrowDown
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  const steps = [
    {
      title: 'الاتفاق على الصفقة',
      desc: 'يتواصل المشتري والبائع للاتفاق على تفاصيل الخدمة، السعر، ومدة التسليم بكل وضوح.',
      icon: <MessageSquare className="w-8 h-8" />,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      title: 'إنشاء طلب الوساطة',
      desc: 'يقوم أحد الطرفين بإنشاء طلب وساطة جديد موضحاً فيه كافة التفاصيل المتفق عليها.',
      icon: <UserPlus className="w-8 h-8" />,
      color: 'bg-purple-50 text-purple-600'
    },
    {
      title: 'إيداع المبلغ في عربون',
      desc: 'يقوم المشتري بدفع المبلغ عبر منصة عربون، حيث يتم حجز المبلغ بأمان في حساباتنا الوسيطة.',
      icon: <CreditCard className="w-8 h-8" />,
      color: 'bg-orange-50 text-orange-600'
    },
    {
      title: 'تنفيذ وتسليم العمل',
      desc: 'يبدأ البائع بالعمل فور تأكيد حجز المبلغ، ويقوم بتسليمه للمشتري عبر المنصة.',
      icon: <Zap className="w-8 h-8" />,
      color: 'bg-emerald-50 text-emerald-600'
    },
    {
      title: 'تحرير المبلغ',
      desc: 'بعد تأكد المشتري من جودة العمل، يقوم بالموافقة على الطلب ليتم تحرير المبلغ للبائع فوراً.',
      icon: <CheckCircle2 className="w-8 h-8" />,
      color: 'bg-green-50 text-green-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20 overflow-x-hidden" dir="rtl">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 text-center mb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-full text-xs font-black mb-8 shadow-xl shadow-blue-100"
        >
          <ShieldCheck className="w-4 h-4" />
          وساطة مالية ذكية 100%
        </motion.div>
        <h1 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.1] mb-8">
          كيف نضمن <span className="text-blue-600 italic">حقك؟</span>
        </h1>
        <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
          نحن الطرف الثالث المحايد الذي يجعل التعاملات الإلكترونية أكثر أماناً وشفافية لجميع الأطراف في المملكة.
        </p>
      </div>

      {/* Visual Steps */}
      <div className="max-w-4xl mx-auto px-4 relative">
         <div className="absolute top-0 bottom-0 right-1/2 md:right-[5.5rem] w-1 bg-blue-100 -translate-x-1/2 -z-10" />
         
         <div className="space-y-12 md:space-y-24">
            {steps.map((step, idx) => (
               <motion.div 
                 key={idx}
                 initial={{ opacity: 0, x: idx % 2 === 0 ? 50 : -50 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true, margin: "-100px" }}
                 className={`flex flex-col md:flex-row items-center gap-8 ${idx % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}
               >
                  <div className={`w-24 h-24 shrink-0 rounded-[2rem] flex items-center justify-center shadow-xl ${step.color} relative z-10 border-4 border-white`}>
                     {step.icon}
                     <div className="absolute -top-3 -right-3 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-black text-xs ring-4 ring-white">
                        {idx + 1}
                     </div>
                  </div>
                  
                  <div className={`flex-1 bg-white p-8 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-xl shadow-blue-900/5 relative ${idx % 2 !== 0 ? 'text-right' : 'text-right md:text-right'}`}>
                     <h3 className="text-xl md:text-3xl font-black text-gray-900 mb-4">{step.title}</h3>
                     <p className="text-gray-500 font-medium text-lg leading-relaxed">{step.desc}</p>
                     
                     {/* Decorative Arrow for mobile */}
                     <div className="md:hidden absolute -bottom-8 left-1/2 -translate-x-1/2 text-blue-200">
                        <ArrowDown className="w-5 h-5 animate-bounce" />
                     </div>
                  </div>
               </motion.div>
            ))}
         </div>
      </div>

      {/* Call to Action */}
      <div className="max-w-5xl mx-auto px-4 mt-32">
         <div className="bg-blue-600 rounded-[4rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-200">
            <div className="relative z-10">
               <h2 className="text-3xl md:text-5xl font-black mb-6">هل أنت جاهز لتجربة حقيقية؟</h2>
               <p className="text-blue-100 text-xl font-medium mb-12 max-w-2xl mx-auto">
                 سواء كنت معقباً تبحث عن ضمان أتعابك، أو صاحب عمل يبحث عن تنفيذ دقيق، "عربون" هو وجهتك.
               </p>
               <div className="flex flex-col md:flex-row justify-center gap-4">
                  <button className="bg-white text-blue-600 px-12 py-5 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-xl">ابدأ صفقة الآن</button>
                  <button className="bg-blue-700 text-white border-2 border-blue-500 px-12 py-5 rounded-2xl font-black text-lg hover:bg-blue-800 transition-all">تحدث مع المبيعات</button>
               </div>
            </div>
            
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
         </div>
      </div>
    </div>
  );
};
