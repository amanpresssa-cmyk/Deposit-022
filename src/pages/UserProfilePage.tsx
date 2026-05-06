import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Settings, ShieldCheck, Mail, MapPin, Share2, Gift, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export const UserProfilePage: React.FC = () => {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);

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
        <div className="h-48 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
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
    </div>
  );
};

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
