import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  History, 
  Search, 
  Filter, 
  Terminal, 
  AlertCircle, 
  ShieldCheck, 
  Info, 
  Clock,
  Activity,
  ArrowRightLeft,
  User,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

const SEVERITY_COLORS = {
  'INFO': 'bg-blue-50 text-blue-600 border-blue-100',
  'SUCCESS': 'bg-green-50 text-green-600 border-green-100',
  'WARNING': 'bg-orange-50 text-orange-600 border-orange-100',
  'ERROR': 'bg-red-50 text-red-600 border-red-100',
  'CRITICAL': 'bg-red-600 text-white border-red-700'
};

const OP_ICONS = {
  'PAYOUT_CONFIRMATION': <ShieldCheck className="w-4 h-4" />,
  'AUTH': <User className="w-4 h-4" />,
  'PAYMENT': <ArrowRightLeft className="w-4 h-4" />,
  'SYSTEM': <Terminal className="w-4 h-4" />,
  'ERROR': <AlertCircle className="w-4 h-4" />
};

export const SystemLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    warning: 0,
    error: 0
  });

  useEffect(() => {
    let q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(100));

    if (filterSeverity !== 'ALL') {
      q = query(collection(db, 'system_logs'), where('severity', '==', filterSeverity), orderBy('timestamp', 'desc'), limit(100));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
      
      // Calculate stats based on the last 100 logs
      const s = data.reduce((acc, log: any) => {
        acc.total++;
        if (log.severity === 'SUCCESS' || log.severity === 'INFO') acc.success++;
        if (log.severity === 'WARNING') acc.warning++;
        if (log.severity === 'ERROR' || log.severity === 'CRITICAL') acc.error++;
        return acc;
      }, { total: 0, success: 0, warning: 0, error: 0 });
      
      setStats(s);
      setLoading(false);
    });

    return () => unsub();
  }, [filterSeverity]);

  const getSimpleExplanation = (log: any) => {
    const type = log.operationType;
    const msg = log.message;

    if (type === 'PAYOUT_CONFIRMATION') return 'تم استلام وتأكيد تحويل رسوم المنصة من جيديا بنجاح.';
    if (type === 'AUTH') return 'عملية دخول أو تسجيل في النظام من قبل مستخدم.';
    if (type === 'PAYMENT') return 'معالجة عملية دفع مالي أو طلب تفويض بنكي.';
    if (type === 'ERROR') return 'حدث خطأ تقني في أحد أجزاء النظام، يرجى المراجعة.';
    
    // Fallback or heuristic
    if (msg?.includes('دخول')) return 'محاولة ولوج للنظام.';
    if (msg?.includes('دفع')) return 'عملية مالية قيد التنفيذ.';
    
    return msg || 'عملية نظام اعتيادية تم تسجيلها.';
  };

  const filteredLogs = logs.filter(log => 
    log.message?.toLowerCase().includes(search.toLowerCase()) ||
    log.operationType?.toLowerCase().includes(search.toLowerCase()) ||
    log.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-gray-900 text-white rounded-xl shadow-lg">
                 <Terminal className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">سجل <span className="text-blue-600">النظام</span></h1>
           </div>
           <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mr-12">مراقبة وتحليل كافة العمليات التقنية والداخلية</p>
        </div>

        <div className="flex items-center gap-2">
           <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
              {['ALL', 'INFO', 'WARNING', 'ERROR'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    filterSeverity === sev 
                    ? 'bg-gray-900 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {sev === 'ALL' ? 'الكل' : sev}
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">REALTIME</span>
          </div>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">إجمالي العمليات</p>
          <p className="text-2xl font-black text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-green-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-green-600/60 font-bold text-[10px] uppercase tracking-widest mb-1">عمليات آمنة/ناجحة</p>
          <p className="text-2xl font-black text-green-900">{stats.success}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-orange-600/60 font-bold text-[10px] uppercase tracking-widest mb-1">تنبيهات أمنية</p>
          <p className="text-2xl font-black text-orange-900">{stats.warning}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm group hover:border-red-500 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-red-600/60 font-bold text-[10px] uppercase tracking-widest mb-1">أخطاء حرجة</p>
          <p className="text-2xl font-black text-red-900">{stats.error}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="md:col-span-3 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input 
              type="text" 
              placeholder="البحث في السجلات (اسم العملية، الرسالة، المعرف)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border-2 border-gray-100 focus:border-blue-500 pr-12 pl-6 py-4 rounded-2xl outline-none font-bold text-sm shadow-sm transition-all focus:shadow-xl focus:shadow-blue-900/5 placeholder:text-gray-300"
            />
         </div>
         <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 flex items-center justify-center gap-3">
            <History className="w-5 h-5 text-blue-600" />
            <div className="text-right">
               <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">النتائج الفلترة</p>
               <p className="text-xl font-black text-gray-900 leading-none">{filteredLogs.length}</p>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">الحدث / المعرف</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">ماذا حدث؟ (شرح مبسط)</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">المستوى</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">التوقيت</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {filteredLogs.map((log) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={log.id} 
                    className="group hover:bg-blue-50/30 transition-all cursor-pointer"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-blue-600 transition-colors border border-transparent group-hover:border-blue-100">
                          {OP_ICONS[log.operationType as keyof typeof OP_ICONS] || <Terminal className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{log.operationType || 'SYSTEM_OP'}</p>
                          <p className="text-[9px] font-bold text-gray-400 font-mono">#{log.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-gray-900 leading-relaxed">
                          {getSimpleExplanation(log)}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 font-mono italic opacity-0 group-hover:opacity-100 transition-opacity">
                          {log.message}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest border ${SEVERITY_COLORS[log.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.INFO}`}>
                        {log.severity || 'INFO'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold tracking-tight">
                          {log.timestamp ? format(log.timestamp.toDate(), 'dd/MM HH:mm:ss', { locale: ar }) : 'الآن'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <button className="p-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-white rounded-lg text-blue-600">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {loading && (
            <div className="p-20 flex flex-col items-center justify-center text-gray-300">
              <div className="animate-spin mb-4">
                <Terminal className="w-10 h-10" />
              </div>
              <p className="font-black text-sm uppercase tracking-widest">جاري تحميل السجلات...</p>
            </div>
          )}

          {!loading && filteredLogs.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center justify-center">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-inner">
                  <Search className="w-8 h-8 text-gray-300" />
               </div>
               <h3 className="text-lg font-black text-gray-900 mb-2 italic">لم يتم العثور على نتائج</h3>
               <p className="text-gray-400 font-medium text-sm">جرب البحث بكلمات مختلفة أو تغيير مستوى التصفية.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
