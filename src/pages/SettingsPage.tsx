import React, { useState } from 'react';
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
  Image as ImageIcon
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export const SettingsPage: React.FC = () => {
  const { user, profile, setProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'platform'>('profile');
  const [loading, setLoading] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || user?.displayName || '',
    bio: profile?.bio || '',
    avatarUrl: profile?.avatarUrl || '',
    bannerUrl: profile?.bannerUrl || '',
    phoneNumber: profile?.phoneNumber || '',
    theme: profile?.theme || 'light',
    notificationsEnabled: profile?.notificationsEnabled !== false,
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
      // 1MB limit check for Firestore base64 storage
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
    { id: 'profile', label: 'الحساب والملف الشخصي', icon: User },
    { id: 'security', label: 'الأمان والخصوصية', icon: Lock },
    { id: 'platform', label: 'تخصيص المنصة', icon: Palette, adminOnly: true },
  ];

  const filteredTabs = tabs.filter(tab => !tab.adminOnly || profile?.role === 'admin' || profile?.isAdmin);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 md:py-8 pb-32">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-4 sticky top-6 md:top-24">
            <h1 className="text-xl font-black text-gray-900 px-2 md:px-4 mb-4 md:mb-6 hidden md:block">الإعدادات</h1>
            <nav className="flex md:flex-col gap-2 md:gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar mb-2 md:mb-0">
              {filteredTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-5 py-2.5 md:px-4 md:py-3 rounded-full md:rounded-2xl transition-all font-bold text-sm ${
                    activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                    : 'text-gray-500 hover:bg-gray-50 bg-gray-50 md:bg-transparent border border-gray-100 md:border-transparent'
                  }`}
                >
                  <tab.icon className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px] md:min-h-[600px] flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-5 md:p-8 space-y-6 md:space-y-8"
                >
                  <section>
                    <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                      <User className="w-7 h-7 text-blue-600" />
                      الملف الشخصي
                    </h2>
                    
                    <div className="space-y-6">
                      {/* Avatar & Banner Upload */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-black text-gray-700 block px-1">صورة الملف الشخصي</label>
                          <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 bg-gray-100 rounded-3xl overflow-hidden border-2 border-gray-50 shrink-0">
                              {formData.avatarUrl ? (
                                <img src={formData.avatarUrl} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <User className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <label className="flex-1">
                              <div className="flex items-center gap-2 px-4 py-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all text-gray-500 font-bold text-sm">
                                <Upload className="w-4 h-4" />
                                <span>اختر صورة الملف الشخصي</span>
                              </div>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleFileUpload(e, 'avatarUrl')} 
                              />
                            </label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-black text-gray-700 block px-1">صورة الغلاف (Banner)</label>
                          <div className="flex flex-col gap-4">
                            <div className="relative h-20 bg-gray-100 rounded-3xl overflow-hidden border-2 border-gray-50">
                              {formData.bannerUrl ? (
                                <img src={formData.bannerUrl} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <ImageIcon className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <label>
                              <div className="flex items-center justify-center gap-2 px-4 py-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all text-gray-500 font-bold text-sm">
                                <Upload className="w-4 h-4" />
                                <span>رفع صورة غلاف جديدة</span>
                              </div>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleFileUpload(e, 'bannerUrl')} 
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-black text-gray-700 block px-1">الاسم بالكامل</label>
                          <input 
                            type="text"
                            value={formData.displayName}
                            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                            placeholder="اسمك الثلاثي"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-black text-gray-700 block px-1">رقم الجوال</label>
                          <input 
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                            placeholder="05xxxxxxx"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-black text-gray-700 block px-1">النبذة التعريفية</label>
                        <textarea 
                          rows={4}
                          value={formData.bio}
                          onChange={(e) => setFormData({...formData, bio: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                          placeholder="تحدث عن خبراتك وخدماتك..."
                        />
                      </div>
                    </div>
                  </section>

                  <section className="pt-8 border-t border-gray-50">
                    <h3 className="text-lg font-black text-gray-900 mb-6">تفضيلات الواجهة</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setFormData({...formData, theme: 'light'})}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.theme === 'light' ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-gray-50 text-gray-400'
                      }`}>
                        <Globe className="w-6 h-6" />
                        <span className="font-bold text-sm">الوضع المضيء</span>
                      </button>
                      <button 
                        onClick={() => setFormData({...formData, theme: 'dark'})}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.theme === 'dark' ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-gray-50 text-gray-400'
                      }`}>
                        <Moon className="w-6 h-6" />
                        <span className="font-bold text-sm">الوضع الليلي</span>
                      </button>
                    </div>
                  </section>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-5 md:p-8 space-y-6 md:space-y-8"
                >
                  <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                    <ShieldCheck className="w-7 h-7 text-green-600" />
                    الأمان والخصوصية
                  </h2>

                  <div className="space-y-4">
                    <div className="p-6 bg-gray-50 rounded-3xl flex items-center justify-between">
                      <div className="flex gap-4">
                        <div className="bg-blue-100 p-3 rounded-2xl text-blue-600 shrink-0">
                          <Bell className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-gray-900">إشعارات النظام</p>
                          <p className="text-xs text-gray-500">استلام تنبيهات حول حالة الطلبات والرسائل</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setFormData({...formData, notificationsEnabled: !formData.notificationsEnabled})}
                        className={`w-14 h-8 rounded-full transition-all relative ${formData.notificationsEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                         <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.notificationsEnabled ? 'left-1' : 'left-7'}`} />
                      </button>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-3xl flex items-center justify-between">
                      <div className="flex gap-4">
                        <div className="bg-orange-100 p-3 rounded-2xl text-orange-600 shrink-0">
                          <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-gray-900">توثيق الحساب (MFA)</p>
                          <p className="text-xs text-gray-500">إضافة طبقة حماية إضافية لحسابك</p>
                        </div>
                      </div>
                      <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-bold">قريباً</span>
                    </div>

                    <div className="mt-8 p-6 bg-red-50 rounded-3xl border border-red-100">
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                        <div>
                          <p className="font-black text-red-900">تعطيل الحساب</p>
                          <p className="text-sm text-red-700/70 mb-4 leading-relaxed">سيؤدي تعطيل الحساب إلى إخفاء ملفك الشخصي وجميع خدماتك من المنصة بشكل مؤقت.</p>
                          <button className="text-red-600 font-bold hover:underline">طلب تعطيل الحساب</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'platform' && (
                <motion.div
                  key="platform"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-5 md:p-8 space-y-6 md:space-y-8"
                >
                  <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                    <Palette className="w-7 h-7 text-purple-600" />
                    تخصيص المنصة (للمدراء)
                  </h2>

                  <div className="bg-purple-50 p-6 rounded-3xl space-y-6">
                    <div className="space-y-4">
                      <label className="font-black text-purple-900 block">لون الهوية الرئيسي</label>
                      <div className="flex gap-3">
                        {['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b'].map(color => (
                          <button 
                            key={color}
                            className={`w-10 h-10 rounded-xl border-2 shadow-sm ${profile?.primaryColor === color ? 'border-purple-600 scale-110' : 'border-white'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-white/50 rounded-2xl border border-purple-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-purple-900 text-sm">وضع الصيانة</p>
                        <p className="text-[10px] text-purple-700">إغلاق المنصة للصيانة المجدولة</p>
                      </div>
                      <button className="w-12 h-6 bg-gray-300 rounded-full" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-5 md:px-8 py-5 md:py-6 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 order-2 md:order-1">
                {savedStatus && (
                  <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-green-600 font-bold text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    تم حفظ التغييرات بنجاح
                  </motion.span>
                )}
              </div>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full md:w-auto order-1 md:order-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-300 transition-all shadow-xl shadow-blue-100"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
