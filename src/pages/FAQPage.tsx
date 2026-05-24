import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronDown, Plus, Minus, Search } from 'lucide-react';

export const FAQPage: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const [searchTerm, setSearchTerm] = useState('');

  const faqs = [
    {
      q: 'ما هي منصة عربون؟',
      a: 'منصة "عربون" هي وسيط تقني سعودي يضمن حقوق المتعاملين في الخدمات والبيع الإلكتروني من خلال حجز المبالغ المالية حتى إتمام الخدمة بنجاح.'
    },
    {
      q: 'كيف أضمن عدم تعرضي للاحتيال؟',
      a: 'عندما تدفع عبر المنصة، يظل مالك في أمان لدينا. ولا يتم تحويله للبائع إلا بعد تأكيدك باستلام الخدمة أو المنتج كما تم الاتفاق عليه.'
    },
    {
      q: 'ما هي الرسوم التي تتقاضاها المنصة؟',
      a: 'تتقاضى المنصة عمولة بسيطة تختلف حسب نوع العملية وقيمتها، ويتم توضيحها لك بكل شفافية قبل إجراء أي عملية دفع.'
    },
    {
      q: 'كم تستغرق عملية سحب الأرباح للبائع؟',
      a: 'بمجرد تحرير المبلغ من قبل العميل، يمكنك طلب السحب إلى حسابك البنكي. تتم المعالجة وفقاً لسياسات وأوقات العمل المعتمدة من بوابة الدفع المرتبطة.'
    },
    {
      q: 'ماذا أفعل إذا لم يلتزم البائع بالاتفاق؟',
      a: 'يمكنك فتح "نزاع" من صفحة الطلب. سيقوم فريقنا بمراجعة المحادثات والأدلة، وفي حال ثبت عدم الالتزام، يتم إعادة المبلغ إلى محفظتك فوراً.'
    },
    {
      q: 'هل التوثيق برقم الهوية إلزامي؟',
      a: 'نعم، لضمان أعلى مستويات الأمان والجدية، نلزم كافة البائعين والوسطاء بتوثيق حساباتهم عبر المركز الوطني للتصديق الرقمي أو رقم الهوية الرسمي.'
    }
  ];

  const filteredFaqs = faqs.filter(f => 
    f.q.includes(searchTerm) || f.a.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-bold mb-6"
          >
            <HelpCircle className="w-4 h-4" />
            الأسئلة الشائعة
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">أسئلة قد تدور بذهنك</h1>
          
          <div className="relative max-w-md mx-auto mt-8">
             <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
             <input 
               type="text" 
               placeholder="ابحث عن سؤالك هنا..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-white border border-gray-100 rounded-2xl py-4 pr-12 pl-6 font-medium shadow-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all text-right"
             />
          </div>
        </header>

        <div className="space-y-4">
          {filteredFaqs.map((faq, idx) => (
            <motion.div 
              key={idx}
              className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              <button 
                onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}
                className="w-full p-6 flex items-center justify-between gap-4 text-right"
              >
                <span className="font-black text-gray-900 text-lg leading-tight">{faq.q}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${activeIndex === idx ? 'bg-blue-600 text-white rotate-180' : 'bg-gray-50 text-gray-400'}`}>
                   <ChevronDown className="w-5 h-5" />
                </div>
              </button>
              
              <AnimatePresence>
                {activeIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 text-gray-500 font-medium leading-loose border-t border-gray-50 mt-2">
                       {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          
          {filteredFaqs.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
               <p className="text-gray-400 font-bold">عذراً، لم نجد نتائج لبحثك.</p>
               <button onClick={() => setSearchTerm('')} className="text-blue-600 font-black mt-2">عرض كل الأسئلة</button>
            </div>
          )}
        </div>

        <div className="mt-20 p-10 bg-gray-900 rounded-[3rem] text-center text-white relative overflow-hidden">
           <div className="relative z-10">
              <h3 className="text-2xl font-black mb-4 italic">لم تجد إجابة؟</h3>
              <p className="text-gray-400 font-medium mb-8">فريقنا متاح للرد على كافة استفساراتك بشكل شخصي.</p>
              <button 
                onClick={() => window.location.href = '/help-center'}
                className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/50"
              >
                 تواصل مع الدعم الفني
              </button>
           </div>
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
        </div>
      </div>
    </div>
  );
};
