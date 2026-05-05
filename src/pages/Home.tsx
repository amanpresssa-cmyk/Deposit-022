import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowLeftRight, CheckCircle, Search, Clock, MessageSquare, Star } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const Home: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const steps = [
    {
      title: 'اتفاق الطرفين',
      desc: 'يتفق العميل والبائع على تفاصيل الخدمة أو المنتج والسعر.',
      icon: <MessageSquare className="w-6 h-6 text-blue-500" />
    },
    {
      title: 'حجز المبلغ',
      desc: 'يقوم العميل بتحويل المبلغ لمنصة عربون ليتم حجزه بأمان.',
      icon: <Clock className="w-6 h-6 text-orange-500" />
    },
    {
      title: 'تنفيذ الخدمة',
      desc: 'يبدأ البائع بتنفيذ العمل المطلوب بكل طمأنينة.',
      icon: <ArrowLeftRight className="w-6 h-6 text-purple-500" />
    },
    {
      title: 'استلام وتحرير',
      desc: 'بعد موافقة العميل، يتم تحرير المبلغ للبائع فوراً.',
      icon: <CheckCircle className="w-6 h-6 text-green-500" />
    }
  ];

  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <section className="text-center space-y-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight">
            اضمن حقك مع <span className="text-[#2563eb]">عربون</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            المنصة الأولى للتوسط المالي وحفظ الحقوق في البيع والشراء وخدمات المعقبين. نضمن أن الطرفين راضيان تماماً قبل دفع أي ريال.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-4"
        >
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-[#2563eb] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#1d4ed8] shadow-lg shadow-blue-200 transition-all"
            >
              انتقل للوحة التحكم
            </button>
          ) : (
            <button
              onClick={login}
              className="bg-[#2563eb] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#1d4ed8] shadow-lg shadow-blue-200 transition-all"
            >
              ابدأ الآن مجاناً
            </button>
          )}
          <button
             onClick={() => navigate('/search')}
             className="bg-white text-gray-900 border border-gray-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all"
          >
            تصفح الخدمات
          </button>
        </motion.div>
      </section>

      {/* Recommendations Section */}
      <section className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">ترشيحات تهمك</h2>
          <button onClick={() => navigate('/search')} className="text-blue-600 font-bold hover:underline">عرض الكل</button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'معقب معاملات معتمد', cat: 'تعقيب', price: 'من 200 ر.س', rating: '4.9' },
            { title: 'فحص فني للسيارات', cat: 'سيارات', price: 'من 150 ر.س', rating: '4.8' },
            { title: 'برمجة متاجر سلة وزد', cat: 'برمجة', price: 'من 800 ر.س', rating: '5.0' },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-start">
                 <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">{item.cat}</span>
                 <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm">
                   <Star className="w-4 h-4 fill-current" />
                   <span>{item.rating}</span>
                 </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900">{item.title}</h3>
              <p className="text-blue-600 font-black">{item.price}</p>
              <button onClick={() => navigate('/search')} className="w-full py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-blue-50 hover:text-blue-600 transition-all">
                تفاصيل الخدمة
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Steps Section */}
      <section className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">كيف يعمل عربون؟</h2>
          <div className="w-20 h-1 bg-blue-500 mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-4"
            >
              <div className="bg-gray-50 w-14 h-14 rounded-2xl flex items-center justify-center border border-gray-100">
                {step.icon}
              </div>
              <h3 className="font-bold text-xl text-gray-900">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>نظام وساطة متطور</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900">حماية كاملة من الاحتيال</h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            نحن نوفر بيئة آمنة للتبادل التجاري. لايتم تحرير المبالغ إلا بعد تأكيد الاستلام وموافقة المشتري على الجودة المتفق عليها.
          </p>
          
          <ul className="space-y-4">
            {[
              'نظام تقييم ومراجعات دقيق لكل مستخدم',
              'مركز حل النزاعات متخصص وعادل',
              'دفع آمن وتشفير كامل للبيانات',
              'دعم فني متواجد لمساعدتك'
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden h-[400px] flex flex-col justify-end">
          <Search className="absolute -top-10 -right-10 w-64 h-64 text-white/10" />
          <div className="relative z-10 space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
            </div>
            <p className="text-2xl font-bold italic leading-tight">
              "عربون ريحني كثير من هم التعامل مع الغرباء. الموثوقية هي أهم شيء عندي."
            </p>
            <p className="font-medium opacity-80">— عبدالله، عميل مستمر</p>
          </div>
        </div>
      </section>
    </div>
  );
};
