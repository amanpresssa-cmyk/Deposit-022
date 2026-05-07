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
              جمع ومعالجة البيانات
            </h2>
            <p className="text-gray-600 leading-loose font-medium">
              نلتزم في منصة "عربون" بجمع الحد الأدنى من البيانات الشخصية الضرورية لتقديم خدماتنا بأمان. يتضمن ذلك: بيانات الهوية والاتصال الموثقة عبر الجهات الرسمية، بيانات الموقع الجغرافي (عند الحاجة لخدمات لوجستية)، وسجلات العمليات المالية. يتم تخزين هذه البيانات في خوادم مشفرة داخل مراكز بيانات عالية الأمان.
            </p>
          </section>

          <section className="space-y-4 text-right">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </span>
              أهداف استخدام المعلومات
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <h4 className="font-black text-xs text-gray-900 mb-2">الأمان والتوثيق</h4>
                  <p className="text-[10px] text-gray-500 font-bold">التحقق من هوية المستخدمين لمنع الاحتيال وضمان سلامة المجتمع.</p>
               </div>
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <h4 className="font-black text-xs text-gray-900 mb-2">الدعم الفني</h4>
                  <p className="text-[10px] text-gray-500 font-bold">القدرة على مساعدتك وحل النزاعات البرمجية أو المالية بكفاءة.</p>
               </div>
            </div>
            <p className="text-gray-600 leading-loose font-medium">
              لا نقوم ببيع أو تأجير بياناتك لأي جهات خارجية لأغراض تسويقية. يتم مشاركة المعلومات فقط مع الجهات النظامية المختصة في حال وجود طلب رسمي قانوني أو لمنع وقوع جرائم مالية.
            </p>
          </section>

          <section className="space-y-4 text-right">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <EyeOff className="w-6 h-6" />
              </span>
              حقوق المستخدم (الخصوصية والشفافية)
            </h2>
            <p className="text-gray-600 leading-loose font-medium">
              لك الحق الكامل في: الوصول إلى بياناتك المخزنة وتصحيحها، طلب حذف بياناتك (ما لم تتعارض مع التزامات قانونية أو مالية قائمة)، ومعرفة الغرض من معالجة أي بيانات إضافية. كما نحرص على تشفير كافة المراسلات داخل نظام المحادثات للحفاظ على سرية اتفاقياتكم.
            </p>
          </section>

          <section className="space-y-4 text-right">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </span>
              تأمين المدفوعات والبطاقات
            </h2>
            <p className="text-gray-600 leading-loose font-medium">
              نلتزم بأعلى معايير الأمن السيبراني العالمية. نستخدم بوابات دفع معتمدة من البنك المركزي السعودي، ولا يتم تخزين أرقام بطاقاتك البنكية أو رموز الأمان (CVV) في قواعد بياناتنا، بل يتم التعامل معها عبر تشفير رقمي (Tokenization) آمن تماماً.
            </p>
          </section>

          <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] text-white">
             <div className="flex items-center gap-4 mb-4">
                <ShieldCheck className="w-8 h-8 opacity-50" />
                <h3 className="font-black text-lg">التزامنا تجاهك</h3>
             </div>
             <p className="text-blue-100 text-sm font-medium mb-6">نحن ندرك حجم الثقة التي تضعها فينا عند تزويدنا بمعلوماتك، لذا نلتزم بتطوير أنظمتنا الدفاعية وقواعد الخصوصية باستمرار لمواكبة أحدث التقنيات العالمية.</p>
             <a href="mailto:privacy@arboon.sa" className="bg-white text-blue-600 px-8 py-3 rounded-xl font-black text-sm inline-block shadow-lg hover:bg-gray-50 transition-all">تواصل مع مكتب الخصوصية</a>
          </div>
        </div>
      </div>
    </div>
  );
};
