import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  ShieldCheck, 
  Image as ImageIcon, 
  Upload, 
  LayoutGrid, 
  Wallet, 
  Settings2, 
  Lock, 
  Mail, 
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Globe,
  DollarSign,
  Percent,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type SettingsTab = 'ui' | 'finance' | 'security' | 'support';

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ui');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Settings State
  const [homeCard, setHomeCard] = useState({ imageUrl: '', quote: '', author: '' });
  const [announcement, setAnnouncement] = useState({ text: '', type: 'info', isActive: false, link: '' });
  const [finance, setFinance] = useState({ commission: 5, minWithdraw: 100, vatRate: 15, payoutCycle: 'weekly' });
  const [security, setSecurity] = useState({ maintenanceMode: false, forceVerification: true, sessionLimit: 24 });
  const [support, setSupport] = useState({ email: '', phone: '', address: '', whatsapp: '' });

  useEffect(() => {
    const unsubs = [
      onSnapshot(doc(db, 'app_settings', 'home_card'), d => d.exists() && setHomeCard(d.data() as any)),
      onSnapshot(doc(db, 'app_settings', 'announcement'), d => d.exists() && setAnnouncement(d.data() as any)),
      onSnapshot(doc(db, 'app_settings', 'finance'), d => d.exists() && setFinance(d.data() as any)),
      onSnapshot(doc(db, 'app_settings', 'security'), d => d.exists() && setSecurity(d.data() as any)),
      onSnapshot(doc(db, 'app_settings', 'support'), d => d.exists() && setSupport(d.data() as any)),
    ];
    setLoading(false);
    return () => unsubs.forEach(u => u());
  }, []);

  const saveSettings = async (path: string, data: any) => {
    setSaving(path);
    try {
      await setDoc(doc(db, 'app_settings', path), { ...data, updatedAt: serverTimestamp() });
      // Success feedback
      setTimeout(() => setSaving(null), 1000);
    } catch (e) {
      alert('فشل الحفظ');
      setSaving(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert('الصورة كبيرة جداً (الحد الأقصى 2 ميجابايت)');
      const reader = new FileReader();
      reader.onloadend = () => setHomeCard(p => ({ ...p, imageUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    { id: 'ui', label: 'الواجهة والتصميم', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'finance', label: 'الإعدادات المالية', icon: <Wallet className="w-4 h-4" /> },
    { id: 'security', label: 'النظام والأمان', icon: <Lock className="w-4 h-4" /> },
    { id: 'support', label: 'بيانات التواصل', icon: <Mail className="w-4 h-4" /> },
  ];

  if (loading) return <div className="h-96 flex items-center justify-center text-gray-400">جاري التحميل...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">إعدادات <span className="text-blue-600">المنصة</span></h1>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">التحكم الكامل في الخصائص الأساسية والأمان والسياسات المالية</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:w-64 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' 
                : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'ui' && (
                <div className="space-y-6">
                  {/* Home Card UI */}
                  <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-black">واجهة البداية</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="relative h-48 bg-gray-50 rounded-3xl overflow-hidden border-2 border-dashed border-gray-100 group transition-all hover:border-blue-200">
                        {homeCard.imageUrl ? (
                          <img src={homeCard.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                            <Upload className="w-10 h-10 mb-2 opacity-20" />
                            <span className="text-[10px] font-black uppercase tracking-widest">اختر صورة دعائية قوية</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-sm">
                          <Upload className="w-6 h-6 text-white" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-right block">كلمة ترحيب / اقتباس</label>
                          <textarea 
                            value={homeCard.quote} 
                            onChange={e => setHomeCard(p => ({...p, quote: e.target.value}))} 
                            placeholder="اكتب هنا العبارة التي ستظهر على البطاقة الرئيسية..."
                            className="w-full bg-gray-50 rounded-2xl p-4 text-xs font-bold border border-transparent focus:border-blue-500 outline-none transition-all placeholder:text-gray-300 min-h-[100px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-right block">المصدر / المؤلف</label>
                          <input 
                            type="text" 
                            value={homeCard.author} 
                            onChange={e => setHomeCard(p => ({...p, author: e.target.value}))} 
                            placeholder="اسم القائل أو المصدر"
                            className="w-full bg-gray-50 rounded-2xl p-4 text-xs font-bold border border-transparent focus:border-blue-500 outline-none transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => saveSettings('home_card', homeCard)} 
                      disabled={saving === 'home_card'}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50"
                    >
                      {saving === 'home_card' ? 'جاري الحفظ...' : 'تحديث الواجهة الرئيسية'}
                    </button>
                  </div>

                  {/* Announcement */}
                  <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                          <Globe className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-black">شريط الإشعارات العلوي</h3>
                      </div>
                      <button 
                        onClick={() => setAnnouncement(p => ({...p, isActive: !p.isActive}))} 
                        className={`w-12 h-6 rounded-full transition-all relative ${announcement.isActive ? 'bg-green-500' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${announcement.isActive ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-right block">نص الإعلان</label>
                        <input 
                          type="text" 
                          value={announcement.text} 
                          onChange={e => setAnnouncement(p => ({...p, text: e.target.value}))} 
                          className="w-full bg-gray-50 rounded-2xl p-4 text-xs font-bold border border-transparent focus:border-blue-500 outline-none transition-all" 
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-right block">نمط الإعلان</label>
                          <select 
                            value={announcement.type} 
                            onChange={e => setAnnouncement(p => ({...p, type: e.target.value}))} 
                            className="w-full bg-gray-50 rounded-2xl p-4 text-xs font-bold border border-transparent focus:border-blue-500 outline-none appearance-none cursor-pointer"
                          >
                            <option value="info">أزرق - معلومات عامة</option>
                            <option value="urgent">أحمر - تنبيه هام</option>
                            <option value="promo">بنفسجي - عروض ترويجية</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-right block">رابط التوجيه (اختياري)</label>
                          <input 
                            type="text" 
                            value={announcement.link} 
                            onChange={e => setAnnouncement(p => ({...p, link: e.target.value}))} 
                            className="w-full bg-gray-50 rounded-2xl p-4 text-xs font-bold border border-transparent focus:border-blue-500 outline-none" 
                            dir="ltr" 
                          />
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => saveSettings('announcement', announcement)} 
                      disabled={saving === 'announcement'}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                    >
                      {saving === 'announcement' ? 'جاري الحفظ...' : 'تحديث شريط الإعلان'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black">السياسات المالية والعمولات</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">عمولة المنصة (%)</label>
                          <span className="text-[10px] font-black text-green-600">{finance.commission}%</span>
                        </div>
                        <div className="relative">
                          <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="number" 
                            value={finance.commission}
                            onChange={e => setFinance(p => ({...p, commission: Number(e.target.value)}))}
                            className="w-full bg-gray-50 rounded-2xl p-4 pl-10 text-xs font-black border border-transparent focus:border-green-500 outline-none transition-all"
                          />
                        </div>
                        <p className="text-[9px] text-gray-400 font-bold">هذه النسبة تُخصم تلقائياً من كل عملية بيع لصالح المنصة.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">ضريبة القيمة المضافة (%)</label>
                        <input 
                          type="number" 
                          value={finance.vatRate}
                          onChange={e => setFinance(p => ({...p, vatRate: Number(e.target.value)}))}
                          className="w-full bg-gray-50 rounded-2xl p-4 text-xs font-black border border-transparent focus:border-green-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الحد الأدنى للسحب (SAR)</label>
                        <input 
                          type="number" 
                          value={finance.minWithdraw}
                          onChange={e => setFinance(p => ({...p, minWithdraw: Number(e.target.value)}))}
                          className="w-full bg-gray-50 rounded-2xl p-4 text-xs font-black border border-transparent focus:border-green-500 outline-none transition-all"
                        />
                        <p className="text-[9px] text-gray-400 font-bold">لا يمكن للبائعين طلب سحب رصيدهم إذا كان أقل من هذا المبلغ.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-right block">دورة تحويل الأرصدة</label>
                        <select 
                          value={finance.payoutCycle}
                          onChange={e => setFinance(p => ({...p, payoutCycle: e.target.value}))}
                          className="w-full bg-gray-50 rounded-2xl p-4 text-xs font-black border border-transparent focus:border-green-500 outline-none cursor-pointer"
                        >
                          <option value="daily">يومية</option>
                          <option value="weekly">أسبوعية (كل إثنين)</option>
                          <option value="biweekly">كل أسبوعين</option>
                          <option value="monthly">شهرية</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => saveSettings('finance', finance)} 
                    disabled={saving === 'finance'}
                    className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-100 hover:bg-green-700 transition-all"
                  >
                    {saving === 'finance' ? 'جاري الحفظ...' : 'حفظ السياسات المالية'}
                  </button>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-black">إعدادات النظام والأمان</h3>
                    </div>

                    <div className="divide-y divide-gray-50">
                      <div className="py-6 flex items-center justify-between gap-6">
                        <div className="flex-1">
                          <p className="text-sm font-black text-gray-900 mb-1 flex items-center gap-2">
                            وضع الصيانة (Maintenance Mode)
                            {security.maintenanceMode && <span className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded uppercase font-black animate-pulse">Active</span>}
                          </p>
                          <p className="text-xs font-bold text-gray-400">عند التفعيل، سيتم إغلاق المنصة أمام جميع المستخدمين (باستثناء الإدارة) لعرض رسالة صيانة.</p>
                        </div>
                        <button 
                          onClick={() => setSecurity(p => ({...p, maintenanceMode: !p.maintenanceMode}))}
                          className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${security.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${security.maintenanceMode ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="py-6 flex items-center justify-between gap-6">
                        <div className="flex-1">
                          <p className="text-sm font-black text-gray-900 mb-1">التحقق الإلزامي من الهوية (KYC)</p>
                          <p className="text-xs font-bold text-gray-400">منع البائعين من إضافة منتجات حتى يتم رفع وتحويل المستندات القانونية وتوثيق الحساب.</p>
                        </div>
                        <button 
                          onClick={() => setSecurity(p => ({...p, forceVerification: !p.forceVerification}))}
                          className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${security.forceVerification ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${security.forceVerification ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="py-6 flex items-center justify-between gap-6">
                        <div className="flex-1">
                          <p className="text-sm font-black text-gray-900 mb-1">مدة الجلسة النشطة (ساعة)</p>
                          <p className="text-xs font-bold text-gray-400">الحد الأقصى لبقاء المستخدم مسجل الدخول قبل طلب تسجيل دخول جديد.</p>
                        </div>
                        <div className="w-24 relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="number" 
                            value={security.sessionLimit}
                            onChange={e => setSecurity(p => ({...p, sessionLimit: Number(e.target.value)}))}
                            className="w-full bg-gray-50 rounded-xl p-3 pl-8 text-xs font-black text-center border-none focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => saveSettings('security', security)} 
                      disabled={saving === 'security'}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
                    >
                      {saving === 'security' ? 'جاري التحديث...' : 'تحديث إعدادات الأمان'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'support' && (
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Mail className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black">بيانات التواصل والدعم</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-right block">بريد الدعم الفني</label>
                      <div className="relative">
                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="email" 
                          value={support.email}
                          onChange={e => setSupport(p => ({...p, email: e.target.value}))}
                          className="w-full bg-gray-50 rounded-2xl p-4 pr-12 text-xs font-bold border border-transparent focus:border-purple-500 outline-none"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-right block">رقم واتساب الأعمال</label>
                      <div className="relative">
                        <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          value={support.whatsapp}
                          onChange={e => setSupport(p => ({...p, whatsapp: e.target.value}))}
                          className="w-full bg-gray-50 rounded-2xl p-4 pr-12 text-xs font-bold border border-transparent focus:border-purple-500 outline-none"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-right block">العنوان الفعلي أو المكتب الرئيسي</label>
                      <input 
                        type="text" 
                        value={support.address}
                        onChange={e => setSupport(p => ({...p, address: e.target.value}))}
                        className="w-full bg-gray-50 rounded-2xl p-4 text-xs font-bold border border-transparent focus:border-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => saveSettings('support', support)} 
                    disabled={saving === 'support'}
                    className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-100 hover:bg-purple-700 transition-all"
                  >
                    {saving === 'support' ? 'جاري الحفظ...' : 'حفظ بيانات التواصل'}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

