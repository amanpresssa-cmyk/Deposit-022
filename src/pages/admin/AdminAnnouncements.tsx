import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { 
  AlertCircle, 
  Trash2, 
  Plus, 
  Sparkles,
  X,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast as hotToast } from 'sonner';
import { Link } from 'react-router-dom';

export const AdminAnnouncements: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.isAdmin || false; // Just double checking although layout protects it
  
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'announcements'), d => {
      if (d.exists() && Array.isArray(d.data().items)) {
        setAnnouncements(d.data().items);
      } else {
        // Fallback migration check
        onSnapshot(doc(db, 'app_settings', 'announcement'), oldSnap => {
           if (oldSnap.exists()) setAnnouncements([{ id: 'old-1', ...oldSnap.data() }]);
        });
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/announcements'));

    return () => unsub();
  }, []);

  const addAnnouncement = () => {
    setAnnouncements([...announcements, {
      id: Date.now().toString(),
      text: '', type: 'info', isActive: true, link: '', visibility: 'all',
      gradientStart: '', gradientEnd: '', isTicker: false, hideCloseButton: false,
      startDate: '', endDate: '', icon: ''
    }]);
  };

  const updateAnnouncement = (index: number, field: string, value: any) => {
    const newAnns = [...announcements];
    newAnns[index] = { ...newAnns[index], [field]: value };
    setAnnouncements(newAnns);
  };

  const removeAnnouncement = (index: number) => {
    setAnnouncements(announcements.filter((_, i) => i !== index));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'app_settings', 'announcements'), { items: announcements, updatedAt: serverTimestamp() });
      hotToast.success('تم حفظ الإعلانات بنجاح');
    } catch (e) {
      hotToast.error('حدث خطأ أثناء حفظ الإعلانات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-96 flex items-center justify-center text-gray-400 font-bold ">جاري تحميل الإعلانات...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight ">إدارة <span className="text-purple-600">الإعلانات</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">التحكم في الأشرطة الإعلانية والتنبيهات المباشرة للمنصة</p>
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

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black ">إعلانات المنصة (Global Banner)</h3>
          </div>
          <button 
            onClick={addAnnouncement} 
            className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-xl font-black text-[10px] tracking-widest uppercase transition-colors"
          >
            + إضافة إعلان جديد
          </button>
        </div>

        {announcements.map((ann, index) => (
          <div key={ann.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-200 space-y-6 relative group">
            <button 
              onClick={() => removeAnnouncement(index)}
              className="absolute top-4 left-4 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
              title="حذف الإعلان"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-4">
              <span className={`text-[9px] font-black uppercase tracking-widest ${ann.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                 {ann.isActive ? 'مفعل الآن' : 'معطل مؤقتاً'}
              </span>
              <button 
                onClick={() => updateAnnouncement(index, 'isActive', !ann.isActive)} 
                className={`w-14 h-7 rounded-full transition-all relative ${ann.isActive ? 'bg-green-500' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${ann.isActive ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            {/* LIVE PREVIEW AREA */}
            <div className="p-4 bg-white rounded-2xl border border-gray-100 border-dashed space-y-3">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">معاينة مباشرة</p>
               <div 
                 className={`w-full py-2.5 px-4 rounded-xl text-center text-xs font-black relative overflow-hidden shadow-sm flex items-center justify-center gap-2 text-white ${
                   (!ann.gradientStart && !ann.gradientEnd) ? (
                     ann.type === 'urgent' ? 'bg-gradient-to-r from-red-600 to-rose-700' : 
                     ann.type === 'promo' ? 'bg-gradient-to-r from-purple-600 to-indigo-700' : 
                     ann.type === 'success' ? 'bg-gradient-to-r from-green-600 to-emerald-700' :
                     'bg-gradient-to-r from-blue-900 to-slate-900'
                   ) : ''
                 }`}
                 style={(ann.gradientStart && ann.gradientEnd) ? { background: `linear-gradient(to right, ${ann.gradientStart}, ${ann.gradientEnd})` } : {}}
               >
                  <span className="shrink-0 text-[14px]">
                    {ann.icon || (ann.type === 'promo' ? '✨' : ann.type === 'urgent' ? '⚠️' : ann.type === 'success' ? '✅' : '🔔')}
                  </span>
                  <span>{ann.text || 'اكتب نص الإعلان هنا...'}</span>
                  {!ann.hideCloseButton && <X className="w-3 h-3 absolute left-4 text-white/50" />}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">نص الإشعار</label>
                <input 
                  type="text" 
                  value={ann.text} 
                  onChange={e => updateAnnouncement(index, 'text', e.target.value)} 
                  className="w-full bg-white rounded-2xl p-4 text-sm font-bold border border-gray-200 focus:border-purple-500 outline-none transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">نوع التنبيه</label>
                <select 
                  value={ann.type} 
                  onChange={e => updateAnnouncement(index, 'type', e.target.value)} 
                  className="w-full bg-white rounded-2xl p-4 text-sm font-bold border border-gray-200 focus:border-purple-500 outline-none cursor-pointer"
                >
                  <option value="info">إرشادي (أزرق)</option>
                  <option value="urgent">عاجل (أحمر)</option>
                  <option value="promo">ترويجي (بنفسجي)</option>
                  <option value="success">إيجابي (أخضر)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">شروط الظهور</label>
                <select 
                  value={ann.visibility || 'all'} 
                  onChange={e => updateAnnouncement(index, 'visibility', e.target.value)} 
                  className="w-full bg-white rounded-2xl p-4 text-sm font-bold border border-gray-200 focus:border-purple-500 outline-none cursor-pointer"
                >
                  <option value="all">للجميع (زوار ومسجلين)</option>
                  <option value="logged_in">للمستخدمين المسجلين فقط</option>
                  <option value="logged_out">للزوار غير المسجلين فقط</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">تاريخ البداية (اختياري)</label>
                <input 
                  type="datetime-local" 
                  value={ann.startDate || ''} 
                  onChange={e => updateAnnouncement(index, 'startDate', e.target.value)} 
                  className="w-full bg-white rounded-2xl p-4 text-sm font-bold border border-gray-200 focus:border-purple-500 outline-none transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">تاريخ النهاية (اختياري)</label>
                <input 
                  type="datetime-local" 
                  value={ann.endDate || ''} 
                  onChange={e => updateAnnouncement(index, 'endDate', e.target.value)} 
                  className="w-full bg-white rounded-2xl p-4 text-sm font-bold border border-gray-200 focus:border-purple-500 outline-none transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">أيقونة الإعلان (إيموجي)</label>
                <input 
                  type="text" 
                  value={ann.icon || ''} 
                  onChange={e => updateAnnouncement(index, 'icon', e.target.value)} 
                  placeholder="مثال: 🚀 أو 📢"
                  className="w-full bg-white rounded-2xl p-4 text-sm font-bold border border-gray-200 focus:border-purple-500 outline-none transition-all" 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">رابط الإعلان الشامل (Link)</label>
                <input 
                  type="text" 
                  value={ann.link || ''} 
                  onChange={e => updateAnnouncement(index, 'link', e.target.value)} 
                  placeholder="https://..."
                  className="w-full bg-white rounded-2xl p-4 text-sm font-bold border border-gray-200 focus:border-purple-500 outline-none transition-all" 
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">لون متدرج مخصص (بداية HEX)</label>
                <input 
                  type="text" 
                  value={ann.gradientStart || ''} 
                  onChange={e => updateAnnouncement(index, 'gradientStart', e.target.value)} 
                  placeholder="#FF0000"
                  className="w-full bg-white rounded-2xl p-4 text-sm font-bold border border-gray-200 focus:border-purple-500 outline-none transition-all uppercase" 
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">لون متدرج مخصص (نهاية HEX)</label>
                <input 
                  type="text" 
                  value={ann.gradientEnd || ''} 
                  onChange={e => updateAnnouncement(index, 'gradientEnd', e.target.value)} 
                  placeholder="#990000"
                  className="w-full bg-white rounded-2xl p-4 text-sm font-bold border border-gray-200 focus:border-purple-500 outline-none transition-all uppercase" 
                  dir="ltr"
                />
              </div>

            </div>

            <div className="flex items-center gap-6 p-4 bg-white rounded-2xl border border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={ann.isTicker || false} onChange={e => updateAnnouncement(index, 'isTicker', e.target.checked)} className="w-4 h-4 text-purple-600 rounded" />
                <span className="text-xs font-bold text-gray-700">شريط متحرك (Marquee)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={ann.hideCloseButton || false} onChange={e => updateAnnouncement(index, 'hideCloseButton', e.target.checked)} className="w-4 h-4 text-purple-600 rounded" />
                <span className="text-xs font-bold text-gray-700">إخفاء زر الإغلاق</span>
              </label>
            </div>
            
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center p-12 bg-gray-50 rounded-3xl border border-gray-100 border-dashed">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-bold text-sm">لا توجد إعلانات حالياً</p>
            <p className="text-gray-400 text-xs mt-2">انقر على إضافة إعلان جديد للبدء</p>
          </div>
        )}

        <button 
          onClick={saveSettings} 
          disabled={saving}
          className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-100 mt-4"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ ونشر الإعلانات'}
        </button>
      </div>
    </div>
  );
};
