import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TrendingUp, Wallet, ShieldCheck, Clock, Activity, ArrowUpRight, Users as UsersIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState({
    totalVolume: 0,
    totalFees: 0,
    activeEscrows: 0,
    pendingVerifications: 0,
    totalUsers: 0
  });

  useEffect(() => {
    // Tx Stats
    const txQ = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTx = onSnapshot(txQ, (snapshot) => {
      const txs = snapshot.docs.map(d => d.data());
      const volume = txs.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
      const fees = txs.reduce((acc, tx) => acc + (Number(tx.fee) || 0), 0);
      const active = txs.filter(tx => tx.status === 'escrowed').length;
      setStats(prev => ({ ...prev, totalVolume: volume, totalFees: fees, activeEscrows: active }));
    });

    // User Stats
    const userQ = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(userQ, (snapshot) => {
      const all = snapshot.docs.map(d => d.data());
      setStats(prev => ({ 
        ...prev, 
        totalUsers: all.length,
        pendingVerifications: all.filter(u => u.verificationStatus === 'pending').length 
      }));
    });

    return () => {
      unsubTx();
      unsubUsers();
    };
  }, []);

  const cards = [
    { label: 'إجمالي التداولات', value: `${stats.totalVolume.toLocaleString()} ر.س`, icon: <TrendingUp />, trend: '+12%', color: 'blue' },
    { label: 'أرباح المنصة', value: `${stats.totalFees.toLocaleString()} ر.س`, icon: <Wallet />, trend: '+5%', color: 'green' },
    { label: 'توثيق قيد الانتظار', value: stats.pendingVerifications, icon: <ShieldCheck />, trend: 'تنبيه', color: 'orange' },
    { label: 'عمليات نشطة', value: stats.activeEscrows, icon: <Clock />, trend: 'مباشر', color: 'indigo' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-xl font-black text-gray-900">مركز الإدارة</h1>
           <p className="text-gray-400 font-medium font-mono text-[10px]">آخر تحديث: {format(new Date(), 'HH:mm:ss')}</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-100 flex items-center gap-2 shadow-sm font-black text-[10px] text-gray-500">
              <UsersIcon className="w-3.5 h-3.5 text-blue-500" />
              {stats.totalUsers} مستخدم مسجل
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((s, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-sm relative overflow-hidden group">
             <div className={`absolute top-0 right-0 w-24 h-24 bg-${s.color}-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-125 duration-700`} />
             <div className="relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gray-50 text-gray-600 shadow-inner`}>
                   {React.cloneElement(s.icon as React.ReactElement, { className: 'w-5 h-5' })}
                </div>
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-gray-400 font-bold text-[9px] uppercase mb-1 tracking-widest">{s.label}</p>
                      <p className="text-xl font-black text-gray-900">{s.value}</p>
                   </div>
                   <div className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${s.color === 'orange' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                      {s.trend}
                   </div>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
         <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm min-h-[300px] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 text-gray-300">
               <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black mb-1">مخطط النمو</h3>
            <p className="text-xs text-gray-400 font-medium">سيتم عرض الرسوم البيانية هنا قريباً.</p>
         </div>

         <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black mb-4">تنبيهات النظام</h3>
            <div className="space-y-2">
               {[1, 2, 3].map(i => (
                 <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100/50">
                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-orange-500">
                       <Clock className="w-4 h-4" />
                    </div>
                    <div>
                       <p className="text-[11px] font-bold text-gray-800 leading-tight">تحديث أمني ناجح للوحة الإدارة</p>
                       <p className="text-[9px] text-gray-400 font-bold">منذ {i * 15} دقيقة</p>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};
