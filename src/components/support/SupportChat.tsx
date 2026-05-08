import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Send, Clock, User, ShieldCheck, Mail, Phone, Info, Zap, AlertTriangle, ExternalLink, MoreVertical, CheckCircle2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface SupportChatProps {
  ticket: any;
  currentUserId: string;
  currentUserRole: 'user' | 'admin';
  onClose: () => void;
}

const CANNED_RESPONSES = [
  { label: 'ترحيب', text: 'أهلاً بك في دعم منصة خيرات، كيف يمكنني مساعدتك اليوم؟' },
  { label: 'طلب معلومات', text: 'يرجى تزويدنا برقم العملية أو تفاصيل أكثر لنتمكن من خدمتك بشكل أفضل.' },
  { label: 'جارِ المعالجة', text: 'تم استلام طلبك وهو الآن قيد المعالجة من قبل القسم المختص. سنوافيك بالرد قريباً.' },
  { label: 'حل المشكلة', text: 'يسعدنا إبلاغك بأنه قد تم حل المشكلة بنجاح. هل هناك أي شيء آخر يمكننا مساعدتك به؟' },
];

export const SupportChat: React.FC<SupportChatProps> = ({ ticket, currentUserId, currentUserRole, onClose }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticket?.id) return;
    const q = query(
      collection(db, `support_tickets/${ticket.id}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      // Filter out internal messages for regular users
      let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (currentUserRole !== 'admin') {
        docs = docs.filter((d: any) => !d.isInternal);
      }
      setMessages(docs);
    });
    return unsub;
  }, [ticket.id, currentUserRole]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const detectOrderIds = (text: string) => {
    // Basic pattern for common Firestore-like IDs or custom numeric IDs
    const pattern = /[A-Z0-9]{10,25}/g; 
    const matches = text.match(pattern);
    return matches || [];
  };

  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const text = textOverride || newMessage;
    if (!text.trim() || isSending) return;

    setIsSending(true);
    try {
      const messageData = {
        ticketId: ticket.id,
        senderId: currentUserId,
        senderRole: currentUserRole,
        text: text,
        isInternal: currentUserRole === 'admin' ? isInternal : false,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, `support_tickets/${ticket.id}/messages`), messageData);
      
      // Update ticket last message info (only for public messages)
      if (!isInternal) {
        await updateDoc(doc(db, 'support_tickets', ticket.id), {
          lastMessagePreview: text,
          lastMessageSenderId: currentUserId,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: currentUserRole === 'user' ? 'open' : 'waiting_for_user'
        });
      }

      setNewMessage('');
      if (!textOverride) setIsInternal(false);
    } catch (error) {
      console.error('Error sending support message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const MessageText = ({ text }: { text: string }) => {
    const orderIds = detectOrderIds(text);
    if (orderIds.length === 0 || currentUserRole !== 'admin') {
      return <span>{text}</span>;
    }

    let parts = [text];
    orderIds.forEach(id => {
      const newParts: any[] = [];
      parts.forEach(part => {
        if (typeof part !== 'string') {
          newParts.push(part);
          return;
        }
        const splitted = part.split(id);
        splitted.forEach((s, i) => {
          newParts.push(s);
          if (i < splitted.length - 1) {
            newParts.push(
              <Link 
                key={id + i} 
                to={`/admin/orders/${id}`}
                className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black text-[10px] mx-1 inline-flex items-center gap-1 hover:bg-blue-200 transition-colors"
                title="مشاهدة الطلب"
              >
                {id.slice(0, 8)}... <ExternalLink className="w-2 h-2" />
              </Link>
            );
          }
        });
      });
      parts = newParts;
    });

    return <>{parts}</>;
  };

  return (
    <div className="flex flex-col h-[650px] bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-2xl relative">
      {/* Header */}
      <div className="p-6 bg-gray-950 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${ticket.type === 'complaint' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {ticket.type === 'complaint' ? <AlertTriangle className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
           </div>
           <div className="text-right">
              <h3 className="font-black text-sm italic tracking-tight">{ticket.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">تذكرة #{ticket.id.slice(0, 8)}</span>
                 <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                 <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{ticket.category}</span>
              </div>
           </div>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-all">
           <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Admin Quick Options Area */}
      {currentUserRole === 'admin' && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
           <div className="flex items-center gap-2 shrink-0">
             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">اختصارات:</span>
             {CANNED_RESPONSES.map((res, i) => (
                <button 
                   key={i} 
                   onClick={() => handleSendMessage(undefined, res.text)}
                   className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[9px] font-black text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                >
                   {res.label}
                </button>
             ))}
           </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/30">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 italic font-bold">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
               <Clock className="w-10 h-10 opacity-20" />
            </div>
            <p className="text-sm">بانتظار بدء الحوار المباشر...</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === currentUserId;
            const isInternalMsg = msg.isInternal;

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>
                {isInternalMsg && (
                  <div className="flex items-center gap-1.5 mb-1 px-4 text-orange-500">
                     <Zap className="w-3 h-3" />
                     <span className="text-[9px] font-black uppercase tracking-widest">ملاحظة داخلية (للمشرفين فقط)</span>
                  </div>
                )}
                
                <div className={`max-w-[85%] p-5 rounded-[1.8rem] shadow-sm flex flex-col gap-2 relative ${
                  isInternalMsg
                  ? 'bg-orange-50 text-orange-900 border-2 border-orange-200'
                  : isMe 
                    ? (currentUserRole === 'admin' 
                      ? 'bg-gray-900 text-white rounded-tl-none border-r-4 border-blue-500' 
                      : 'bg-blue-600 text-white rounded-tl-none')
                    : (msg.senderRole === 'admin'
                      ? 'bg-blue-50 text-blue-900 border border-blue-100 rounded-tr-none border-r-4 border-blue-600 shadow-blue-100/20'
                      : 'bg-white text-gray-900 border border-gray-100 rounded-tr-none')
                }`}>
                  <div className="flex items-center justify-between mb-1 gap-4">
                    {msg.senderRole === 'admin' ? (
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isMe ? 'text-blue-400' : 'text-blue-700'}`}>مشرف النظام</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{ticket.userName}</span>
                      </div>
                    )}
                    <span className={`text-[8px] font-bold ${isMe ? 'opacity-40' : 'text-gray-400'}`}>
                       {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm', { locale: ar }) : 'الآن'}
                    </span>
                  </div>

                  <div className="text-[13px] font-medium leading-relaxed text-right">
                     <MessageText text={msg.text} />
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Stage */}
      <div className="p-6 bg-white border-t border-gray-100 space-y-4">
        {currentUserRole === 'admin' && (
           <div className="flex items-center gap-3 mb-2">
              <button 
                 onClick={() => setIsInternal(!isInternal)}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                    isInternal ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-gray-100 text-gray-400'
                 }`}
              >
                 <Zap className={`w-3.5 h-3.5 ${isInternal ? 'animate-pulse' : ''}`} />
                 <span className="text-[10px] font-black uppercase tracking-widest">ملاحظة داخلية</span>
              </button>
              <div className="h-4 w-px bg-gray-100"></div>
              <p className="text-[9px] font-bold text-gray-400">
                 {isInternal ? 'الرسالة ستكون مرئية فقط لمشرفي النظام' : 'الرسالة ستصل للعميل بنصها الصريح'}
              </p>
           </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-3">
          <div className="flex-1 relative group">
             <input 
               type="text"
               value={newMessage}
               onChange={(e) => setNewMessage(e.target.value)}
               placeholder={isInternal ? "اكتب ملاحظة للتحقيق بالداخل..." : "اكتب ردك للعميل هنا..."}
               className={`w-full border-2 rounded-[1.5rem] px-8 py-5 text-sm font-bold text-right outline-none transition-all ${
                  isInternal 
                  ? 'bg-orange-50 border-orange-200 focus:bg-white focus:border-orange-500' 
                  : 'bg-gray-50 border-transparent focus:bg-white focus:border-blue-500'
               }`}
             />
             <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                <kbd className="px-2 py-1 bg-gray-100 text-[10px] font-black text-gray-400 rounded-lg">ENTER</kbd>
             </div>
          </div>

          <button 
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
               isInternal ? 'bg-orange-600 text-white shadow-orange-100' : 'bg-gray-900 text-white shadow-gray-200'
            }`}
          >
            {isSending ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className={`w-7 h-7 ${isInternal ? '' : '-rotate-45 translate-x-1'}`} />}
          </button>
        </form>
      </div>

      {/* Floating Notification Badge for Unresolved Items could go here */}
    </div>
  );
};
