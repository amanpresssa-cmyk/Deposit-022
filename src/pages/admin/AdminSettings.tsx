import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { 
  Settings2, 
  Palette, 
  Wallet, 
  ShieldAlert, 
  Megaphone,
  LifeBuoy,
  Scale,
  MessageSquare,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const settingsCards = [
    {
      id: 'general',
      title: 'الإعدادات العامة',
      description: 'اسم المنصة، الشعارات، التوقيع والختم الرسمي',
      icon: <Settings2 className="w-8 h-8" />,
      color: 'blue',
      path: '/admin/settings/general'
    },
    {
      id: 'ui',
      title: 'الواجهة والتصميم',
      description: 'البطاقة الترحيبية وبانر الصفحة الرئيسية',
      icon: <Palette className="w-8 h-8" />,
      color: 'purple',
      path: '/admin/settings/ui'
    },
    {
      id: 'announcements',
      title: 'الأشرطة الإعلانية',
      description: 'إدارة أشرطة التنبيهات العلوية المتحركة والثابتة',
      icon: <Megaphone className="w-8 h-8" />,
      color: 'amber',
      path: '/admin/announcements'
    },
    {
      id: 'finance',
      title: 'السياسات المالية',
      description: 'العمولات، الضرائب، الحد الأدنى للسحب ودورة التحويل',
      icon: <Wallet className="w-8 h-8" />,
      color: 'green',
      path: '/admin/settings/finance'
    },
    {
      id: 'security',
      title: 'إعدادات الأمان',
      description: 'وضع الصيانة، توثيق الهوية، ومدة الجلسات',
      icon: <ShieldAlert className="w-8 h-8" />,
      color: 'red',
      path: '/admin/settings/security'
    },
    {
      id: 'support',
      title: 'الدعم والمساعدة',
      description: 'البريد الإلكتروني، رقم الدعم، وروابط التواصل',
      icon: <LifeBuoy className="w-8 h-8" />,
      color: 'indigo',
      path: '/admin/settings/support'
    },
    {
      id: 'legal',
      title: 'الشؤون القانونية',
      description: 'شروط الاستخدام، الخصوصية، وسياسة الاسترجاع',
      icon: <Scale className="w-8 h-8" />,
      color: 'stone',
      path: '/admin/settings/legal'
    },
    {
      id: 'whatsapp',
      title: 'ربط الواتساب',
      description: 'تكوين البوت الذكي لإرسال إشعارات المنصة',
      icon: <MessageSquare className="w-8 h-8" />,
      color: 'emerald',
      path: '/admin/settings/whatsapp'
    }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight ">إعدادات <span className="text-blue-600">المنصة</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">إدارة متقدمة لجميع أقسام وخصائص النظام</p>
        </div>
        <Link 
          to="/admin"
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-xl font-bold text-[11px] transition-all"
        >
          <ShieldCheck className="w-4 h-4" />
          العودة للوحة الإدارة
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {settingsCards.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Link 
              to={card.path}
              className={`block bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative ${
                card.color === 'blue' ? 'hover:border-blue-200' :
                card.color === 'purple' ? 'hover:border-purple-200' :
                card.color === 'amber' ? 'hover:border-amber-200' :
                card.color === 'green' ? 'hover:border-green-200' :
                card.color === 'red' ? 'hover:border-red-200' :
                card.color === 'indigo' ? 'hover:border-indigo-200' :
                card.color === 'stone' ? 'hover:border-stone-200' :
                'hover:border-emerald-200'
              }`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 -mr-10 -mt-10 ${
                card.color === 'blue' ? 'bg-blue-600' :
                card.color === 'purple' ? 'bg-purple-600' :
                card.color === 'amber' ? 'bg-amber-600' :
                card.color === 'green' ? 'bg-green-600' :
                card.color === 'red' ? 'bg-red-600' :
                card.color === 'indigo' ? 'bg-indigo-600' :
                card.color === 'stone' ? 'bg-stone-600' :
                'bg-emerald-600'
              }`} />
              
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-sm ${
                card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                card.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                card.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                card.color === 'green' ? 'bg-green-50 text-green-600' :
                card.color === 'red' ? 'bg-red-50 text-red-600' :
                card.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                card.color === 'stone' ? 'bg-stone-50 text-stone-600' :
                'bg-emerald-50 text-emerald-600'
              }`}>
                {card.icon}
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center justify-between">
                {card.title}
                <ArrowRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 ${
                  card.color === 'blue' ? 'text-blue-600' :
                  card.color === 'purple' ? 'text-purple-600' :
                  card.color === 'amber' ? 'text-amber-600' :
                  card.color === 'green' ? 'text-green-600' :
                  card.color === 'red' ? 'text-red-600' :
                  card.color === 'indigo' ? 'text-indigo-600' :
                  card.color === 'stone' ? 'text-stone-600' :
                  'text-emerald-600'
                }`} />
              </h3>
              <p className="text-xs font-bold text-gray-400 leading-relaxed min-h-[40px]">
                {card.description}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
