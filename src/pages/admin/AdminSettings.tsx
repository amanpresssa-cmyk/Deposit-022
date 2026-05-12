import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { 
  ShieldCheck, 
  Image as ImageIcon, 
  Upload, 
  LayoutGrid, 
  Wallet, 
  Lock, 
  Mail, 
  Smartphone,
  Globe,
  DollarSign,
  Percent,
  Clock,
  Palette,
  FileText,
  Share2,
  Trash2,
  Plus,
  Save,
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type SettingsTab = 'general' | 'ui' | 'finance' | 'security' | 'support' | 'legal';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export const AdminSettings: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Settings States
  const [general, setGeneral] = useState({ platformName: '', platformTagline: '', logoUrl: '', faviconUrl: '' });
  const [homeCard, setHomeCard] = useState({ imageUrl: '', quote: '', author: '' });
  const [announcement, setAnnouncement] = useState({ text: '', type: 'info', isActive: false, link: '' });
  const [appearance, setAppearance] = useState({ primaryColor: '#2563eb', theme: 'light', font: 'inter' });
  const [finance, setFinance] = useState({ commission: 5, minWithdraw: 100, vatRate: 15, payoutCycle: 'weekly', minEscrow: 50 });
  const [security, setSecurity] = useState({ maintenanceMode: false, maintenanceMessage: '', forceVerification: true, sessionLimit: 24 });
  const [support, setSupport] = useState({ email: '', phone: '', address: '', whatsapp: '', twitter: '', instagram: '' });
  const [legal, setLegal] = useState({ tosLink: '', privacyLink: '', refundLink: '' });

  useEffect(() => {
    if (!isAdmin) return;

    const unsubs = [
      onSnapshot(doc(db, 'app_settings', 'general'), d => d.exists() && setGeneral(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/general')),
      onSnapshot(doc(db, 'app_settings', 'home_card'), d => d.exists() && setHomeCard(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/home_card')),
      onSnapshot(doc(db, 'app_settings', 'announcement'), d => d.exists() && setAnnouncement(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/announcement')),
      onSnapshot(doc(db, 'app_settings', 'appearance'), d => d.exists() && setAppearance(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/appearance')),
      onSnapshot(doc(db, 'app_settings', 'finance'), d => d.exists() && setFinance(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/finance')),
      onSnapshot(doc(db, 'app_settings', 'security'), d => d.exists() && setSecurity(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/security')),
      onSnapshot(doc(db, 'app_settings', 'support'), d => d.exists() && setSupport(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/support')),
      onSnapshot(doc(db, 'app_settings', 'legal'), d => d.exists() && setLegal(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/legal')),
    ];
    setLoading(false);
    return () => unsubs.forEach(u => u());
  }, [isAdmin]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveSettings = async (path: string, data: any) => {
    setSaving(path);
    try {
      await setDoc(doc(db, 'app_settings', path), { ...data, updatedAt: serverTimestamp() });
      showToast('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setSaving(null), 1000);
    } catch (e) {
      showToast('خطأ أثناء حفظ الإعدادات', 'error');
      setSaving(null);
    }
  };

  const tabs = [
    { id: 'general', label: 'الإعدادات العامة', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'ui', label: 'الواجهة والتصميم', icon: <Palette className="w-4 h-4" /> },
    { id: 'finance', label: 'السياسات المالية', icon: <Wallet className="w-4 h-4" /> },
    { id: 'security', label: 'الأمان والنظام', icon: <Lock className="w-4 h-4" /> },
    { id: 'support', label: 'تواصل ودعم', icon: <Mail className="w-4 h-4" /> },
    { id: 'legal', label: 'السياسات القانونية', icon: <FileText className="w-4 h-4" /> },
  ];

  if (loading) return <div className="h-96 flex items-center justify-center text-gray-400 font-bold italic">جاري تحميل إعدادات النظام...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">إعدادات <span className="text-blue-600">المنصة</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">القوة والتحكم الكامل في هوية وتشغيل خيارات التمر</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] tracking-widest uppercase border border-blue-100 italic transition-transform hover:scale-105">
          <ShieldCheck className="w-4 h-4" />
          بيئة تحكم مشفرة
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:w-72 space-y-2 sticky top-8 h-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                ? 'bg-gray-950 text-white shadow-2xl shadow-gray-200 translate-x-2' 
                : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100 hover:border-blue-100'
              }`}
            >
              <div className="flex items-center gap-3">
                {tab.icon}
                {tab.label}
              </div>
              {activeTab === tab.id && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Tab Header */}
              <div className="mb-8 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${activeTab === 'finance' ? 'bg-green-50 text-green-600' : activeTab === 'security' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {tabs.find(t => t.id === activeTab)?.icon}
                  </div>
                  <div>
                    <h2 className="font-black text-lg italic">{tabs.find(t => t.id === activeTab)?.label}</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">تعديل بارامترات {tabs.find(t => t.id === activeTab)?.label}</p>
                  </div>
                </div>
                {saving && (
                  <div className="flex items-center gap-2 text-blue-600 animate-pulse">
                     <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                     <span className="text-[10px] font-black uppercase">جاري الحفظ</span>
                  </div>
                )}
              </div>

              {/* GENERAL SETTINGS */}
              {activeTab === 'general' && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">اسم المنصة</label>
                       <input 
                         type="text" 
                         value={general.platformName}
                         onChange={e => setGeneral(p => ({...p, platformName: e.target.value}))}
                         placeholder="مثال: خيارات التمر"
                         className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">وصف المنصة (Tagline)</label>
                       <input 
                         type="text" 
                         value={general.platformTagline}
                         onChange={e => setGeneral(p => ({...p, platformTagline: e.target.value}))}
                         placeholder="مثال: سوق التمور الإلكتروني الأكثر أماناً"
                         className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">رابط الشعار (Logo URL)</label>
                       <div className="relative">
                          <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="text" 
                            value={general.logoUrl}
                            onChange={e => setGeneral(p => ({...p, logoUrl: e.target.value}))}
                            placeholder="https://example.com/logo.png"
                            className="w-full bg-gray-50 rounded-2xl p-4 pl-12 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all"
                            dir="ltr"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">رابط الأيقونة (Favicon URL)</label>
                       <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="text" 
                            value={general.faviconUrl}
                            onChange={e => setGeneral(p => ({...p, faviconUrl: e.target.value}))}
                            placeholder="https://example.com/favicon.ico"
                            className="w-full bg-gray-50 rounded-2xl p-4 pl-12 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all"
                            dir="ltr"
                          />
                       </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => saveSettings('general', general)} 
                    disabled={saving === 'general'}
                    className="w-full py-5 bg-gray-950 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200"
                  >
                    {saving === 'general' ? 'جاري الحفظ...' : 'حفظ إعدادات المنصة العامة'}
                  </button>
                </div>
              )}

              {/* UI & DESIGN */}
              {activeTab === 'ui' && (
                <div className="space-y-8">
                  {/* Home Card UI */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-black italic">البطاقة الترحيبية</h3>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="relative h-56 bg-gray-50 rounded-[2rem] overflow-hidden border-2 border-dashed border-gray-100 group transition-all hover:border-blue-200 shadow-inner">
                        {homeCard.imageUrl ? (
                          <img src={homeCard.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                            <Upload className="w-10 h-10 mb-2 opacity-20" />
                            <span className="text-[10px] font-black uppercase tracking-widest">ارفع صورة تعبر عن عراقة التمور</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm">
                          <Upload className="w-8 h-8 text-white mb-2" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">تغيير الصورة الإرشادية</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={e => {
                               const file = e.target.files?.[0];
                               if (file) {
                                 const reader = new FileReader();
                                 reader.onloadend = () => setHomeCard(p => ({ ...p, imageUrl: reader.result as string }));
                                 reader.readAsDataURL(file);
                               }
                            }} 
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">النص التسويقي (Quote)</label>
                          <textarea 
                            value={homeCard.quote} 
                            onChange={e => setHomeCard(p => ({...p, quote: e.target.value}))} 
                            placeholder="اقتباس أو حكمة عن التمر..."
                            className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all min-h-[120px] resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">القائل / المصدر</label>
                          <input 
                            type="text" 
                            value={homeCard.author} 
                            onChange={e => setHomeCard(p => ({...p, author: e.target.value}))} 
                            className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => saveSettings('home_card', homeCard)} 
                      disabled={saving === 'home_card'}
                      className="w-full py-5 bg-gray-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200"
                    >
                      {saving === 'home_card' ? 'جاري الحفظ...' : 'تحديث البطاقة الرئيسية'}
                    </button>
                  </div>

                  {/* Announcement Banner */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-black italic">إعلانات المنصة (Global Banner)</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${announcement.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                           {announcement.isActive ? 'مفعل الآن' : 'معطل مؤقتاً'}
                        </span>
                        <button 
                          onClick={() => setAnnouncement(p => ({...p, isActive: !p.isActive}))} 
                          className={`w-14 h-7 rounded-full transition-all relative ${announcement.isActive ? 'bg-green-500' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${announcement.isActive ? 'left-8' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    {/* LIVE PREVIEW AREA */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 border-dashed space-y-3">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">معاينة مباشرة</p>
                       <div className={`w-full py-2.5 px-4 rounded-xl text-center text-xs font-black relative overflow-hidden shadow-sm flex items-center justify-center gap-2 ${
                         announcement.type === 'urgent' ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white' : 
                         announcement.type === 'promo' ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white' : 
                         announcement.type === 'success' ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white' :
                         'bg-gradient-to-r from-blue-900 to-slate-900 text-white'
                       }`}>
                          {announcement.type === 'promo' && <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
                          {announcement.type === 'urgent' && <AlertCircle className="w-3.5 h-3.5 animate-bounce" />}
                          <span>{announcement.text || 'اكتب نص الإعلان هنا...'}</span>
                       </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">نص الإشعار</label>
                        <input 
                          type="text" 
                          value={announcement.text} 
                          onChange={e => setAnnouncement(p => ({...p, text: e.target.value}))} 
                          className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-purple-500 outline-none transition-all" 
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">نوع التنبيه</label>
                          <select 
                            value={announcement.type} 
                            onChange={e => setAnnouncement(p => ({...p, type: e.target.value}))} 
                            className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-purple-500 outline-none cursor-pointer"
                          >
                            <option value="info">إرشادي (أزرق)</option>
                            <option value="urgent">عاجل (أحمر)</option>
                            <option value="promo">ترويجي (بنفسجي)</option>
                            <option value="success">إيجابي (أخضر)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">رابط الإجراء (Link)</label>
                          <div className="relative">
                             <Plus className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                             <input 
                               type="text" 
                               value={announcement.link} 
                               onChange={e => setAnnouncement(p => ({...p, link: e.target.value}))} 
                               className="w-full bg-gray-50 rounded-2xl p-5 pr-12 text-sm font-bold border border-transparent focus:border-purple-500 outline-none" 
                               dir="ltr" 
                             />
                          </div>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => saveSettings('announcement', announcement)} 
                      disabled={saving === 'announcement'}
                      className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-100"
                    >
                      تحديث إعلان المنصة
                    </button>
                  </div>
                </div>
              )}

              {/* FINANCE SETTINGS */}
              {activeTab === 'finance' && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                       <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-4">هيكل العمولات</h4>
                       <div className="space-y-6">
                         <div className="space-y-2">
                           <div className="flex justify-between items-center px-1">
                             <label className="text-[10px] font-black text-gray-950 uppercase tracking-widest">نسبة عمولة المنصة</label>
                             <span className="text-sm font-black text-blue-600 italic">{finance.commission}%</span>
                           </div>
                           <div className="relative">
                             <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                             <input 
                               type="number" 
                               value={finance.commission}
                               onChange={e => setFinance(p => ({...p, commission: Number(e.target.value)}))}
                               className="w-full bg-gray-50 rounded-2xl p-5 pl-12 text-sm font-black border border-transparent focus:border-blue-500 outline-none transition-all"
                             />
                           </div>
                         </div>
                         <div className="space-y-2">
                           <div className="flex justify-between items-center px-1">
                             <label className="text-[10px] font-black text-gray-950 uppercase tracking-widest">ضريبة القيمة المضافة (VAT)</label>
                             <span className="text-sm font-black text-gray-400 italic">{finance.vatRate}%</span>
                           </div>
                           <input 
                             type="number" 
                             value={finance.vatRate}
                             onChange={e => setFinance(p => ({...p, vatRate: Number(e.target.value)}))}
                             className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-black border border-transparent focus:border-blue-500 outline-none transition-all"
                           />
                         </div>
                       </div>
                    </div>

                    <div className="space-y-8">
                       <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-4">إعدادات السحب والحدود</h4>
                       <div className="space-y-6">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-950 uppercase tracking-widest px-1">الحد الأدنى للسحب (SAR)</label>
                           <div className="relative">
                             <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                             <input 
                               type="number" 
                               value={finance.minWithdraw}
                               onChange={e => setFinance(p => ({...p, minWithdraw: Number(e.target.value)}))}
                               className="w-full bg-gray-50 rounded-2xl p-5 pl-12 text-sm font-black border border-transparent focus:border-blue-500 outline-none transition-all"
                             />
                           </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-950 uppercase tracking-widest px-1">دورة التحويلات البنكية</label>
                            <select 
                              value={finance.payoutCycle}
                              onChange={e => setFinance(p => ({...p, payoutCycle: e.target.value}))}
                              className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-black border border-transparent focus:border-blue-500 outline-none cursor-pointer appearance-none"
                            >
                              <option value="daily">تحويل يومي</option>
                              <option value="weekly">أسبوعي (كل إثنين)</option>
                              <option value="monthly">شهري منتظم</option>
                            </select>
                         </div>
                       </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
                     <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />
                     <div>
                        <p className="text-sm font-black text-blue-900 mb-1">تأثير التعديلات المالية</p>
                        <p className="text-[11px] font-bold text-blue-700 leading-relaxed opacity-70 italic">أي تغيير في نسبة العمولة سيطبق فقط على العمليات الجديدة التي تتم بعد لحظة الحفظ. العمليات القائمة والمحجوزة حالياً ستحتفظ بالنسب القديمة.</p>
                     </div>
                  </div>

                  <button 
                    onClick={() => saveSettings('finance', finance)} 
                    disabled={saving === 'finance'}
                    className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-100"
                  >
                    اعتماد السياسات المالية الجديدة
                  </button>
                </div>
              )}

              {/* SECURITY & SYSTEM */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                    <div className="divide-y divide-gray-50">
                      <div className="py-8 flex items-center justify-between gap-10">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                             <h4 className="text-base font-black text-gray-900">وضع الصيانة الكامل (Blackout)</h4>
                             {security.maintenanceMode && <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded uppercase animate-pulse">Platform Down</span>}
                          </div>
                          <p className="text-xs font-bold text-gray-400 leading-relaxed">عند التفعيل، سيتم حجب المنصة عن جميع المشترين والبائعين وإظهار رسالة صيانة مخصصة. وحدها الإدارة يمكنها الدخول.</p>
                        </div>
                        <button 
                          onClick={() => setSecurity(p => ({...p, maintenanceMode: !p.maintenanceMode}))}
                          className={`w-16 h-8 rounded-full transition-all relative shrink-0 shadow-inner ${security.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-lg ${security.maintenanceMode ? 'left-9' : 'left-1'}`} />
                        </button>
                      </div>

                      {security.maintenanceMode && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="py-6 space-y-2"
                        >
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">رسالة الصيانة للمستخدمين</label>
                           <textarea 
                             value={security.maintenanceMessage}
                             onChange={e => setSecurity(p => ({...p, maintenanceMessage: e.target.value}))}
                             placeholder="نحن نقوم بنقل خوادم المنصة لتحسين الأداء، سنعود قريباً..."
                             className="w-full bg-red-50/50 rounded-2xl p-5 text-sm font-bold border border-red-100 focus:border-red-500 outline-none transition-all min-h-[100px] text-red-900"
                           />
                        </motion.div>
                      )}

                      <div className="py-8 flex items-center justify-between gap-10">
                        <div className="flex-1">
                          <h4 className="text-base font-black text-gray-900 mb-2 italic">التحقق من الهوية (KYC)</h4>
                          <p className="text-xs font-bold text-gray-400 leading-relaxed uppercase tracking-tighter">فرض إرفاق الهوية الوطنية والسجل التجاري (للمؤسسات) كشرط أساسي لفتح أي طلبات أو تداولات مالية.</p>
                        </div>
                        <button 
                          onClick={() => setSecurity(p => ({...p, forceVerification: !p.forceVerification}))}
                          className={`w-16 h-8 rounded-full transition-all relative shrink-0 shadow-inner ${security.forceVerification ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-lg ${security.forceVerification ? 'left-9' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="py-8 flex items-center justify-between gap-10">
                        <div className="flex-1">
                          <h4 className="text-base font-black text-gray-900 mb-2 italic">طول الجلسة الآمنة (Hours)</h4>
                          <p className="text-xs font-bold text-gray-400 leading-relaxed">عدد الساعات المسموح بها لبقاء المستخدم مسجل الدخول قبل إلزامه بإعادة التوثيق.</p>
                        </div>
                        <div className="w-28 relative">
                           <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                           <input 
                             type="number" 
                             value={security.sessionLimit}
                             onChange={e => setSecurity(p => ({...p, sessionLimit: Number(e.target.value)}))}
                             className="w-full bg-gray-50 rounded-2xl p-5 pl-10 text-center text-sm font-black border border-transparent focus:border-blue-600 outline-none shadow-inner"
                           />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => saveSettings('security', security)} 
                      disabled={saving === 'security'}
                      className="w-full py-5 bg-gray-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-gray-300"
                    >
                      تحديث بروتوكولات النظام
                    </button>
                  </div>
                </div>
              )}

              {/* SUPPORT & SOCIAL */}
              {activeTab === 'support' && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">القنوات الرسمية</h4>
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 mr-1 italic">بريد الدعم</label>
                              <div className="relative group">
                                 <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
                                 <input 
                                   type="email" 
                                   value={support.email}
                                   onChange={e => setSupport(p => ({...p, email: e.target.value}))}
                                   className="w-full bg-gray-50 rounded-2xl p-5 pr-12 text-sm font-bold border border-transparent focus:border-purple-500 outline-none"
                                   dir="ltr"
                                 />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 mr-1 italic">رقم الواتساب</label>
                              <div className="relative group">
                                 <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                 <input 
                                   type="text" 
                                   value={support.whatsapp}
                                   onChange={e => setSupport(p => ({...p, whatsapp: e.target.value}))}
                                   className="w-full bg-gray-50 rounded-2xl p-5 pr-12 text-sm font-bold border border-transparent focus:border-purple-500 outline-none"
                                   dir="ltr"
                                 />
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">التواجد الاجتماعي</h4>
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 mr-1 italic">Twitter (X)</label>
                              <div className="relative">
                                 <Share2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                 <input 
                                   type="text" 
                                   value={support.twitter}
                                   onChange={e => setSupport(p => ({...p, twitter: e.target.value}))}
                                   placeholder="@khyrat_farm"
                                   className="w-full bg-gray-50 rounded-2xl p-5 pr-12 text-sm font-bold border border-transparent focus:border-purple-500 outline-none"
                                   dir="ltr"
                                 />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 mr-1 italic">Instagram</label>
                              <div className="relative">
                                 <Share2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                 <input 
                                   type="text" 
                                   value={support.instagram}
                                   onChange={e => setSupport(p => ({...p, instagram: e.target.value}))}
                                   placeholder="@khyrat_farm"
                                   className="w-full bg-gray-50 rounded-2xl p-5 pr-12 text-sm font-bold border border-transparent focus:border-purple-500 outline-none"
                                   dir="ltr"
                                 />
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">المقر الرئيسي / عنوان المراسلات</label>
                        <textarea 
                          value={support.address}
                          onChange={e => setSupport(p => ({...p, address: e.target.value}))}
                          className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-purple-500 outline-none transition-all min-h-[80px] resize-none"
                        />
                     </div>
                  </div>

                  <button 
                    onClick={() => saveSettings('support', support)} 
                    disabled={saving === 'support'}
                    className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-100"
                  >
                    حفظ الملف التعريفي وقنوات الدعم
                  </button>
                </div>
              )}

              {/* LEGAL & POLICIES */}
              {activeTab === 'legal' && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-4">
                   <div className="space-y-6">
                      <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                            <ShieldCheck className="w-6 h-6 text-blue-600" />
                         </div>
                         <div>
                            <h4 className="font-black text-sm italic mb-1">الوثائق القانونية</h4>
                            <p className="text-[10px] font-bold text-gray-400 leading-relaxed italic">هذه الروابط ستظهر في الفوتر وفي صفحات تسجيل البائعين لضمان الشفافية والموافقة الصريحة.</p>
                         </div>
                      </div>

                      <div className="space-y-6">
                         {[
                            { label: 'شروط الاستخدام (TOS)', key: 'tosLink', icon: <FileText className="w-4 h-4" /> },
                            { label: 'سياسة الخصوصية', key: 'privacyLink', icon: <Lock className="w-4 h-4" /> },
                            { label: 'سياسة الاسترجاع والضمان', key: 'refundLink', icon: <DollarSign className="w-4 h-4" /> }
                         ].map(item => (
                            <div key={item.key} className="space-y-2">
                               <label className="text-[10px] font-black text-gray-950 uppercase tracking-widest px-1 block">{item.label}</label>
                               <div className="relative group">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                     <a href={(legal as any)[item.key]} target="_blank" rel="noreferrer" className="p-1.5 bg-white rounded-lg text-gray-300 hover:text-blue-600 shadow-sm transition-all border border-gray-100">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                     </a>
                                     {item.icon}
                                  </div>
                                  <input 
                                    type="text" 
                                    value={(legal as any)[item.key]}
                                    onChange={e => setLegal(p => ({...p, [item.key]: e.target.value}))}
                                    placeholder="https://khyratfarm.com/legal/..."
                                    className="w-full bg-gray-50 rounded-2xl p-5 pl-20 text-xs font-bold border border-transparent focus:border-blue-600 outline-none transition-all"
                                    dir="ltr"
                                  />
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>

                   <button 
                    onClick={() => saveSettings('legal', legal)} 
                    disabled={saving === 'legal'}
                    className="w-full py-5 bg-gray-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200"
                  >
                    ربط الوثائق القانونية
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50"
          >
            <div className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              toast.type === 'success' 
              ? 'bg-gray-950 text-white border-white/10' 
              : 'bg-red-600 text-white border-red-500'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5" />}
              <span className="font-black text-xs italic tracking-tight">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
