import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Send, Clock, User, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SupportChatProps {
  ticket: any;
  currentUserId: string;
  currentUserRole: 'user' | 'admin';
  onClose: () => void;
}

export const SupportChat: React.FC<SupportChatProps> = ({ ticket, currentUserId, currentUserRole, onClose }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticket?.id) return;
    const q = query(
      collection(db, `support_tickets/${ticket.id}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, [ticket.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const messageData = {
        ticketId: ticket.id,
        senderId: currentUserId,
        senderRole: currentUserRole,
        text: newMessage,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, `support_tickets/${ticket.id}/messages`), messageData);
      
      // Update ticket last message info
      await updateDoc(doc(db, 'support_tickets', ticket.id), {
        lastMessagePreview: newMessage,
        lastMessageSenderId: currentUserId,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: currentUserRole === 'user' ? 'open' : 'waiting_for_user'
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending support message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-2xl">
      {/* Header */}
      <div className="p-6 bg-gray-900 text-white flex items-center justify-between">
        <div className="text-right">
          <h3 className="font-black text-lg italic tracking-tight">{ticket.title}</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">تذكرة #{ticket.id.slice(0, 8)}</p>
        </div>
        <button onClick={onClose} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black transition-all">إغلاق</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 italic font-bold">
            <Clock className="w-12 h-12 mb-4 opacity-20" />
            بانتظار رد فريق الدعم...
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-4 rounded-[1.5rem] shadow-sm flex flex-col gap-1 ${
                  isMe 
                  ? (currentUserRole === 'admin' 
                    ? 'bg-gray-900 text-white rounded-tl-none border-r-4 border-blue-500' 
                    : 'bg-blue-600 text-white rounded-tl-none')
                  : (msg.senderRole === 'admin'
                    ? 'bg-blue-50 text-blue-900 border border-blue-100 rounded-tr-none border-r-4 border-blue-600'
                    : 'bg-white text-gray-900 border border-gray-100 rounded-tr-none')
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {msg.senderRole === 'admin' ? (
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isMe ? 'text-blue-400' : 'text-blue-700'}`}>إدارة المنصة</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">المستخدم</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-right">{msg.text}</p>
                  <p className={`text-[9px] font-bold text-right mt-1 ${isMe ? 'opacity-60' : 'text-gray-400'}`}>
                    {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm', { locale: ar }) : 'الآن'}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2">
        <input 
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="اكتب رسالتك للمساعدة..."
          className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-right outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
        />
        <button 
          type="submit"
          disabled={!newMessage.trim() || isSending}
          className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-gray-200 hover:scale-105 transition-all disabled:opacity-50"
        >
          {isSending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-6 h-6 -rotate-45" />}
        </button>
      </form>
    </div>
  );
};
