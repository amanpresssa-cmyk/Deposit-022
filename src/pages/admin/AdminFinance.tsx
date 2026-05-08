import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { 
  Wallet, Activity, TrendingUp, ArrowUpRight, 
  Search, Download, Calendar, ExternalLink, FileText, Clock, ShieldCheck
} from 'lucide-react';
import { 
  format, subDays, startOfDay, endOfDay, 
  startOfMonth, startOfYear, isWithinInterval
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export const AdminFinance: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [transactions, setTransactions] = useState<any[]>([]);
  const [feeTransfers, setFeeTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [timePreset, setTimePreset] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');

  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    const txQ = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTx = onSnapshot(txQ, (snapshot) => {
      const txs = snapshot.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          date: data.createdAt?.toDate() || new Date()
        };
      });
      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
      setLoading(false);
    });

    const payoutQ = query(collection(db, 'fee_transfers'), orderBy('createdAt', 'desc'));
    const unsubPayout = onSnapshot(payoutQ, (snapshot) => {
      const payouts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFeeTransfers(payouts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'fee_transfers');
    });

    return () => {
      unsubTx();
      unsubPayout();
    };
  }, [isAdmin]);

  // Apply Filters
  const filteredTx = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = tx.date;
      const fromDate = startOfDay(new Date(dateRange.from));
      const toDate = endOfDay(new Date(dateRange.to));
      
      const isInRange = isWithinInterval(txDate, { start: fromDate, end: toDate });
      const matchesSearch = 
        tx.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.orderId?.toLowerCase().includes(searchQuery.toLowerCase());
        
      return isInRange && matchesSearch;
    });
  }, [transactions, dateRange, searchQuery]);

  const stats = useMemo(() => {
    const volume = filteredTx.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
    const fees = filteredTx.reduce((acc, tx) => acc + (Number(tx.fee) || 0), 0);
    const count = filteredTx.length;
    return { volume, fees, count };
  }, [filteredTx]);

  const handlePresetChange = (preset: typeof timePreset) => {
    setTimePreset(preset);
    const now = new Date();
    let from = now;
    
    if (preset === 'daily') from = startOfDay(now);
    else if (preset === 'weekly') from = subDays(now, 7);
    else if (preset === 'monthly') from = startOfMonth(now);
    else if (preset === 'yearly') from = startOfYear(now);
    else return;

    setDateRange({
      from: format(from, 'yyyy-MM-dd'),
      to: format(now, 'yyyy-MM-dd')
    });
  };

  const downloadReport = () => {
    const headers = ['تاريخ', 'الطلب', 'البريد', 'المبلغ', 'العمولة', 'الحالة'];
    const rows = filteredTx.map(tx => [
      format(tx.date, 'yyyy-MM-dd HH:mm'),
      tx.orderId,
      tx.userEmail,
      tx.amount,
      tx.fee,
      tx.status === 'escrowed' ? 'محجوز' : 'مكتمل'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finance_report_${dateRange.from}_to_${dateRange.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="bg-gray-950 text-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] -mr-[300px] -mt-[300px]" />
         <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="text-right">
               <div className="flex items-center gap-3 mb-4 justify-end">
                  <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter">إدارة <span className="text-blue-400">المالية</span></h1>
               </div>
               <p className="text-gray-400 font-bold max-w-xl text-xs md:text-sm leading-relaxed">
                  تحليل كامل للتدفقات النقدية، تتبع العمولات، وإصدار التقارير المالية التفصيلية لضمان شفافية النظام.
               </p>
            </div>
            <button 
              onClick={downloadReport}
              className="flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-2xl font-black text-sm hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-black/20 shrink-0 group"
            >
               <span>تحميل تقرير CSV</span>
               <Download className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              { label: 'إجمالي التداولات', value: stats.volume, icon: <TrendingUp />, color: 'blue', desc: 'في النطاق المحدد' },
              { label: 'أرباح العمولات', value: stats.fees, icon: <Wallet />, color: 'green', desc: 'صافي الربح المستحق' },
              { label: 'عدد العمليات', value: stats.count, icon: <Activity />, color: 'indigo', desc: 'إجمالي الحركات' }
            ].map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
                       {s.icon}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">{s.label}</p>
                 </div>
                 <p className="text-3xl font-black italic">{Number(s.value).toLocaleString()} <span className="text-xs text-gray-500">{i !== 2 ? 'ر.س' : 'عملية'}</span></p>
                 <p className="text-[9px] font-bold text-gray-500 mt-2 uppercase tracking-tight">{s.desc}</p>
              </div>
            ))}
         </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm sticky top-4 z-20 backdrop-blur-md bg-white/90">
         <div className="flex flex-col lg:flex-row items-center gap-6">
            {/* Search */}
            <div className="relative flex-1 w-full">
               <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="بحث برقم الطلب أو البريد الإلكتروني..."
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full bg-gray-50 border border-gray-100 rounded-2xl pr-12 pl-4 py-4 text-sm font-bold focus:bg-white outline-none transition-all"
               />
            </div>

            {/* Presets */}
            <div className="flex bg-gray-50 p-1 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
               {[
                 { id: 'daily', label: 'يومي' },
                 { id: 'weekly', label: 'أسبوعي' },
                 { id: 'monthly', label: 'شهري' },
                 { id: 'yearly', label: 'سنوي' },
                 { id: 'custom', label: 'مخصص' }
               ].map(p => (
                 <button
                   key={p.id}
                   onClick={() => handlePresetChange(p.id as any)}
                   className={`flex-1 min-w-[60px] px-4 py-2 text-[10px] font-black rounded-xl transition-all ${
                     timePreset === p.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                   }`}
                 >
                   {p.label}
                 </button>
               ))}
            </div>

            {/* Custom Range */}
            {timePreset === 'custom' && (
              <div className="flex items-center gap-3 w-full lg:w-auto">
                 <div className="relative flex-1">
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="date" 
                      value={dateRange.from}
                      onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pr-10 pl-3 py-2 text-[10px] font-black outline-none"
                    />
                 </div>
                 <span className="text-gray-300 font-black text-xs">إلى</span>
                 <div className="relative flex-1">
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="date" 
                      value={dateRange.to}
                      onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pr-10 pl-3 py-2 text-[10px] font-black outline-none"
                    />
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                  <FileText className="w-5 h-5 text-blue-600" />
               </div>
               <div className="text-right">
                  <h2 className="text-lg font-black text-gray-900">سجل التداولات التفصيلي</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">جميع الحركات المالية ضمن النطاق المختار</p>
               </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black">
               <Clock className="w-3 h-3" />
               تحديث لحظي مفعل
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[900px]">
               <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] border-b">
                     <th className="px-8 py-6">التوقيت الدقيق</th>
                     <th className="px-8 py-6">المستخدم</th>
                     <th className="px-8 py-6">رقم الطلب</th>
                     <th className="px-8 py-6">المبلغ الإجمالي</th>
                     <th className="px-8 py-6">عمولة المنصة</th>
                     <th className="px-8 py-6">الحالة</th>
                     <th className="px-8 py-6">تفاصيل</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="animate-pulse">
                         <td colSpan={7} className="px-8 py-6"><div className="h-4 bg-gray-100 rounded-lg w-full" /></td>
                      </tr>
                    ))
                  ) : filteredTx.length === 0 ? (
                    <tr>
                       <td colSpan={7} className="px-8 py-20 text-center">
                          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                             <Search className="w-10 h-10 text-gray-200" />
                          </div>
                          <p className="text-gray-400 font-bold italic">لا توجد عمليات تطابق معايير البحث الحالية</p>
                       </td>
                    </tr>
                  ) : (
                    filteredTx.map(tx => (
                       <tr key={tx.id} className="hover:bg-gray-50/80 transition-all duration-300 group">
                          <td className="px-8 py-6">
                             <p className="font-black text-gray-900 text-xs">{format(tx.date, 'yyyy/MM/dd')}</p>
                             <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase italic">{format(tx.date, 'HH:mm:ss')}</p>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[10px]">
                                   {tx.userEmail?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                   <p className="font-black text-gray-900 text-xs">{tx.userEmail?.split('@')[0]}</p>
                                   <p className="text-[9px] font-bold text-gray-400 italic">{tx.userEmail}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="px-3 py-1 bg-gray-100 rounded-lg text-[9px] font-mono font-black text-gray-500 tracking-tighter uppercase inline-block">
                                #{tx.orderId?.slice(0, 8)}
                             </div>
                          </td>
                          <td className="px-8 py-6 font-black text-gray-900 text-sm">
                             {Number(tx.amount).toLocaleString()} <span className="text-[10px] text-gray-400">ر.س</span>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-2 text-green-600 font-black text-xs italic">
                                <ArrowUpRight className="w-3 h-3" />
                                {Number(tx.fee || 0).toLocaleString()} <span className="text-[9px] opacity-60">ر.س</span>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                tx.status === 'escrowed' 
                                ? 'bg-orange-50 text-orange-600 border border-orange-100/50' 
                                : 'bg-green-50 text-green-600 border border-green-100/50'
                             }`}>
                                {tx.status === 'escrowed' ? 'محجوز (Escrow)' : 'مكتمل (Settled)'}
                             </span>
                          </td>
                          <td className="px-8 py-6">
                             <Link 
                               to={`/admin/orders?search=${tx.orderId}`}
                               className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm group-hover:scale-110"
                             >
                                <ExternalLink className="w-4 h-4" />
                             </Link>
                          </td>
                       </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>

         <div className="p-8 bg-gray-50/30 border-t border-gray-50 flex justify-between items-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">عرض {filteredTx.length} من أصل {transactions.length} عملية</p>
            <div className="flex gap-2">
               <button className="px-6 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-400 hover:text-gray-900 transition-all cursor-not-allowed">السابق</button>
               <button className="px-6 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-400 hover:text-gray-900 transition-all cursor-not-allowed">التالي</button>
            </div>
         </div>
      </div>

      {/* Geidea Payouts Section (Secondary Info) */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
         <div className="p-6 border-b border-gray-50 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-black">إشعارات تحويل جيديا (Payout History)</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
               <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b">
                     <th className="px-8 py-4">رقم التحويل</th>
                     <th className="px-8 py-4">المبلغ المودع</th>
                     <th className="px-8 py-4">الحالة</th>
                     <th className="px-8 py-4">التاريخ</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {feeTransfers.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-10 text-center text-gray-300 italic font-bold">لا توجد بيانات تحويل مسجلة حالياً</td></tr>
                  ) : (
                    feeTransfers.map(payout => (
                       <tr key={payout.id}>
                          <td className="px-8 py-4 font-mono font-black text-[9px] text-gray-500">{payout.transferId}</td>
                          <td className="px-8 py-4 font-black">+{payout.amount} ر.س</td>
                          <td className="px-8 py-4"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">Confirmed</span></td>
                          <td className="px-8 py-4 text-gray-400 font-bold">{payout.receivedAt ? format(new Date(payout.receivedAt), 'dd/MM/yyyy HH:mm', { locale: ar }) : '---'}</td>
                       </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
