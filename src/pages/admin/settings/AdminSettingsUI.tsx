import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../../lib/firestoreUtils';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2,
  Plus,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast as hotToast } from 'sonner';

export const AdminSettingsUI: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [homeCard, setHomeCard] = useState({ imageUrl: '', quote: '', author: '' });
  const [heroBanner, setHeroBanner] = useState({ 
    titleTop: 'ضمانك الموثوق', 
    titleBottom: 'في العالم الرقمي', 
    subtitle: 'خطوات مدروسة تقنياً لضمان سلامة كل ريال من طرفي الصفقة.',
    showUserCards: true,
    trustMessages: [
      "الخيار الأول للتعاملات الآمنة",
      "وساطة مالية ذكية وموثوقة",
      "حقك محفوظ بأمان تام",
      "دفع إلكتروني معتمد 100%",
      "خدمة تقسيط المدفوعات متوفرة الآن"
    ]
  });

  useEffect(() => {
    if (!isAdmin) return;
    const unsubs = [
      onSnapshot(doc(db, 'app_settings', 'home_card'), d => d.exists() && setHomeCard(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/home_card')),
      onSnapshot(doc(db, 'app_settings', 'hero_banner'), d => d.exists() && setHeroBanner(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/hero_banner'))
    ];
    setLoading(false);
    return () => unsubs.forEach(u => u());
  }, [isAdmin]);

  const saveSettings = async (path: string, data: any) => {
    setSaving(path);
    try {
      await setDoc(doc(db, 'app_settings', path), { ...data, updatedAt: serverTimestamp() });
      hotToast.success('تم حفظ الإعدادات بنجاح');
    } catch (e) {
      hotToast.error('خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="h-96 flex items-center justify-center text-gray-400 font-bold ">جاري تحميل الإعدادات...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight ">الواجهة <span className="text-blue-600">والتصميم</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">تخصيص الواجهة الرئيسية والبانرات</p>
        </div>
        <div className="flex gap-2">
          <Link 
            to="/admin/settings"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold text-[11px] transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            رجوع للإعدادات
          </Link>
          <Link 
            to="/admin"
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-xl font-bold text-[11px] transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            لوحة الإدارة
          </Link>
        </div>
      </div>

      <div className="space-y-8">
        {/* Home Card UI */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black ">البطاقة الترحيبية</h3>
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

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black ">بانر الصفحة الرئيسية (Hero Section)</h3>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">العنوان العلوي</label>
                <input 
                  type="text" 
                  value={heroBanner.titleTop} 
                  onChange={e => setHeroBanner(p => ({...p, titleTop: e.target.value}))} 
                  className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">العنوان السفلي (ملون)</label>
                <input 
                  type="text" 
                  value={heroBanner.titleBottom} 
                  onChange={e => setHeroBanner(p => ({...p, titleBottom: e.target.value}))} 
                  className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all" 
                />
              </div>
              <div className="space-y-2 flex items-center gap-3 pt-6">
                <input 
                  type="checkbox" 
                  id="showUserCards"
                  checked={heroBanner.showUserCards} 
                  onChange={e => setHeroBanner(p => ({...p, showUserCards: e.target.checked}))} 
                  className="w-5 h-5 accent-blue-600" 
                />
                <label htmlFor="showUserCards" className="text-sm font-bold text-gray-700 cursor-pointer">إظهار بطاقات المستخدمين في الهيرو</label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الوصف المختصر</label>
              <textarea 
                value={heroBanner.subtitle} 
                onChange={e => setHeroBanner(p => ({...p, subtitle: e.target.value}))} 
                className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">رسائل الثقة (المتحركة في الهيرو)</label>
              <div className="space-y-3">
                {heroBanner.trustMessages.map((msg, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      type="text" 
                      value={msg} 
                      onChange={e => {
                        const newMsgs = [...heroBanner.trustMessages];
                        newMsgs[idx] = e.target.value;
                        setHeroBanner(p => ({...p, trustMessages: newMsgs}));
                      }}
                      className="flex-1 bg-gray-50 rounded-xl p-3 text-xs font-bold border border-transparent focus:border-blue-500 outline-none" 
                    />
                    <button 
                      onClick={() => {
                        const newMsgs = heroBanner.trustMessages.filter((_, i) => i !== idx);
                        setHeroBanner(p => ({...p, trustMessages: newMsgs}));
                      }}
                      className="p-3 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => setHeroBanner(p => ({...p, trustMessages: [...p.trustMessages, '']}))}
                  className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest px-3 py-2 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Plus className="w-3 h-3" />
                  إضافة رسالة ثقة
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={() => saveSettings('hero_banner', heroBanner)} 
            disabled={saving === 'hero_banner'}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100"
          >
            {saving === 'hero_banner' ? 'جاري الحفظ...' : 'تحديث بانر الواجهة'}
          </button>
        </div>
      </div>
    </div>
  );
};
