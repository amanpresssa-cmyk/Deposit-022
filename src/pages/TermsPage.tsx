import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, FileText, Scale, CheckCircle2 } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-bold mb-6"
          >
            <Scale className="w-4 h-4" />
            الاتفاقية القانونية
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">شروط الاستخدام</h1>
          <p className="text-gray-500 font-medium">يرجى قراءة شروط الاستخدام بعناية قبل البدء في استخدام منصة عربون.</p>
        </header>

        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl shadow-blue-900/5 border border-gray-100 space-y-12">
          <section className="space-y-4 text-right">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">1</span>
              مقدمة عامة
            </h2>
            <p className="text-gray-600 leading-loose font-medium">
              تعد منصة "عربون" وسيطاً تقنياً يهدف لتنظيم التعاملات المالية بين البائع والمشتري. استخدامك للمنصة يعني موافقتك الكاملة على كافة الشروط والأحكام الواردة في هذه الصفحة.
            </p>
          </section>

          <section className="space-y-4 text-right">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">2</span>
              آلية الوساطة (عربون)
            </h2>
            <div className="space-y-3 pr-4 border-r-2 border-blue-50">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                <p className="text-gray-600 font-medium">تعمل المنصة كطرف ثالث محايد يحفظ حق الطرفين.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                <p className="text-gray-600 font-medium">يتم حجز مبلغ الاتفاق في حسابات المنصة المعتمدة حتى انتهاء الخدمة.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                <p className="text-gray-600 font-medium">لا يحق للبائع المطالبة بالمبلغ إلا بعد تأكيد استلام العميل للخدمة.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4 text-right">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">3</span>
              الرسوم والعمولات
            </h2>
            <p className="text-gray-600 leading-loose font-medium">
              تتقاضى المنصة عمولة رمزية مقابل خدمات الوساطة والربط التقني. يتم توضيح العمولة لكل عملية قبل إتمام الدفع. الرسوم غير قابلة للاسترداد بعد إتمام الوساطة بنجاح.
            </p>
          </section>

          <section className="space-y-4 text-right">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">4</span>
              حل النزاعات
            </h2>
            <p className="text-gray-600 leading-loose font-medium">
              في حال نشوب نزاع بين الطرفين، يقوم فريق الدعم الفني في "عربون" بمراجعة الأدلة والمحادثات لاتخاذ قرار عادل. تلتزم الأطراف بالقرار النهائي الذي يصدره فريق التحكيم بالمنصة.
            </p>
          </section>

          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-3 text-blue-600">
                <ShieldCheck className="w-6 h-6" />
                <span className="font-black">حقوقك محفوظة دائماً</span>
             </div>
             <p className="text-xs text-gray-400 font-bold">آخر تحديث: مايو 2024</p>
          </div>
        </div>
      </div>
    </div>
  );
};
