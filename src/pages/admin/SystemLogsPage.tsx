import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
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
  ChevronRight,
  X,
  SlidersHorizontal,
  RotateCcw,
  Download,
  ChevronDown
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
  'ERROR': <AlertCircle className="w-4 h-4" />,
  'TICKET_STATUS_UPDATE': <SlidersHorizontal className="w-4 h-4" />
};

const OP_ARABIC_NAMES: Record<string, string> = {
  'PAYOUT_CONFIRMATION': 'تأكيد صرف مستحقات المعقبين',
  'AUTH': 'عمليات الدخول والهوية',
  'PAYMENT': 'المدفوعات والرسوم المباشرة',
  'SYSTEM': 'عمليات النظام التلقائية',
  'ERROR': 'الأخطاء والاستثناءات البرمجية',
  'TICKET_STATUS_UPDATE': 'تحديث حالة تذاكر الدعم',
  'national_verification_approved': 'قبول توثيق الهوية الوطنية',
  'national_verification_rejected': 'رفض توثيق الهوية الوطنية',
  'ORDER_CREATED': 'إنشاء طلب جديد',
  'ORDER_UPDATED': 'تحديث تفاصيل الطلب',
  'USER_REGISTERED': 'تسجيل مستخدم جديد',
  'PROFILE_UPDATED': 'تحديث الملف الشخصي',
  'DISPUTE_OPENED': 'فتح نزاع جديد',
  'DISPUTE_RESOLVED': 'حل وإغلاق النزاع',
  'MESSAGE_SENT': 'إرسال رسالة محادثة',
  'REVIEW_SUBMITTED': 'تقديم تقييم للخدمة'
};

