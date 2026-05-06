import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, EyeOff, UserCheck } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-bold mb-6"
          >
            <Lock className="w-4 h-4" />
            حماية الخصوصية
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">سياسة الخصوصية</h1>
          <p className="text-gray-500 font-medium">خصوصيتك وأمن بياناتك هي على رأس أولوياتنا في منصة عربون.</p>
        </header>

        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl shadow-blue-900/5 border border-gray-100 space-y-12">
          <section className="space-y-4 text-right">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </span>
              المعلومات التي نجمعها
            </h2>
            <p className="text-gray-600 leading-loose font-medium">
              نجمع الحد الأدنى من البيانات اللازمة لضمان سلامة التعاملات، وتشمل: المعلومات الشخصية (الاسم، البريد الإلكتروني، رقم الجوال)، وبيانات الهوية (للتوثيق الرسمي فقط)، وبيانات العمليات المالية.
            </p>
          </section>

          <section className="space-y-4 text-right">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </span>
              كيفية استخدام البيانات
            </h2>
            <p className="text-gray-600 leading-loose font-medium">
              تُستخدم بياناتك حصراً لغرض: التحقق من الهوية، معالجة الدفع والوساطة، التواصل معك بشأن طلباتك، ومنع عمليات الاحتيال. لا يتم مشاركة بياناتك مع أي طرف ثالث لأغراض تسويقية إطلاقاً.
            </p>
          </section>

          <section className="space-y-4 text-right">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <EyeOff className="w-6 h-6" />
              </span>
              سرية المحادثات
            </h2>
            <p className="text-gray-600 leading-loose font-medium">
              كافة المراسلات داخل المنصة مشفرة ومحمية. لا يحق لأي جهة الاطلاع عليها إلا في حال وجود نزاع رسمي يتطلب تدخل فريق التحكيم لفض النزاع.
            </p>
          </section>

          <section className="space-y-4 text-right">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </span>
              أمن المدفوعات
            </h2>
            <p className="text-gray-600 leading-loose font-medium">
              نحن لا نخزن بيانات بطاقاتك الائتمانية. جميع المدفوعات تتم عبر قنوات رسمية معتمدة ومتوافقة مع أعلى معايير الأمن العالمية (PCI DSS).
            </p>
          </section>

          <div className="p-8 bg-blue-600 rounded-[2rem] text-white">
             <h3 className="font-black text-lg mb-2">هل لديك استفسار حول خصوصيتك؟</h3>
             <p className="text-blue-100 text-sm font-medium mb-6">يمكنك دائماً التواصل مع مسؤول حماية البيانات لدينا عبر البريد الرسمي.</p>
             <a href="mailto:privacy@arboon.sa" className="bg-white text-blue-600 px-8 py-3 rounded-xl font-black text-sm inline-block">تواصل معنا</a>
          </div>
        </div>
      </div>
    </div>
  );
};
