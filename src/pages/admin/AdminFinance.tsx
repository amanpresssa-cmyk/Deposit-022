import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Wallet, Activity, TrendingUp, ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const AdminFinance: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    volume: 0,
    fees: 0
  });

  useEffect(() => {
    const txQ = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTx = onSnapshot(txQ, (snapshot) => {
      const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(txs);
      
      const v = txs.reduce((acc, tx: any) => acc + (Number(tx.amount) || 0), 0);
      const f = txs.reduce((acc, tx: any) => acc + (Number(tx.fee) || 0), 0);
      setStats({ volume: v, fees: f });
    });
    return () => unsubTx();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
               <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest mb-1">إجمالي التداولات</p>
            <p className="text-xl font-black text-gray-900">{stats.volume.toLocaleString()} ر.س</p>
         </div>
         <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
               <Wallet className="w-5 h-5" />
            </div>
            <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest mb-1">أرباح المنصة</p>
            <p className="text-xl font-black text-gray-900">{stats.fees.toLocaleString()} ر.س</p>
         </div>
         <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="p-2 bg-gray-50 rounded-lg mb-2">
               <Activity className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-[9px] font-black text-gray-400 uppercase">المعدل الشهري</p>
            <p className="text-sm font-black text-gray-900">قيد التحليل</p>
         </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-xs">
        <div className="p-4 border-b border-gray-50 flex justify-between items-center sm:flex-row flex-col gap-3">
           <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-black">سجل العمليات</h2>
           </div>
           <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input 
                type="text" 
                placeholder="رقم الطلب..." 
                className="bg-gray-50 border border-transparent focus:border-blue-500 pr-9 pl-4 py-1.5 rounded-lg outline-none font-medium text-[11px] w-full sm:w-56 transition-all"
              />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-[9px] font-bold uppercase tracking-widest border-b">
                <th className="px-6 py-4">المستخدم / الطلب</th>
                <th className="px-6 py-4">المبلغ</th>
                <th className="px-6 py-4">العمولة</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-bold text-gray-900 truncate max-w-[150px]">{tx.userEmail || 'نظام'}</p>
                    <p className="text-[9px] text-gray-400 font-bold font-mono tracking-tighter">#{tx.orderId?.slice(0, 8)}</p>
                  </td>
                  <td className="px-6 py-3 font-bold text-gray-900">{tx.amount} ر.س</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1 text-green-600 font-bold">
                       <ArrowUpRight className="w-3 h-3" />
                       {(tx.fee || 0).toFixed(2)} ر.س
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                      tx.status === 'escrowed' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {tx.status === 'escrowed' ? 'محجوز' : 'مكتمل'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-400 font-medium text-[10px]">
                    {format(tx.createdAt?.toDate?.() || new Date(), 'dd MMM, HH:mm', { locale: ar })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
