import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Wallet, Activity, TrendingUp, ArrowDownLeft, ArrowUpRight, Search, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const AdminFinance: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [feeTransfers, setFeeTransfers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    volume: 0,
    fees: 0,
    confirmedFees: 0
  });

  useEffect(() => {
    // Listen to escrow transactions
    const txQ = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTx = onSnapshot(txQ, (snapshot) => {
      const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(txs);
      
      const v = txs.reduce((acc, tx: any) => acc + (Number(tx.amount) || 0), 0);
      const f = txs.reduce((acc, tx: any) => acc + (Number(tx.fee) || 0), 0);
      
      setStats(prev => ({ ...prev, volume: v, fees: f }));
    });

    // Listen to confirmed fee transfers from Geidea
    const payoutQ = query(collection(db, 'fee_transfers'), orderBy('createdAt', 'desc'));
    const unsubPayout = onSnapshot(payoutQ, (snapshot) => {
      const payouts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFeeTransfers(payouts);
      
      const confirmed = payouts.reduce((acc, p: any) => acc + (Number(p.amount) || 0), 0);
      setStats(prev => ({ ...prev, confirmedFees: confirmed }));
    });

    return () => {
      unsubTx();
      unsubPayout();
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest mb-1">أرباح المنصة (الكلية)</p>
            <p className="text-xl font-black text-gray-900">{stats.fees.toLocaleString()} ر.س</p>
         </div>
         <div className="bg-white p-4 rounded-2xl border border-blue-100 bg-blue-50/20 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
               <Activity className="w-5 h-5" />
            </div>
            <p className="text-blue-600 font-bold text-[9px] uppercase tracking-widest mb-1">أرباح تم استلامها من جيديا</p>
            <p className="text-xl font-black text-blue-900">{stats.confirmedFees.toLocaleString()} ر.س</p>
            <div className="mt-2 flex items-center gap-1 text-[8px] font-bold text-blue-400 uppercase">
               <ShieldCheck className="w-3 h-3" /> تم التأكيد عبر Geidea Webhook
            </div>
         </div>
         <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="p-2 bg-gray-50 rounded-lg mb-2">
               <Activity className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-[9px] font-black text-gray-400 uppercase">النمو المالي</p>
            <p className="text-sm font-black text-gray-900">تحت المراجعة</p>
         </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-xs">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-black">سجل العمليات (Escrow)</h2>
             </div>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[9px] font-bold uppercase tracking-widest border-b sticky top-0 bg-white">
                  <th className="px-6 py-4">المستخدم / الطلب</th>
                  <th className="px-6 py-4">المبلغ</th>
                  <th className="px-6 py-4">العمولة</th>
                  <th className="px-6 py-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-bold text-gray-900 truncate max-w-[150px]">{tx.userEmail || 'نظام'}</p>
                      <p className="text-[9px] text-gray-400 font-bold font-mono tracking-tighter">#{tx.orderId?.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-3 font-bold text-gray-900 text-xs">{tx.amount} ر.س</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-xs">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-blue-50/10">
             <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-black text-blue-900">تأكيدات تحويل جيديا (Geidea Payouts)</h2>
             </div>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[9px] font-bold uppercase tracking-widest border-b sticky top-0 bg-white">
                  <th className="px-6 py-4">رقم التحويل</th>
                  <th className="px-6 py-4">المبلغ المودع</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {feeTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-300 italic font-medium">بانتظار وصول إشعارات ويب-هوك من جيديا...</td>
                  </tr>
                ) : (
                  feeTransfers.map(payout => (
                    <tr key={payout.id} className="hover:bg-blue-50/30 transition-colors animate-in slide-in-from-right-4 duration-300">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-700 font-mono tracking-tighter text-[10px] uppercase">{payout.transferId}</p>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">REF: {payout.geideaReference}</p>
                      </td>
                      <td className="px-6 py-4 font-black text-blue-600 text-sm">+{payout.amount} ر.س</td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 italic">Confirmed</span>
                      </td>
                      <td className="px-6 py-3 text-gray-400 font-medium text-[9px]">
                        {payout.receivedAt ? format(new Date(payout.receivedAt), 'dd MMM, HH:mm', { locale: ar }) : 'غير محدد'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
