import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../../lib/firestoreUtils';
import { 
  Mail,
  Smartphone,
  Share2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast as hotToast } from 'sonner';

export const AdminSettingsSupport: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [support, setSupport] = useState({ email: 'support@khyratfarm.com', whatsapp: '+966500000000', twitter: '', instagram: '', address: '' });

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(doc(db, 'app_settings', 'support'), d => {
      if (d.exists()) {
        setSupport(d.data() as any);
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/support'));
    return () => unsub();
  }, [isAdmin]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'app_settings', 'support'), { ...support, updatedAt: serverTimestamp() });
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
          <h1 className="text-3xl font-black text-gray-900 tracking-tight ">الدعم <span className="text-purple-600">والمساعدة</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">تحديث قنوات التواصل وأرقام الخدمة</p>
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

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-6">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">القنوات الرسمية</h4>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 mr-1 ">بريد الدعم</label>
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
                    <label className="text-[10px] font-bold text-gray-400 mr-1 ">رقم الواتساب</label>
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
                    <label className="text-[10px] font-bold text-gray-400 mr-1 ">Twitter (X)</label>
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
                    <label className="text-[10px] font-bold text-gray-400 mr-1 ">Instagram</label>
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
          onClick={saveSettings} 
          disabled={saving}
          className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-100 hover:scale-[1.02] active:scale-95 transition-all"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الملف التعريفي وقنوات الدعم'}
        </button>
      </div>
    </div>
  );
};
