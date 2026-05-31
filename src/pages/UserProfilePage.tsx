import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Settings, ShieldCheck, Mail, MapPin, Share2, Gift, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { AddServiceModal } from '../components/AddServiceModal';

export const UserProfilePage: React.FC = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);

  if (!profile) return null;

  const referralLink = `${window.location.origin}/?ref=${profile.referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'منصة عربون للوساطة الآمنة',
          text: 'اشترك في منصة عربون باستخدام رابط الدعوة الخاص بي واحصل على أول عملية بدون رسوم!',
          url: referralLink,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        {/* Header Cover & Avatar */}
        <div 
          className="h-80 bg-gradient-to-r from-blue-600 to-indigo-600 relative bg-cover bg-center"
          style={{ backgroundImage: profile?.bannerUrl ? `url(${profile.bannerUrl})` : undefined }}
        >
          {profile?.bannerUrl && <div className="absolute inset-0 bg-black/40" />}
          <div className="absolute -bottom-16 right-8">
            <div className="w-32 h-32 rounded-3xl bg-white p-2 shadow-xl border border-gray-100">
              <div className="w-full h-full rounded-[1.2rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-4xl font-black text-indigo-600 overflow-hidden">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt={profile.displayName || ''} className="w-full h-full object-cover" />
                ) : (
                  profile?.displayName?.[0]?.toUpperCase() || <UserIcon />
                )}
              </div>
            </div>
          </div>
          
          <div className="absolute top-6 left-6">
            <Link 
              to="/settings" 
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-white transition-all font-bold text-sm"
            >
              <Settings className="w-4 h-4" />
              تعديل الإعدادات
            </Link>
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-20 px-8 pb-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
              {profile.displayName || 'مستخدم جديد'}
              {profile.isAdmin && (
                <span className="bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 text-[10px] uppercase tracking-wider font-black px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  مدير النظام
                </span>
              )}
            </h1>
            <div className="flex flex-wrap gap-4 mt-4">
               {profile.phoneNumber && (
                 <p className="text-gray-500 font-medium px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100 text-sm" dir="ltr">{profile.phoneNumber}</p>
               )}
               {profile.freeFeeTransactions && profile.freeFeeTransactions > 0 ? (
                 <div className="flex items-center gap-1 bg-green-50 text-green-700 px-4 py-1.5 rounded-full border border-green-100 text-sm font-bold animate-pulse">
                   <Gift className="w-4 h-4" />
                   لديك {profile.freeFeeTransactions} عملية بدون رسوم!
                 </div>
               ) : null}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex items-center gap-4 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 flex items-center justify-center rounded-xl shrink-0 shadow-inner">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 mb-1">البريد الإلكتروني</span>
                <span className="font-bold text-gray-800 break-all">{profile.email || 'لم يتم إضافة بريد إلكتروني'}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex items-center gap-4 hover:border-green-200 transition-colors">
              <div className="w-12 h-12 bg-green-100 text-green-600 flex items-center justify-center rounded-xl shrink-0 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 mb-1">حالة التوثيق</span>
                <span className={`font-bold ${profile.isVerified ? 'text-green-600' : 'text-orange-500'}`}>
                  {profile.isVerified ? 'موثق ومعتمد' : 'غير موثق'}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex flex-col gap-4 hover:border-purple-200 transition-colors md:col-span-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 flex items-center justify-center rounded-xl shrink-0 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-bold text-gray-400 mb-1">الخدمات</span>
                  <span className="font-bold text-gray-800">إدارة خدماتك المعروضة للعملاء</span>
                </div>
                <button 
                  onClick={() => setIsAddServiceModalOpen(true)} 
                  className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md shadow-purple-100 hover:bg-purple-700 transition-all flex items-center gap-2"
                >
                  إضافة خدمة
                </button>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="mt-8 border-t border-gray-100 pt-8 flex justify-end">
            <button 
              onClick={() => setShowLogoutConfirm(true)} 
              className="flex items-center gap-2 text-red-600 font-bold hover:bg-red-50 px-6 py-3 rounded-xl transition-all border border-transparent hover:border-red-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>

      {/* Referral Section */}
      <div className="bg-gradient-to-tr from-[#2563eb] to-[#4f46e5] rounded-[2.5rem] p-1 shadow-xl">
        <div className="bg-white rounded-[2.3rem] p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-lg">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl text-sm font-black">
                <Gift className="w-5 h-5" />
                برنامج العمولات المجانية
              </div>
              <h2 className="text-3xl font-black text-gray-900 leading-tight">
                ادعُ أصدقاءك واربح <span className="text-blue-600 underline underline-offset-8">عمليات بدون رسوم</span>
              </h2>
              <p className="text-gray-500 font-medium leading-relaxed">
                عند دعوتك لشخص جديد ويقوم بإتمام أول عملية له بنجاح، ستحصل أنت وهو على عملية وساطة قادمة مجانية تماماً من رسوم المنصة.
              </p>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 flex flex-col items-center gap-6 md:min-w-[300px]">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">كود الدعوة الخاص بك</p>
                <div className="text-3xl font-mono font-black text-blue-600 tracking-wider">
                  {profile.referralCode}
                </div>
              </div>
              
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={shareReferral}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  <Share2 className="w-5 h-5" />
                  مشاركة الرابط
                </button>
                <button 
                  onClick={copyToClipboard}
                  className="w-full bg-white text-gray-600 border-2 border-gray-100 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:border-blue-200 hover:text-blue-600 transition-all"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'تم النسخ!' : 'نسخ كود الدعوة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogoutConfirm(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full relative z-10 shadow-2xl text-center">
              <svg className="w-12 h-12 text-red-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <h3 className="text-2xl font-black text-gray-900 mb-2">تسجيل الخروج</h3>
              <p className="text-gray-500 mb-8">هل أنت متأكد من رغبتك في تسجيل الخروج؟</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowLogoutConfirm(false)} className="py-4 font-bold text-gray-500">تراجع</button>
                <button onClick={() => { logout(); navigate('/'); }} className="bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-100">خروج</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Service Modal */}
      {profile && (
        <AddServiceModal 
          isOpen={isAddServiceModalOpen}
          onClose={() => setIsAddServiceModalOpen(false)}
          sellerId={profile.uid}
        />
      )}
    </div>
  );
};

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
