import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../../lib/firestoreUtils';
import { motion } from 'framer-motion';
import { 
  Clock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast as hotToast } from 'sonner';

export const AdminSettingsSecurity: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [security, setSecurity] = useState({ maintenanceMode: false, maintenanceMessage: '', forceVerification: true, sessionLimit: 24 });

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(doc(db, 'app_settings', 'security'), d => {
      if (d.exists()) {
        setSecurity(d.data() as any);
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/security'));
    return () => unsub();
  }, [isAdmin]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'app_settings', 'security'), { ...security, updatedAt: serverTimestamp() });
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
          <h1 className="text-3xl font-black text-gray-900 tracking-tight ">إعدادات <span className="text-red-600">الأمان</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">حماية النظام، وضع الصيانة، وتوثيق الحسابات</p>
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
              <h4 className="text-base font-black text-gray-900 mb-2 ">التحقق من الهوية (KYC)</h4>
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
              <h4 className="text-base font-black text-gray-900 mb-2 ">طول الجلسة الآمنة (Hours)</h4>
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
          onClick={saveSettings} 
          disabled={saving}
          className="w-full py-5 bg-gray-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-gray-300 hover:scale-[1.02] active:scale-95 transition-all"
        >
          {saving ? 'جاري الحفظ...' : 'تحديث بروتوكولات النظام'}
        </button>
      </div>
    </div>
  );
};
