import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { 
  ArrowUpRight, Search, Download, Calendar, 
  FileText, Clock, Filter, Layers
} from 'lucide-react';
import { 
  format, subDays, startOfDay, endOfDay, 
  startOfMonth, startOfYear, isWithinInterval
} from 'date-fns';
import { ar } from 'date-fns/locale';

export const AdminTransactions: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

    return () => unsubTx();
  }, [isAdmin]);

  const filteredTx = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = tx.date;
      const fromDate = startOfDay(new Date(dateRange.from));
      const toDate = endOfDay(new Date(dateRange.to));
      
      const isInRange = isWithinInterval(txDate, { start: fromDate, end: toDate });
      const matchesSearch = 
        tx.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
        
      return isInRange && matchesSearch && matchesStatus;
    });
  }, [transactions, dateRange, searchQuery, statusFilter]);

  const totalTraded = useMemo(() => {
    return filteredTx.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
  }, [filteredTx]);

  const downloadReport = () => {
    const headers = ['المعرف', 'تاريخ', 'الطلب', 'المستخدم', 'المبلغ', 'الحالة'];
    const rows = filteredTx.map(tx => [
      tx.id,
      format(tx.date, 'yyyy-MM-dd HH:mm:ss'),
      tx.orderId,
      tx.userEmail,
      tx.amount,
      tx.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trading_volume_report_${dateRange.from}_to_${dateRange.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
         <div className="text-right">
            <h1 className="text-3xl font-black text-gray-900 italic tracking-tight mb-2">سجل <span className="text-blue-600">التداولات</span> الشامل</h1>
            <p className="text-gray-500 font-bold text-sm">متابعة دقيقة لكافة المبالغ المالية المتداولة منذ تأسيس المنصة.</p>
         </div>
         <div className="flex gap-3">
            <button 
              onClick={downloadReport}
              className="px-6 py-3 bg-gray-950 text-white rounded-2xl font-black text-xs hover:bg-blue-600 transition-all shadow-xl shadow-gray-200 flex items-center gap-2"
            >
               <Download className="w-4 h-4" />
               تصدير تقرير CSV
            </button>
         </div>
      </div>

      {/* Summary Card */}
      <div className="bg-blue-600 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-blue-100">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
         <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-70 italic">إجمالي التداولات في الفترة المحددة</p>
            <div className="flex items-baseline gap-4">
               <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter tabular-nums">{totalTraded.toLocaleString()}</h2>
               <span className="text-2xl font-black opacity-60">ر.س</span>
            </div>
            <div className="mt-8 flex items-center gap-4 text-xs font-bold bg-white/10 w-fit px-4 py-2 rounded-xl backdrop-blur-md border border-white/10">
               <Layers className="w-4 h-4" />
               <span>{filteredTx.length} عملية مكتملة ومحجوزة</span>
            </div>
         </div>
      </div>

      {/* Advance Filtering */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
         <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
               <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="بحث برقم الطلب، البريد، أو معرف العملية..."
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full bg-gray-50 border border-gray-100 rounded-2xl pr-12 pl-4 py-4 text-sm font-bold focus:bg-white outline-none transition-all"
               />
            </div>
            
            <div className="flex items-center gap-3 w-full lg:w-auto">
               <div className="relative flex-1">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input 
                    type="date" 
                    value={dateRange.from}
                    onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pr-10 pl-3 py-3 text-[10px] font-black outline-none"
                  />
               </div>
               <span className="text-gray-300 font-black text-xs">إلى</span>
               <div className="relative flex-1">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input 
                    type="date" 
                    value={dateRange.to}
                    onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pr-10 pl-3 py-3 text-[10px] font-black outline-none"
                  />
               </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl w-full lg:w-auto">
               {['all', 'escrowed', 'completed'].map(s => (
                 <button
                   key={s}
                   onClick={() => setStatusFilter(s)}
                   className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black transition-all ${
                     statusFilter === s ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                   }`}
                 >
                   {s === 'all' ? 'الكل' : s === 'escrowed' ? 'محجوز' : 'مكتمل'}
                 </button>
               ))}
            </div>
         </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
               <thead>
                  <tr className="bg-gray-50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b">
                     <th className="px-8 py-6">التاريخ والوقت</th>
                     <th className="px-8 py-6">رقم الطلب</th>
                     <th className="px-8 py-6">المستخدم</th>
                     <th className="px-8 py-6">المبلغ</th>
                     <th className="px-8 py-6">الحالة</th>
                     <th className="px-8 py-6">المعرف الفريد</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="animate-pulse">
                         <td colSpan={6} className="px-8 py-6"><div className="h-4 bg-gray-100 rounded-lg w-full" /></td>
                      </tr>
                    ))
                  ) : filteredTx.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="px-8 py-20 text-center text-gray-300 font-bold italic">لا توجد عمليات تطابق البحث</td>
                    </tr>
                  ) : (
                    filteredTx.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                         <td className="px-8 py-6">
                            <p className="font-black text-gray-900 text-xs">{format(tx.date, 'yyyy/MM/dd HH:mm:ss')}</p>
                         </td>
                         <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-mono font-black text-gray-500 uppercase">
                               #{tx.orderId?.slice(0, 10)}
                            </span>
                         </td>
                         <td className="px-8 py-6">
                            <p className="font-black text-gray-900 text-xs">{tx.userEmail}</p>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex items-center gap-1.5 font-black text-sm text-gray-900 italic">
                               <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                               {Number(tx.amount).toLocaleString()}
                               <span className="text-[10px] text-gray-400">ر.س</span>
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                               tx.status === 'escrowed' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                            }`}>
                               {tx.status === 'escrowed' ? 'محجوز' : 'مكتمل'}
                            </span>
                         </td>
                         <td className="px-8 py-6">
                            <p className="text-[9px] font-mono text-gray-300 group-hover:text-gray-500 transition-colors">{tx.id}</p>
                         </td>
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