export const SystemLogsPage: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [selectedOp, setSelectedOp] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [logLimit, setLogLimit] = useState(300);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    warning: 0,
    error: 0
  });

  useEffect(() => {
    if (!isAdmin) return;

    // Fetch the last 300 logs for a robust client-side filterable history
    const q = query(
      collection(db, 'system_logs'), 
      orderBy('timestamp', 'desc'), 
      limit(logLimit)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
      
      // Calculate stats based on all loaded logs (normalizing to uppercase)
      const s = data.reduce((acc, log: any) => {
        acc.total++;
        const logSev = (log.severity || 'INFO').toUpperCase();
        if (logSev === 'SUCCESS' || logSev === 'INFO') acc.success++;
        if (logSev === 'WARNING') acc.warning++;
        if (logSev === 'ERROR' || logSev === 'CRITICAL') acc.error++;
        return acc;
      }, { total: 0, success: 0, warning: 0, error: 0 });
      
      setStats(s);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_logs');
    });

    return () => unsub();
  }, [isAdmin, logLimit]);

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    
    // Prepare headers
    const headers = ['ID', 'Date', 'Operation', 'Severity', 'User', 'Message', 'Details'];
    
    // Prepare rows
    const rows = filteredLogs.map(log => {
      const date = log.timestamp ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : '';
      const op = OP_ARABIC_NAMES[getLogOperation(log)] || getLogOperation(log);
      const sev = (log.severity || 'INFO').toUpperCase();
      const user = getLogUser(log);
      const msg = (log.message || '').replace(/"/g, '""');
      const details = (log.details || '').replace(/"/g, '""');
      
      return `"${log.id}","${date}","${op}","${sev}","${user}","${msg}","${details}"`;
    });
    
    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Add BOM for Excel UTF-8 support
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `system_logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLogUser = (log: any) => {
    if (log.authInfo?.email) return log.authInfo.email;
    if (log.updatedBy) return log.updatedBy;
    if (log.performedBy) return log.performedBy;
    if (log.authInfo?.userId) return log.authInfo.userId;
    if (log.userId) return log.userId;
    return 'SYSTEM';
  };

  const getLogOperation = (log: any) => {
    return log.operationType || log.action || 'SYSTEM';
  };

  const getSimpleExplanation = (log: any) => {
    const type = getLogOperation(log);
    const msg = log.message || log.details || '';

    if (type === 'PAYOUT_CONFIRMATION') return 'تم استلام وتأكيد تحويل رسوم المنصة عبر بوابة الدفع الإلكتروني بنجاح.';
    if (type === 'AUTH') return 'عملية دخول أو تسجيل في النظام من قبل مستخدم.';
    if (type === 'PAYMENT') return 'معالجة عملية دفع مالي أو طلب تفويض بنكي.';
    if (type === 'ERROR') return 'حدث خطأ تقني في أحد أجزاء النظام، يرجى المراجعة.';
    if (type === 'TICKET_STATUS_UPDATE') return `تغيير حالة تذكرة دعم إلى: ${log.newStatus || 'جديدة'}`;
    if (type === 'national_verification_approved') return `تم توثيق وتأكيد الهوية الوطنية لعميل بنجاح.`;
    if (type === 'national_verification_rejected') return `تم رفض طلب توثيق الهوية الوطنية للعميل لعدم تطابق الشروط.`;
    
    // Heuristic or search matches
    if (msg.includes('دخول')) return 'محاولة ولوج للنظام.';
    if (msg.includes('دفع')) return 'عملية مالية قيد التنفيذ.';
    
    return msg || 'عملية نظام اعتيادية تم تسجيلها.';
  };

  // Dynamically extract unique users and operations present in loaded logs
  const uniqueUsersList = Array.from(
    new Set(logs.map(log => getLogUser(log)).filter(Boolean))
  ) as string[];

  const uniqueOpsList = Array.from(
    new Set(logs.map(log => getLogOperation(log)).filter(Boolean))
  ) as string[];

  // Multi-dimensional Advanced Filter Logical Matcher
  const filteredLogs = logs.filter(log => {
    // 1. Text Search (matches description, operation name, or log ID)
    const normalizedSearch = search.toLowerCase();
    const userEmail = getLogUser(log).toLowerCase();
    const opType = getLogOperation(log).toLowerCase();
    const message = (log.message || '').toLowerCase();
    const details = (log.details || '').toLowerCase();
    const opPath = (log.path || '').toLowerCase();
    const logId = log.id.toLowerCase();

    const matchesSearch = 
      userEmail.includes(normalizedSearch) ||
      opType.includes(normalizedSearch) ||
      message.includes(normalizedSearch) ||
      details.includes(normalizedSearch) ||
      opPath.includes(normalizedSearch) ||
      logId.includes(normalizedSearch);

    // 2. User Filter Matcher
    const matchesUser = selectedUser === 'ALL' || getLogUser(log) === selectedUser;

    // 3. Operation Filter Matcher
    const matchesOp = selectedOp === 'ALL' || getLogOperation(log) === selectedOp;

    // 4. Severity Filter Matcher (normalizes lowercase / uppercase logging)
    const logSev = (log.severity || 'INFO').toUpperCase();
    const matchesSeverity = 
      filterSeverity === 'ALL' || 
      logSev === filterSeverity || 
      (filterSeverity === 'ERROR' && logSev === 'CRITICAL');

    return matchesSearch && matchesUser && matchesOp && matchesSeverity;
  });

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
           
           <button
             onClick={exportToCSV}
             disabled={filteredLogs.length === 0}
             className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Download className="w-4 h-4" />
             <span className="hidden sm:inline">تصدير CSV</span>
           </button>
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
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">إجمالي العمليات المسترجعة</p>
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
          <p className="text-orange-600/60 font-bold text-[10px] uppercase tracking-widest mb-1">تنبيهات ومحاذير</p>
          <p className="text-2xl font-black text-orange-900">{stats.warning}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm group hover:border-red-500 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-red-600/60 font-bold text-[10px] uppercase tracking-widest mb-1">أخطاء حرجة جداً</p>
          <p className="text-2xl font-black text-red-900">{stats.error}</p>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-black text-gray-900">أدوات الفلترة والتحليل المتقدمة للمدير</h3>
          </div>
          {(selectedUser !== 'ALL' || selectedOp !== 'ALL' || filterSeverity !== 'ALL' || search !== '') && (
            <button
              onClick={() => {
                setSelectedUser('ALL');
                setSelectedOp('ALL');
                setFilterSeverity('ALL');
                setSearch('');
              }}
              className="text-[10px] font-black text-red-500 hover:text-red-700 transition-colors flex items-center gap-1.5 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg active:scale-95 duration-150"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة تعيين كافة الفلاتر</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Searching Text Input */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 block mr-1">البحث بالكلمة المفتاحية</label>
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input 
                type="text" 
                placeholder="اسم العملية، الرسالة، المعرف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-100 focus:border-blue-500 focus:bg-white pr-10 pl-4 py-3 rounded-xl outline-none font-bold text-xs transition-all placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* User Filter Dropdown */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 block mr-1">تصفية حسب المستخدم</label>
            <div className="relative">
              <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-100 focus:border-blue-500 focus:bg-white pr-10 pl-4 py-3 rounded-xl outline-none font-bold text-xs transition-all text-gray-700 appearance-none cursor-pointer"
              >
                <option value="ALL">جميع المنفذين ({uniqueUsersList.length})</option>
                {uniqueUsersList.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Operation Type Dropdown */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 block mr-1">تصفية حسب نوع العملية</label>
            <div className="relative">
              <Activity className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <select
                value={selectedOp}
                onChange={(e) => setSelectedOp(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-100 focus:border-blue-500 focus:bg-white pr-10 pl-4 py-3 rounded-xl outline-none font-bold text-xs transition-all text-gray-700 appearance-none cursor-pointer"
              >
                <option value="ALL">جميع العمليات ({uniqueOpsList.length})</option>
                {uniqueOpsList.map(op => (
                  <option key={op} value={op}>
                    {OP_ARABIC_NAMES[op] || op}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Severity Level Dropdown */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 block mr-1">مستوى خطورة السجل</label>
            <div className="relative">
              <AlertCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-100 focus:border-blue-500 focus:bg-white pr-10 pl-4 py-3 rounded-xl outline-none font-bold text-xs transition-all text-gray-700 appearance-none cursor-pointer"
              >
                <option value="ALL">كل المستويات التنبيهية</option>
                <option value="INFO">معلومات (INFO)</option>
                <option value="SUCCESS">عمليات ناجحة (SUCCESS)</option>
                <option value="WARNING">تنبيهات نظام (WARNING)</option>
                <option value="ERROR">أخطاء برمجية وحرجة (ERROR)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selected Constraints Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-50">
          <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-500">
            <span>الفلاتر النشطة حالياً:</span>
            {search && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg text-[10px]">نص البحث: "{search}"</span>}
            {selectedUser !== 'ALL' && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-[10px]">المستخدم: {selectedUser}</span>}
            {selectedOp !== 'ALL' && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-lg text-[10px]">العملية: {OP_ARABIC_NAMES[selectedOp] || selectedOp}</span>}
            {filterSeverity !== 'ALL' && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg text-[10px]">المستوى: {filterSeverity}</span>}
            {search === '' && selectedUser === 'ALL' && selectedOp === 'ALL' && filterSeverity === 'ALL' && (
              <span className="text-gray-300 font-normal">عرض كافة السجلات بدون قيود</span>
            )}
          </div>
          <div className="text-xs font-black text-gray-700 flex items-center gap-1.5">
            <History className="w-4 h-4 text-blue-600" />
            <span>مطابقة العثور: <span className="text-blue-600 text-sm font-black">{filteredLogs.length}</span> من أصل <span className="text-gray-400">{logs.length}</span> حدث</span>
          </div>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-1/4">الحدث / المعرف / المستخدم</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-1/2">ماذا حدث؟ (شرح مبسط)</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center w-12">المستوى</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-36">التوقيت</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-12">فحص</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {filteredLogs.map((log) => {
                  const logSevUpper = (log.severity || 'INFO').toUpperCase();
                  const logUser = getLogUser(log);
                  const isSystemUser = logUser === 'SYSTEM';

                  return (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="group hover:bg-blue-50/30 transition-all cursor-pointer"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-blue-600 transition-colors border border-transparent group-hover:border-blue-100 shrink-0">
                            {OP_ICONS[getLogOperation(log) as keyof typeof OP_ICONS] || <Terminal className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight truncate">
                              {OP_ARABIC_NAMES[getLogOperation(log)] || getLogOperation(log)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-bold text-gray-400 font-mono">#{log.id.slice(0, 8)}</span>
                              <span className="text-gray-300 text-[9px]">•</span>
                              <span className={`text-[9px] font-black truncate max-w-[120px] ${isSystemUser ? 'text-gray-400' : 'text-blue-600 font-mono'}`}>
                                {logUser}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-gray-900 leading-relaxed md:line-clamp-2">
                            {getSimpleExplanation(log)}
                          </p>
                          {(log.message || log.details) && (
                            <p className="text-[9px] font-mono text-gray-400 italic font-medium truncate max-w-lg">
                              {log.message || log.details}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-widest border block text-center ${SEVERITY_COLORS[logSevUpper as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.INFO}`}>
                          {logSevUpper}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold tracking-tight">
                            {log.timestamp ? format(log.timestamp.toDate(), 'dd MMMM - HH:mm:ss', { locale: ar }) : 'الآن'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-white rounded-lg text-blue-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
          
          {loading && (
            <div className="p-20 flex flex-col items-center justify-center text-gray-300">
              <div className="animate-spin mb-4">
                <Terminal className="w-10 h-10" />
              </div>
              <p className="font-black text-sm uppercase tracking-widest">جاري تحميل السجلات من قاعدة البيانات...</p>
            </div>
          )}

          {!loading && filteredLogs.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center justify-center">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-inner">
                  <Search className="w-8 h-8 text-gray-300" />
               </div>
               <h3 className="text-lg font-black text-gray-900 mb-2 italic">لم يتم العثور على سجلات تلتزم بالفلترة</h3>
               <p className="text-gray-400 font-medium text-sm">جرب إعادة ضبط الفلاتر أو استخدام كلمة بحث أخرى.</p>
            </div>
          )}

          {!loading && logs.length >= logLimit && (
            <div className="p-6 text-center border-t border-gray-50 bg-gray-50/30">
              <button
                onClick={() => setLogLimit(prev => prev + 300)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold text-xs rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
              >
                <span>تحميل أقدم المستندات ({logLimit} أخرى)</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal for detailed log analysis */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] border border-gray-100 max-w-2xl w-full p-6 md:p-8 shadow-2xl relative space-y-6 text-right"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl border ${SEVERITY_COLORS[(selectedLog.severity || 'INFO').toUpperCase() as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.INFO}`}>
                    {OP_ICONS[getLogOperation(selectedLog) as keyof typeof OP_ICONS] || <Terminal className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 leading-tight">تفاصيل حدث النظام المعمق</h3>
                    <p className="text-[10px] font-mono text-gray-400">ID: {selectedLog.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                    <p className="text-[10px] font-black text-gray-400 mb-1">توقيت الحدث</p>
                    <p className="text-xs font-bold text-gray-900">
                      {selectedLog.timestamp ? format(selectedLog.timestamp.toDate(), 'yyyy/MM/dd HH:mm:ss', { locale: ar }) : 'الآن'}
                    </p>
                  </div>
                  <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                    <p className="text-[10px] font-black text-gray-400 mb-1">مستوى الخطورة</p>
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest border ${SEVERITY_COLORS[(selectedLog.severity || 'INFO').toUpperCase() as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.INFO}`}>
                      {(selectedLog.severity || 'INFO').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                  <p className="text-[10px] font-black text-gray-400 mb-1">نوع العملية / الإجراء</p>
                  <p className="text-xs font-black text-gray-900">
                    {getLogOperation(selectedLog)} - {OP_ARABIC_NAMES[getLogOperation(selectedLog)] || 'إجراء نظام داخلي'}
                  </p>
                </div>

                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                  <p className="text-[10px] font-black text-gray-400 mb-1">رسالة النظام الأساسية</p>
                  <p className="text-xs font-bold text-gray-800 leading-relaxed break-words">
                    {getSimpleExplanation(selectedLog)}
                  </p>
                </div>

                {/* User / Initiator details */}
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50 space-y-2">
                  <p className="text-[10px] font-black text-gray-400">منفذ العملية (المستخدم)</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-mono font-black text-blue-600">
                      {getLogUser(selectedLog)}
                    </span>
                  </div>
                  {selectedLog.authInfo?.userId && (
                    <p className="text-[9px] font-mono text-gray-400 mr-6">UID: {selectedLog.authInfo.userId}</p>
                  )}
                </div>

                {/* Additional URL or Path */}
                {(selectedLog.path || selectedLog.url) && (
                  <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                    <p className="text-[10px] font-black text-gray-400 mb-1">مسار الكود أو الرابط المستهدف</p>
                    <p className="text-xs font-mono text-gray-500 break-all">{selectedLog.path || selectedLog.url}</p>
                  </div>
                )}

                {/* User agent / device */}
                {selectedLog.userAgent && (
                  <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                    <p className="text-[10px] font-black text-gray-400 mb-1">بيانات المتصفح والنظام (User Agent)</p>
                    <p className="text-[10px] font-mono text-gray-500 leading-normal">{selectedLog.userAgent}</p>
                  </div>
                )}

                {/* Raw JSON block */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-gray-400">البيانات التقنية الكاملة (Raw JSON)</p>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-xl font-mono text-[10px] overflow-x-auto max-h-48 text-left dir-ltr">
                    <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
                  </div>
                </div>
              </div>

              {/* Footer overlay */}
              <div className="flex justify-end gap-2 border-t border-gray-50 pt-4">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-black text-xs transition-all text-center"
                >
                  إغلاق النافذة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
