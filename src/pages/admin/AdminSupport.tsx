import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, where, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { MessageSquare, AlertCircle, Clock, ExternalLink, CheckCircle2, MessageCircle, ArrowRight, History } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { SupportChat } from '../../components/support/SupportChat';

export const AdminSupport: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [stats, setStats] = useState({
    open: 0,
    waiting: 0,
    complaints: 0,
    resolvedToday: 0
  });

  useEffect(() => {
    if (!isAdmin) return;

    let q = query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc'));
    
    const unsubSupport = onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setSupportTickets(tickets);
      
      setStats({
        open: tickets.filter(t => t.status === 'open').length,
        waiting: tickets.filter(t => t.status === 'waiting_for_user').length,
        complaints: tickets.filter(t => t.type === 'complaint').length,
        resolvedToday: tickets.filter(t => t.status === 'resolved' && t.updatedAt?.toDate() > new Date(new Date().setHours(0,0,0,0))).length
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'support_tickets');
    });

    const unsubAlerts = onSnapshot(query(collection(db, 'notifications'), where('userId', '==', 'ADMIN')), (snapshot) => {
      const sortedDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      sortedDocs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      setAlerts(sortedDocs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications/ADMIN');
    });

    return () => { unsubSupport(); unsubAlerts(); };
  }, [isAdmin]);

  const updateTicketStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'support_tickets', id), { 
        status, 
        updatedAt: serverTimestamp() 
      });

      // Log the action for audit
      await addDoc(collection(db, 'system_logs'), {
        operationType: 'TICKET_STATUS_UPDATE',
        ticketId: id,
        newStatus: status,
        updatedBy: user?.email,
        timestamp: serverTimestamp(),
        severity: 'INFO'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `support_tickets/${id}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Support Dashboard Header */}
      {!selectedTicket && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'طلبات مفتوحة', value: stats.open, color: 'orange', icon: <MessageSquare /> },
            { label: 'بانتظار رد العميل', value: stats.waiting, color: 'blue', icon: <Clock /> },
            { label: 'بلاغات الشكاوى', value: stats.complaints, color: 'red', icon: <AlertCircle /> },
            { label: 'تم حلها اليوم', value: stats.resolvedToday, color: 'green', icon: <CheckCircle2 /> }
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-50 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">{s.label}</p>
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                s.color === 'orange' ? 'bg-orange-50 text-orange-600' : 
                s.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                s.color === 'red' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
              }`}>
                {React.cloneElement(s.icon as React.ReactElement, { className: 'w-6 h-6' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTicket ? (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <button 
                onClick={() => setSelectedTicket(null)}
                className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-black transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <span>قائمة التذاكر</span>
              </button>
              <div className="flex items-center gap-3">
                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                    selectedTicket.status === 'open' ? 'bg-orange-100 text-orange-700' : 
                    selectedTicket.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                 }`}>
                    {selectedTicket.status}
                 </span>
              </div>
            </div>

            <SupportChat 
              ticket={selectedTicket}
              currentUserId="ADMIN"
              currentUserRole="admin"
              onClose={() => setSelectedTicket(null)}
            />
          </div>

          {/* Investigation Sidebar */}
          <div className="space-y-6">
              <div className="bg-gray-950 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
                <div className="relative z-10 text-right">
                   <h3 className="font-black italic mb-6 flex items-center justify-between gap-2">
                     <span className="text-blue-400">سجل التحقيق</span>
                     <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                           <div key={i} className={`w-1.5 h-1.5 rounded-full ${selectedTicket.priority === 'urgent' ? 'bg-red-500' : 'bg-green-500'}`} />
                        ))}
                     </div>
                   </h3>
                   <div className="space-y-6">
                      <div>
                         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">العميل المرتبط</p>
                         <p className="font-black text-sm">{selectedTicket.userName}</p>
                         <p className="text-[10px] font-bold text-gray-600">{selectedTicket.userEmail}</p>
                         {selectedTicket.userId && (
                            <div className="flex flex-col gap-2 mt-4">
                               <Link to={`/admin/users?search=${selectedTicket.userId}`} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-[10px] font-black text-blue-400 flex items-center justify-between transition-all">
                                  <span>ملف العضوية</span>
                                  <ExternalLink className="w-3 h-3" />
                               </Link>
                               <button 
                                 onClick={() => window.open(`/admin/orders?search=${selectedTicket.userId}`, '_blank')}
                                 className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black text-gray-300 flex items-center justify-between transition-all"
                               >
                                  <span>تاريخ المعاملات</span>
                                  <History className="w-3 h-3" />
                               </button>
                            </div>
                         )}
                      </div>
                      <div className="pt-6 border-t border-white/5">
                         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">ذكاء النظام (AI Audit)</p>
                         <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-3 text-[10px] font-medium text-blue-100 leading-relaxed italic">
                            {selectedTicket.type === 'complaint' 
                             ? 'هذا البلاغ يتطلب تدقيقاً مالياً في سجلات الدفع والتحقق من حالة الطلبات المرتبطة بالعضو.' 
                             : 'استفسار عام يتطلب إرشاد العميل نحو صفحة الشروط أو الدليل المعرفي.'}
                         </div>
                      </div>
                   </div>
                </div>
              </div>

             <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm text-right">
                <h4 className="text-xs font-black text-gray-900 mb-4">أدوات التحكم</h4>
                <div className="grid grid-cols-1 gap-2">
                   <button onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')} className="w-full py-3 bg-green-50 text-green-600 rounded-2xl text-[10px] font-black hover:bg-green-600 hover:text-white transition-all">تحديد كمحلولة</button>
                   <button onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress')} className="w-full py-3 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all">قيد المعالجة</button>
                   <button onClick={() => updateTicketStatus(selectedTicket.id, 'closed')} className="w-full py-3 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black hover:bg-gray-900 hover:text-white transition-all">إغلاق التذكرة نهائياً</button>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <>
          {/* Critical Alerts Sector */}
      {alerts.length > 0 && (
        <section className="space-y-4">
           <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-black text-gray-900">بلاغات طارئة ({alerts.length})</h2>
           </div>
           <div className="grid grid-cols-1 gap-4">
              {alerts.map(alert => (
                <div 
                  key={alert.id} 
                  onClick={() => {
                    if (alert.ticketId) {
                      const ticket = supportTickets.find(t => t.id === alert.ticketId);
                      if (ticket) setSelectedTicket(ticket);
                    }
                  }}
                  className={`bg-white p-6 rounded-3xl border-r-4 border-red-500 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 transition-all ${alert.ticketId ? 'cursor-pointer hover:border-blue-200 hover:shadow-md' : ''}`}
                >
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                         <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                         <h4 className="font-black text-gray-900">{alert.title}</h4>
                         <p className="text-gray-500 text-sm font-medium">{alert.message}</p>
                      </div>
                   </div>
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      {alert.ticketId ? (
                         <button 
                           onClick={() => {
                             const ticket = supportTickets.find(t => t.id === alert.ticketId);
                             if (ticket) setSelectedTicket(ticket);
                             else {
                               // If not found in current snapshot, we should probably fetch it or inform
                               alert('عذراً، لم يتم العثور على التذكرة حالياً');
                             }
                           }}
                           className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
                         >
                            <MessageSquare className="w-3 h-3" />
                            فتح التذكرة
                         </button>
                      ) : alert.targetUserId && (
                         <Link to={`/seller/${alert.targetUserId}`} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-200 transition-all">
                            {alert.title?.includes('بلاغ') ? 'المشكو منه' : 'ملف المستخدم'}
                         </Link>
                      )}
                      
                      {/* Only show seller link as secondary if ticketId is present */}
                      {alert.ticketId && alert.targetUserId && (
                         <Link to={`/seller/${alert.targetUserId}`} className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl font-black text-[10px] hover:text-gray-600 transition-all">
                            ملف العميل
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
           <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-black text-gray-900">طلبات الدعم والشكاوى المباشرة</h2>
           </div>
           <div className="flex flex-wrap gap-2">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-black text-gray-500 outline-none"
              >
                <option value="all">كل الحالات</option>
                <option value="open">جديد</option>
                <option value="in_progress">قيد المعالجة</option>
                <option value="waiting_for_user">بانتظار رد</option>
                <option value="resolved">محلول</option>
              </select>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-black text-gray-500 outline-none"
              >
                <option value="all">كل التصنيفات</option>
                <option value="payment">دفع وسحب</option>
                <option value="seller">بلاغ بائع</option>
                <option value="technical">تقني</option>
                <option value="suggestion">اقتراح</option>
              </select>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
           {supportTickets
             .filter(t => filterStatus === 'all' || t.status === filterStatus)
             .filter(t => filterCategory === 'all' || t.category === filterCategory)
             .length === 0 ? (
             <div className="bg-white rounded-[2.5rem] p-20 text-center text-gray-300 font-bold border border-gray-100 italic">لا توجد طلبات دعم حالية</div>
           ) : (
             supportTickets
               .filter(t => filterStatus === 'all' || t.status === filterStatus)
               .filter(t => filterCategory === 'all' || t.category === filterCategory)
               .map(ticket => (
               <div 
                 key={ticket.id} 
                 onClick={() => setSelectedTicket(ticket)}
                 className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between gap-8 transition-all hover:shadow-xl hover:border-blue-100 cursor-pointer group"
               >
                  <div className="flex-1 flex gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-110 ${
                      ticket.type === 'complaint' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                       {ticket.type === 'complaint' ? <AlertCircle className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
                    </div>
                    <div className="space-y-4">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <h4 className="font-black text-lg text-gray-900 border-r-4 border-blue-600 pr-3 group-hover:text-blue-600 transition-colors uppercase tracking-tight italic leading-tight">{ticket.title || 'بدون عنوان'}</h4>
                             <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                               ticket.type === 'complaint' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                             }`}>
                                {ticket.type === 'complaint' ? 'بلاغ تقني' : 'استفسار'}
                             </span>
                          </div>
                          <p className="text-xs font-bold text-gray-400 mr-4 italic">بواسطة: {ticket.userName} ({ticket.userEmail})</p>
                       </div>
                       <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100/50 relative">
                          <p className="text-sm font-medium text-gray-600 leading-relaxed text-right line-clamp-2 italic">{ticket.lastMessagePreview || ticket.message || 'لا توجد تفاصيل'}</p>
                       </div>
                       <div className="flex items-center gap-4 text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                          <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(ticket.createdAt?.toDate?.() || new Date(), 'dd MMM HH:mm', { locale: ar })}</div>
                          {ticket.category && <div className="flex items-center gap-1"># {ticket.category}</div>}
                       </div>
                    </div>
                  </div>

                  <div className="w-full md:w-56 flex flex-col gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                     <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center group-hover:bg-blue-50/20 transition-colors">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 whitespace-nowrap">الحالة الحالية</p>
                        <span className={`text-xs font-black px-3 py-1 rounded-full ${
                           ticket.status === 'open' || ticket.status === 'requested' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                        }`}>
                           {ticket.status === 'open' ? 'قيد المراجعة' : ticket.status === 'resolved' ? 'تم الحل' : 'مكتمل'}
                        </span>
                     </div>
                     <div className="flex gap-2">
                        {ticket.status !== 'resolved' && (
                           <button onClick={() => updateTicketStatus(ticket.id, 'resolved')} className="flex-1 py-3.5 bg-blue-50 text-blue-600 rounded-xl font-black text-xs hover:bg-blue-600 hover:text-white transition-all">محلول</button>
                        )}
                        <button onClick={() => setSelectedTicket(ticket)} className="flex-1 py-3.5 bg-gray-900 text-white rounded-xl font-black text-xs hover:bg-gray-800 transition-all shadow-xl shadow-gray-200">فتح الرد</button>
                     </div>
                     <button onClick={() => updateTicketStatus(ticket.id, 'closed')} className="w-full py-3.5 bg-gray-100 text-gray-400 rounded-xl font-black text-xs hover:bg-gray-200 transition-all">إلغاء</button>
                  </div>
               </div>
             ))
           )}
        </div>
      </section>
      </>
    )}
  </div>
);
};
