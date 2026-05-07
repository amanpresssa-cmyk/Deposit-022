import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MessageSquare, AlertCircle, Clock, ExternalLink, CheckCircle2, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export const AdminSupport: React.FC = () => {
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const unsubSupport = onSnapshot(query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc')), (snapshot) => {
      setSupportTickets(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAlerts = onSnapshot(query(collection(db, 'notifications'), where('userId', '==', 'ADMIN'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAlerts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubSupport(); unsubAlerts(); };
  }, []);

  const updateTicketStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'support_tickets', id), { status, updatedAt: serverTimestamp() });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Critical Alerts Sector */}
      {alerts.length > 0 && (
        <section className="space-y-4">
           <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-black text-gray-900">بلاغات طارئة ({alerts.length})</h2>
           </div>
           <div className="grid grid-cols-1 gap-4">
              {alerts.map(alert => (
                <div key={alert.id} className="bg-white p-6 rounded-3xl border-r-4 border-red-500 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                         <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                         <h4 className="font-black text-gray-900">{alert.title}</h4>
                         <p className="text-gray-500 text-sm font-medium">{alert.message}</p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                     {alert.targetUserId && (
                        <Link to={`/seller/${alert.targetUserId}`} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-200 transition-all">
                           المشكو منه
                        </Link>
                     )}
                   </div>
                </div>
              ))}
           </div>
        </section>
      )}

      {/* Support Tickets Sector */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
           <MessageSquare className="w-5 h-5 text-blue-600" />
           <h2 className="text-xl font-black text-gray-900">طلبات الدعم والشكاوى المباشرة</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
           {supportTickets.length === 0 ? (
             <div className="bg-white rounded-[2.5rem] p-20 text-center text-gray-300 font-bold border border-gray-100 italic">لا توجد طلبات دعم حالية</div>
           ) : (
             supportTickets.map(ticket => (
               <div key={ticket.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between gap-8 transition-all hover:shadow-md">
                  <div className="flex-1 flex gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${
                      ticket.type === 'complaint' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                       {ticket.type === 'complaint' ? <AlertCircle className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
                    </div>
                    <div className="space-y-4">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <h4 className="font-black text-lg text-gray-900">{ticket.userName}</h4>
                             <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                               ticket.type === 'complaint' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                             }`}>
                                {ticket.type === 'complaint' ? 'بلاغ تقني' : 'استفسار'}
                             </span>
                          </div>
                          <p className="text-xs font-bold text-gray-400">{ticket.userEmail}</p>
                       </div>
                       <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100/50 relative">
                          <p className="text-sm font-medium text-gray-600 leading-relaxed text-right">{ticket.message}</p>
                       </div>
                       <div className="flex items-center gap-4 text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                          <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(ticket.createdAt?.toDate?.() || new Date(), 'dd MMM HH:mm', { locale: ar })}</div>
                          {ticket.category && <div className="flex items-center gap-1"># {ticket.category}</div>}
                       </div>
                    </div>
                  </div>

                  <div className="w-full md:w-56 flex flex-col gap-3 shrink-0">
                     <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">الحالة</p>
                        <span className={`text-xs font-black px-3 py-1 rounded-full ${
                           ticket.status === 'open' || ticket.status === 'requested' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                        }`}>
                           {ticket.status === 'open' ? 'قيد المراجعة' : ticket.status === 'resolved' ? 'تم الحل' : 'مكتمل'}
                        </span>
                     </div>
                     {ticket.status !== 'resolved' && (
                        <button onClick={() => updateTicketStatus(ticket.id, 'resolved')} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">تحويل لمحلول</button>
                     )}
                     <button onClick={() => updateTicketStatus(ticket.id, 'closed')} className="w-full py-3.5 bg-gray-100 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-200 transition-all">إغلاق وتجاهل</button>
                  </div>
               </div>
             ))
           )}
        </div>
      </section>
    </div>
  );
};
