import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AlertCircle, Scale, Clock, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const AdminDisputes: React.FC = () => {
  const [disputes, setDisputes] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'disputes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setDisputes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-orange-50 border border-orange-100 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="flex gap-4">
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
               <Scale className="w-8 h-8" />
            </div>
            <div>
               <h2 className="text-2xl font-black text-gray-900">مركز حل النزاعات</h2>
               <p className="text-orange-700 font-medium text-sm">هنا يتم التدخل اليدوي لحل الخلافات المالية بين البائع والمشتري.</p>
            </div>
         </div>
         <div className="bg-white px-6 py-3 rounded-2xl border border-orange-100 font-black text-orange-600 shadow-sm">
            نزاعات بانتظار الحل: {disputes.length}
         </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-20 text-center text-gray-300 font-bold italic">
         {disputes.length === 0 ? (
           <div className="space-y-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200">
                 <AlertCircle className="w-10 h-10" />
              </div>
              <p>لا يوجد نزاعات حالية تتطلب تدخل مسؤولي النظام.</p>
           </div>
         ) : (
           <div className="text-right space-y-4">
              {/* Future list implementation */}
           </div>
         )}
      </div>
    </div>
  );
};
