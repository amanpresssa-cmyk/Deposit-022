import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Lock, 
  Bell, 
  Palette, 
  ShieldCheck, 
  Globe, 
  Moon, 
  Save, 
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  CreditCard,
  Building,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { PhoneVerification } from '../components/PhoneVerification';
import { IdentityVerification } from '../components/IdentityVerification';

export const SettingsPage: React.FC = () => {
  const { user, profile, setProfile, toggle2FA } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'financial' | 'platform'>('profile');
  const [loading, setLoading] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showIdentityVerification, setShowIdentityVerification] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || user?.displayName || '',
    bio: profile?.bio || '',
    avatarUrl: profile?.avatarUrl || '',
    bannerUrl: profile?.bannerUrl || '',
    phoneNumber: profile?.phoneNumber || '',
    theme: profile?.theme || 'light',
    notificationsEnabled: profile?.notificationsEnabled !== false,
    emailNotifications: profile?.emailNotifications !== false,
    payoutBank: profile?.payoutBank || '',
    payoutIban: profile?.payoutIban || '',
    payoutAccountName: profile?.payoutAccountName || '',
    isPrivate: profile?.isPrivate || false,
    twoFactorEnabled: profile?.twoFactorEnabled || false,
  });

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...formData,
        updatedAt: serverTimestamp()
      });
      
      if (setProfile) {
        setProfile((prev: any) => ({ ...prev, ...formData }));
      }
      
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 3000);
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'bannerUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 1 ميجابايت");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    { id: 'profile', label: 'الملف الشخصي', icon: User },
    { id: 'security', label: 'الأمان والخصوصية', icon: Lock },
    { id: 'financial', label: 'المعلومات المالية', icon: CreditCard },
    { id: 'platform', label: 'إعدادات النظام', icon: Palette, adminOnly: true },
  ];

  const filteredTabs = tabs.filter(tab => !tab.adminOnly || profile?.role === 'admin' || profile?.isAdmin);

  const getVerificationBadge = () => {
    switch (profile?.verificationStatus) {
      case 'verified':
        return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> موثق</span>;
      case 'pending':
        return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> قيد المراجعة</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> مرفوض - حاول مجدداً</span>;
      default:
        return <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-black">غير موثق</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 md:py-12 pb-32">
      {/* Header Section */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 text-blue-600 font-bold mb-2 text-right">
             <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
             مركز التحكم
           </div>
           <h1 className="text-4xl font-black text-gray-900 tracking-tight text-right">إعدادات الحساب</h1>
           <p className="text-gray-500 mt-2 font-medium text-right">قم بإدارة بياناتك، تفضيلات الأمان، والمعلومات المالية للمنصة.</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm md:w-fit overflow-x-auto no-scrollbar" dir="rtl">
          {filteredTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-black text-sm whitespace-nowrap ${
                activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <tab.icon className={`w-4 h-4 shrink-0 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start" dir="rtl">
        {/* Right Side: Profile Preview Card */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-8 text-center sticky top-24">
              <div className="relative mb-6 mx-auto w-32 h-32">
                 <div className="absolute inset-0 bg-blue-600 rounded-[2.5rem] rotate-6 opacity-10"></div>
                 <div className="absolute inset-0 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-1 z-10">
                    <img 
                      src={formData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.displayName)}&background=random`} 
                      className="w-full h-full object-cover rounded-[2.2rem]"
                      alt="Profile" 
                    />
                 </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-1">
                <h3 className="text-xl font-black text-gray-900">{formData.displayName || 'بدون اسم'}</h3>
                {profile?.isVerified && <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-50" />}
              </div>
              <p className="text-sm text-gray-400 font-medium mb-6">{user?.email}</p>
              
              <div className="flex items-center justify-center gap-2 mb-8">
                {getVerificationBadge()}
              </div>

              <div className="p-1 px-1.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-1.5">
                 <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm">
                    <ShieldCheck className="w-5 h-5" />
                 </div>
                 <div className="text-right flex-1 pr-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">مستوى الموثوقية</p>
                    <p className="text-sm font-black text-gray-900 leading-none">{profile?.trustLevel || 0}% كامل</p>
                 </div>
              </div>

              <button 
                onClick={() => handleSave()}
                disabled={loading}
                className="w-full mt-8 bg-gray-900 text-white p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-800 disabled:bg-gray-200 transition-all shadow-xl shadow-gray-100"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                حفظ التغييرات
              </button>
           </div>
        </div>

        {/* Left Side: Tab Content */}
        <div className="lg:col-span-8 flex flex-col gap-6 text-right">
           <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
              <AnimatePresence mode="wait">
                 {activeTab === 'profile' && (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="p-8 md:p-12 space-y-10"
                    >
                      <section>
                         <h2 className="text-2xl font-black text-gray-900 mb-8">المعلومات الشخصية</h2>
                         <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                               <div className="space-y-2">
                                  <label className="text-xs font-black text-gray-500 block mr-1 uppercase tracking-widest text-right">الاسم الكامل</label>
                                  <div className="relative">
                                    <input 
                                      type="text"
                                      value={formData.displayName}
                                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pr-12 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-right"
                                      placeholder="اسمك الثلاثي"
                                    />
                                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                  </div>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-xs font-black text-gray-500 block mr-1 uppercase tracking-widest text-right">رقم الجوال</label>
                                  <div className="relative">
                                    <input 
                                      type="tel"
                                      value={formData.phoneNumber}
                                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pr-12 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold tracking-widest text-right"
                                      placeholder="05xxxxxxx"
                                    />
                                    <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                  </div>
                               </div>
                            </div>

                            <div className="space-y-2">
                               <label className="text-xs font-black text-gray-500 block mr-1 uppercase tracking-widest text-right">النبذة التعريفية</label>
                               <textarea 
                                 rows={4}
                                 value={formData.bio}
                                 onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                 className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium leading-relaxed text-right"
                                 placeholder="أخبر المستخدمين بمجال تخصصك وما تقدمه من خدمات..."
                               />
                            </div>
                         </div>
                      </section>

                      <section className="pt-10 border-t border-gray-50">
                         <h2 className="text-2xl font-black text-gray-900 mb-8">صور الحساب</h2>
                         <div className="grid md:grid-cols-12 gap-8">
                            <div className="md:col-span-4 space-y-3">
                               <p className="text-sm font-black text-gray-700">الصورة الرمزية</p>
                               <div 
                                 className="group relative w-full aspect-square bg-gray-50 p-1 rounded-3xl border border-gray-100 cursor-pointer overflow-hidden transition-all hover:border-blue-200"
                               >
                                  <img 
                                    src={formData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.displayName)}&background=random`} 
                                    className="w-full h-full object-cover rounded-[1.3rem] transition-transform group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white text-[10px] font-black">
                                     <Upload className="w-6 h-6 mb-1" />
                                     تعديل الصورة
                                  </div>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    onChange={(e) => handleFileUpload(e, 'avatarUrl')} 
                                  />
                               </div>
                            </div>

                            <div className="md:col-span-8 space-y-3">
                               <p className="text-sm font-black text-gray-700">صورة الغلاف (Banner)</p>
                               <div 
                                 className="group relative w-full h-full bg-gray-50 p-1 rounded-3xl border border-gray-100 cursor-pointer overflow-hidden transition-all hover:border-blue-200"
                               >
                                  {formData.bannerUrl ? (
                                    <img src={formData.bannerUrl} className="w-full h-full object-cover rounded-[1.3rem] transition-transform group-hover:scale-105" />
                                  ) : (
                                    <div className="w-full h-32 md:h-full flex items-center justify-center text-gray-300">
                                      <ImageIcon className="w-12 h-12" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white text-[10px] font-black">
                                     <Upload className="w-6 h-6 mb-1" />
                                     تعديل الغلاف
                                  </div>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    onChange={(e) => handleFileUpload(e, 'bannerUrl')} 
                                  />
                               </div>
                            </div>
                         </div>
                      </section>
                    </motion.div>
                 )}

                 {activeTab === 'security' && (
                    <motion.div
                      key="security"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-8 md:p-12 space-y-8"
                    >
                      <h2 className="text-2xl font-black text-gray-900 mb-8">الأمان والخصوصية</h2>

                      <div className="grid gap-4">
                        <div className="p-6 bg-gray-50 rounded-[2rem] flex items-center justify-between border border-gray-100 group hover:bg-white hover:shadow-lg hover:shadow-blue-50/50 transition-all">
                          <div className="flex gap-4">
                            <div className="bg-blue-100 p-4 rounded-[1.5rem] text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                              <Bell className="w-6 h-6" />
                            </div>
                            <div className="text-right">
                              <p className="font-black text-gray-900">إشعارات المنصة</p>
                              <p className="text-xs text-gray-400 mt-1 font-medium italic">تنبيهات حالة الطلبات والرسائل المباشرة</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setFormData({...formData, notificationsEnabled: !formData.notificationsEnabled})}
                            className={`w-14 h-8 rounded-full transition-all relative ${formData.notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                          >
                             <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${formData.notificationsEnabled ? 'right-1' : 'right-7'}`} />
                          </button>
                        </div>

                        <div className="p-6 bg-gray-50 rounded-[2rem] flex items-center justify-between border border-gray-100 group hover:bg-white hover:shadow-lg hover:shadow-blue-50/50 transition-all">
                          <div className="flex gap-4">
                            <div className="bg-purple-100 p-4 rounded-[1.5rem] text-purple-600 shrink-0 group-hover:scale-110 transition-transform">
                              {formData.isPrivate ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                            </div>
                            <div className="text-right">
                              <p className="font-black text-gray-900">حساب خاص</p>
                              <p className="text-xs text-gray-400 mt-1 font-medium italic">إخفاء ملفك الشخصي عن غير المسجلين بالمنصة</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setFormData({...formData, isPrivate: !formData.isPrivate})}
                            className={`w-14 h-8 rounded-full transition-all relative ${formData.isPrivate ? 'bg-purple-600' : 'bg-gray-200'}`}
                          >
                             <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${formData.isPrivate ? 'right-1' : 'right-7'}`} />
                          </button>
                        </div>

                        <div className="p-6 bg-gray-50 rounded-[2rem] flex items-center justify-between border border-gray-100 group hover:bg-white hover:shadow-lg hover:shadow-blue-50/50 transition-all">
                          <div className="flex gap-4">
                            <div className="bg-amber-100 p-4 rounded-[1.5rem] text-amber-600 shrink-0 group-hover:scale-110 transition-transform">
                              <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div className="text-right">
                              <p className="font-black text-gray-900">التحقق بخطوتين (2FA)</p>
                              <p className="text-xs text-gray-400 mt-1 font-medium italic">تأمين حسابك عبر رمز OTP يصل لجوالك عند الدخول</p>
                            </div>
                          </div>
                          <button 
                            onClick={async () => {
                              if (!formData.twoFactorEnabled) {
                                // If enabling, check if phone number exists
                                if (!profile?.phoneNumber) {
                                  setShowPhoneVerification(true);
                                  return;
                                }
                                await toggle2FA(true);
                                setFormData({...formData, twoFactorEnabled: true});
                              } else {
                                await toggle2FA(false);
                                setFormData({...formData, twoFactorEnabled: false});
                              }
                            }}
                            className={`w-14 h-8 rounded-full transition-all relative ${formData.twoFactorEnabled ? 'bg-amber-500' : 'bg-gray-200'}`}
                          >
                             <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${formData.twoFactorEnabled ? 'right-1' : 'right-7'}`} />
                          </button>
                        </div>

                        <div className="p-6 bg-blue-50/50 rounded-[2rem] flex flex-col md:flex-row items-center gap-4 justify-between border border-blue-100/50 mt-6 overflow-hidden relative">
                           <div className="absolute -left-4 -bottom-4 opacity-10 rotate-12">
                              <ShieldCheck className="w-24 h-24 text-blue-600" />
                           </div>
                           <div className="flex gap-4 items-center flex-1">
                              <div className="bg-white p-4 rounded-[1.5rem] text-blue-600 shrink-0 shadow-sm">
                                 <Smartphone className="w-6 h-6" />
                              </div>
                              <div className="text-right">
                                 <p className="font-black text-gray-900">توثيق رقم الجوال</p>
                                 <p className="text-[10px] text-blue-600 font-bold mt-1 leading-relaxed">
                                    {profile?.phoneNumber 
                                      ? 'رقم جوالك موثق ومرتبط بحسابك' 
                                      : 'قم بتوثيق رقم جوالك عبر رمز OTP لرفع مستوى الأمان في حسابك.'}
                                 </p>
                              </div>
                           </div>
                           
                           {profile?.phoneNumber ? (
                             <div className="bg-white px-6 py-3 rounded-2xl flex items-center gap-2 text-green-600 font-black text-xs shadow-sm shadow-green-100 ring-1 ring-green-100">
                                <CheckCircle2 className="w-4 h-4" />
                                موثق
                             </div>
                           ) : (
                             <div className="flex flex-col gap-3 items-end">
                               <button 
                                 onClick={() => setShowPhoneVerification(true)}
                                 className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-xs font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                               >
                                 ابدأ التوثيق الآن
                               </button>
                             </div>
                           )}
                        </div>
                      </div>

                       <div className="pt-10 border-t border-gray-50">
                          <h3 className="font-black text-gray-900 mb-6 font-mono text-sm uppercase tracking-widest text-blue-600">المستندات القانونية والدعم</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                             <Link to="/terms" className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                                <div className="flex items-center gap-3">
                                   <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                                      <Globe className="w-4 h-4" />
                                   </div>
                                   <span className="text-xs font-black text-gray-700">شروط الاستخدام</span>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-300" />
                             </Link>
                             <Link to="/privacy" className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                                <div className="flex items-center gap-3">
                                   <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                                      <Lock className="w-4 h-4" />
                                   </div>
                                   <span className="text-xs font-black text-gray-700">سياسة الخصوصية</span>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-300" />
                             </Link>
                             <Link to="/faq" className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                                <div className="flex items-center gap-3">
                                   <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
                                      <Bell className="w-4 h-4" />
                                   </div>
                                   <span className="text-xs font-black text-gray-700">الأسئلة الشائعة</span>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-300" />
                             </Link>
                          </div>
                       </div>

                       <div className="pt-10 border-t border-gray-50 flex items-center justify-between">
                          <div className="text-right">
                             <p className="font-black text-red-600 mb-1">تعطيل الحساب</p>
                            <p className="text-[10px] text-gray-400 font-medium">سيتم إخفاء بياناتك من المنصة بشكل مؤقت</p>
                         </div>
                         <button className="px-6 py-3 rounded-xl border border-red-100 text-red-600 text-xs font-black hover:bg-red-50 transition-colors">
                           طلب التعطيل
                         </button>
                      </div>
                    </motion.div>
                 )}

                 {activeTab === 'financial' && (
                   <motion.div
                      key="financial"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-8 md:p-12 space-y-8"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-black text-gray-900">المعلومات المالية</h2>
                        <div className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-[10px] font-black border border-green-100">
                           نظام مشفر بالكامل
                        </div>
                      </div>
                      
                      <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex gap-4">
                         <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
                         <p className="text-xs text-amber-800 leading-relaxed font-bold text-right">
                            المعلومات المذكورة هنا تستخدم حصراً لتحويل مستحقاتك من الصفقات الناجحة. يرجى التأكد من دقة رقم الـ IBAN لتجنب تأخر التسويات.
                         </p>
                      </div>

                      <div className="grid gap-6 mt-8">
                         <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 block mr-1 uppercase tracking-widest text-right">اسم البنك</label>
                            <div className="relative">
                              <select 
                                value={formData.payoutBank}
                                onChange={(e) => setFormData({...formData, payoutBank: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pr-12 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold appearance-none text-right"
                              >
                                <option value="">اختر البنك...</option>
                                <option value="stc_pay">اس تي سي بنك (STC Bank)</option>
                                <option value="alrajhi">مصرف الراجحي</option>
                                <option value="snbe">البنك الأهلي السعودي</option>
                                <option value="insider">بنك الإنماء</option>
                                <option value="riyad">بنك الرياض</option>
                              </select>
                              <Building className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                            </div>
                         </div>

                         <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 block mr-1 uppercase tracking-widest text-right">اسم صاحب الحساب</label>
                            <div className="relative">
                              <input 
                                type="text"
                                value={formData.payoutAccountName}
                                onChange={(e) => setFormData({...formData, payoutAccountName: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pr-12 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-right"
                                placeholder="كما يظهر في بطاقة البنك"
                              />
                              <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                            </div>
                         </div>

                         <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 block mr-1 uppercase tracking-widest text-right">رقم الآيبان (IBAN)</label>
                            <div className="relative">
                              <input 
                                type="text"
                                value={formData.payoutIban}
                                onChange={(e) => setFormData({...formData, payoutIban: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pr-12 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold tracking-widest uppercase text-right"
                                placeholder="SAXXXXXXXXXXXXXXXXXXXXXX"
                              />
                              <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                            </div>
                         </div>
                      </div>
                   </motion.div>
                 )}

                 {activeTab === 'platform' && (
                    <motion.div
                      key="platform"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-8 md:p-12 space-y-10"
                    >
                      <div className="flex items-center justify-between mb-8">
                         <h2 className="text-2xl font-black text-gray-900">إعدادات المنصة</h2>
                         <div className="bg-purple-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                            Admin Only
                         </div>
                      </div>

                      <div className="bg-purple-50 p-10 rounded-[3rem] space-y-8 border border-purple-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 -rotate-12 translate-x-10 -translate-y-10 rounded-full"></div>
                        
                        <div className="space-y-4 relative z-10 text-right">
                          <label className="font-black text-purple-900 block text-lg">الهوية البصرية</label>
                          <p className="text-xs text-purple-700/60 font-medium">اختر اللون الأساسي لواجهة المستخدم في المنصة</p>
                          <div className="flex flex-wrap gap-4 mt-4 justify-end">
                            {['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#000000'].map(color => (
                              <button 
                                key={color}
                                onClick={() => setProfile && setProfile((p:any) => ({...p, primaryColor: color}))}
                                className={`w-12 h-12 rounded-[1.2rem] border-4 transition-all shadow-sm active:scale-95 ${profile?.primaryColor === color ? 'border-white ring-4 ring-purple-600/20 scale-110' : 'border-white'}`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                           <button className="bg-white p-6 rounded-[2rem] border border-purple-100 flex items-center justify-between group hover:shadow-xl hover:shadow-purple-100 transition-all text-right">
                              <div>
                                <p className="font-black text-purple-900">وضع الصيانة</p>
                                <p className="text-[10px] text-purple-400 mt-1">تجميد كافة العمليات حالياً</p>
                              </div>
                              <div className="w-12 h-7 bg-gray-200 rounded-full relative">
                                 <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm"></div>
                              </div>
                           </button>

                           <button className="bg-white p-6 rounded-[2rem] border border-purple-100 flex items-center justify-between group hover:shadow-xl hover:shadow-purple-100 transition-all text-right">
                              <div>
                                <p className="font-black text-purple-900">التحقق الإلزامي</p>
                                <p className="text-[10px] text-purple-400 mt-1">إلزام المستخدمين بالتوثيق</p>
                              </div>
                              <div className="w-12 h-7 bg-purple-600 rounded-full relative">
                                 <div className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full shadow-sm"></div>
                              </div>
                           </button>
                        </div>
                      </div>
                    </motion.div>
                 )}
              </AnimatePresence>

              {/* Bottom Message */}
              <div className="mt-auto px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between rounded-b-[3rem]">
                 {savedStatus && (
                   <motion.div 
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="flex items-center gap-2 text-green-600 font-black text-xs"
                   >
                     <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                     </div>
                     تم الحفظ بنجاح
                   </motion.div>
                 )}
                 <p className="text-[10px] text-gray-400 font-medium mr-auto">آخر تحديث: {profile?.updatedAt ? new Date(profile.updatedAt.toDate()).toLocaleDateString('ar-SA') : 'اليوم'}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Verification Modals */}
      <AnimatePresence>
        {showPhoneVerification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <PhoneVerification 
                onSuccess={() => {
                  setShowPhoneVerification(false);
                  setSavedStatus(true);
                  setTimeout(() => setSavedStatus(false), 3000);
                }}
                onClose={() => setShowPhoneVerification(false)} 
              />
            </motion.div>
          </div>
        )}

        {showIdentityVerification && (
          <IdentityVerification 
            onClose={() => setShowIdentityVerification(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
