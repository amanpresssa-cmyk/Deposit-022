import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../../lib/firestoreUtils';
import { 
  FileText,
  Lock,
  DollarSign,
  ExternalLink,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast as hotToast } from 'sonner';

export const AdminSettingsLegal: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [legal, setLegal] = useState({ tosLink: '', privacyLink: '', refundLink: '' });

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(doc(db, 'app_settings', 'legal'), d => {
      if (d.exists()) {
        setLegal(d.data() as any);
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/legal'));
    return () => unsub();
  }, [isAdmin]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'app_settings', 'legal'), { ...legal, updatedAt: serverTimestamp() });
      hotToast.success('تم حفظ الإعدادات بنجاح');
    } catch (e) {
      hotToast.error('خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-96 flex items-center justify-center text-gray-400 font-bold ">جاري تحميل الإعدادات...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight ">الشؤون <span className="text-blue-600">القانونية</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">تحديث الروابط القانونية وسياسات المنصة</p>
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

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
         <div className="space-y-6">
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-6 h-6 text-blue-600" />
               </div>
               <div>
                  <h4 className="font-black text-sm mb-1">الوثائق القانونية</h4>
                  <p className="text-[10px] font-bold text-gray-400 leading-relaxed ">هذه الروابط ستظهر في الفوتر وفي صفحات تسجيل البائعين لضمان الشفافية والموافقة الصريحة.</p>
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
           onClick={saveSettings} 
           disabled={saving}
           className="w-full py-5 bg-gray-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-gray-300 hover:scale-[1.02] active:scale-95 transition-all"
         >
           {saving ? 'جاري الحفظ...' : 'حفظ الوثائق القانونية'}
         </button>
      </div>
    </div>
  );
};
