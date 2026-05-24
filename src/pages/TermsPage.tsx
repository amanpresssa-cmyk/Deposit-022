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
                مقدمة واتفاقية الاستخدام
              </h2>
              <p className="text-gray-600 leading-loose font-medium">
                تعد منصة "عربون" (المشار إليها بـ "المنصة" أو "نحن") وسيطاً تقنياً مرخصاً يهدف إلى تنظيم ومتابعة التعاملات المالية بين البائع والمشتري لضمان الحقوق. استخدامك للمنصة أو التسجيل فيها يعني إقرارك بالموافقة الكاملة وغير المشروطة على كافة الشروط والأحكام الواردة هنا، وتخضع هذه الاتفاقية للقوانين والأنظمة المعمول بها في المملكة العربية السعودية.
              </p>
            </section>

            <section className="space-y-4 text-right">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">2</span>
                أهلية العضوية والالتزامات
              </h2>
              <p className="text-gray-600 leading-loose font-medium">
                يجب أن لا يقل عمر المستخدم عن 18 عاماً ويملك الأهلية القانونية الكاملة للتعاقد. يلتزم المستخدم بتقديم بيانات صحيحة ومحدثة عند التسجيل (الاسم الحقيقي، رقم الهوية/الإقامة، رقم الجوال الموثق). يُمنع منعاً باتاً استخدام المنصة لأغراض غير قانونية أو تداول سلع وخدمات تخالف أنظمة المملكة.
              </p>
            </section>

            <section className="space-y-4 text-right">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">3</span>
                نظام عربون (الوساطة والمقاصة)
              </h2>
              <div className="space-y-4 pr-4 border-r-2 border-blue-50">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                  <p className="text-gray-600 font-medium">تعمل المنصة كطرف ثالث "Escrow" يحفظ مبلغ الصفقة حتى إتمام التنفيذ.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                  <p className="text-gray-600 font-medium">عند الدفع، يتم الاحتفاظ بالأموال بأمان عبر نظام المدفوعات.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                  <p className="text-gray-600 font-medium">يتحمل المشتري مسؤولية فحص الخدمة/السلعة قبل تأكيد الاستلام النهائي.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                  <p className="text-gray-600 font-medium">بمجرد الضغط على "تأكيد الاستلام"، يتم تحويل المبلغ للبائع ولا يمكن للمنصة استرداد الأموال بعد ذلك.</p>
                </div>
              </div>
            </section>

            <section className="space-y-4 text-right">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">4</span>
                الرسوم، الضرائب والمدفوعات
              </h2>
              <p className="text-gray-600 leading-loose font-medium">
                تتقاضى المنصة عمولة تشغيلية (تتراوح بين 3% إلى 6% حسب نوع العملية) مقابل خدمات الربط والوساطة والأمان. جميع الأسعار الظاهرة في الفواتير تشمل ضريبة القيمة المضافة حسب الأنظمة. الرسوم التشغيلية والبنكية غير قابلة للاسترداد في حال إلغاء الطلب بعد البدء في التنفيذ.
              </p>
            </section>

            <section className="space-y-4 text-right">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">5</span>
                سياسة الإلغاء والنزاعات (التحكيم)
              </h2>
              <p className="text-gray-600 leading-loose font-medium">
                يحق للمشتري فتح نزاع في حال عدم التزام البائع بالشروط قبل تأكيد الاستلام. يقوم فريق "عربون" بالتحقق من الأدلة (المحادثات داخل المنصة حصراً) وإصدار قرار ملزم للطرفين. المنصة غير مسؤولة عن أي اتفاقات تتم خارج نظام المحادثات الرسمي الخاص بها.
              </p>
            </section>

            <section className="space-y-4 text-right">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">6</span>
                إخلاء المسؤولية والقانون الواجب التطبيق
              </h2>
              <p className="text-gray-600 leading-loose font-medium">
                تبذل المنصة قصارى جهدها لضمان أمن التعاملات، إلا أنها لا تشارك في جودة السلع أو الخدمات المقدمة من البائعين. في حال وقوع نزاع قانوني، يكون الاختصاص لمحاكم المملكة العربية السعودية بمدينة الرياض.
              </p>
            </section>

            <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-3 text-blue-600">
                  <ShieldCheck className="w-6 h-6" />
                  <span className="font-black">حقوقك وممتلكاتك تحت حماية عربون</span>
               </div>
               <p className="text-xs text-gray-400 font-bold">آخر تحديث: 7 مايو 2026</p>
            </div>
          </div>
      </div>
    </div>
  );
};
