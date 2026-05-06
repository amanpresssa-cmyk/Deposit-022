import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Message, Order, UserProfile } from '../../types';
import { Send, User as UserIcon, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../../lib/error-handler';
import { sendNotification, updateSellerPerformance } from '../../lib/notificationService';

interface ChatRoomProps {
  orderId: string;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ orderId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrderAndOtherUser = async () => {
      try {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (orderSnap.exists()) {
          const orderData = orderSnap.data() as Order;
          setOrder(orderData);
          const otherUserId = orderData.buyerId === user?.uid ? orderData.sellerId : orderData.buyerId;
          
          // Listen to other user's profile for real-time presence
          const unsubProfile = onSnapshot(doc(db, 'users', otherUserId), (snap) => {
            if (snap.exists()) {
              setOtherUser({ uid: snap.id, ...snap.data() } as UserProfile);
            }
          });
          return unsubProfile;
        }
      } catch (error) {
        console.error("Error fetching other user:", error);
      }
    };

    let unsubProfile: (() => void) | undefined;
    fetchOrderAndOtherUser().then(unsub => {
      unsubProfile = unsub;
    });

    const q = query(
      collection(db, `orders/${orderId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, `orders/${orderId}/messages`);
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, [orderId, user?.uid]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || !otherUser) return;

    const text = newMessage.trim();
    setSending(true);
    try {
      await addDoc(collection(db, `orders/${orderId}/messages`), {
        orderId,
        senderId: user.uid,
        text,
        createdAt: serverTimestamp(),
      });

      // Send Notification to recipient
      await sendNotification(
        otherUser.uid,
        `رسالة جديدة من ${user.displayName || 'مستخدم'}`,
        text,
        'order_update',
        'normal',
        orderId,
        user.uid
      );

      // If sender is a seller, update their performance metrics automatically
      if (order?.sellerId === user.uid) {
        await updateSellerPerformance(user.uid);
      }

      setNewMessage('');
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}/messages`);
    } finally {
      setSending(false);
    }
  };

  const formatLastSeen = (timestamp: any) => {
    if (!timestamp) return 'غير متاح';
    const date = timestamp.toDate();
    return formatDistanceToNow(date, { addSuffix: true, locale: ar });
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden">
            {otherUser?.photoURL ? (
              <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">{otherUser?.displayName || 'جاري التحميل...'}</h3>
            <div className="flex items-center gap-1.5">
              {otherUser?.isOnline ? (
                <>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-green-600">متصل الآن</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-500">
                    آخر ظهور: {formatLastSeen(otherUser?.lastSeen)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isOwn = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] space-y-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-2 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
                  }`}
                >
                  {msg.text}
                </div>
                <p className="text-[10px] text-gray-400 font-medium px-1">
                  {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm', { locale: ar }) : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-gray-50/50 border-t border-gray-100 flex gap-2">
        <input
          type="text"
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-sm transition-all"
          placeholder="اكتب رسالتك هنا..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="bg-blue-600 text-white p-2 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
        >
          <Send className="w-5 h-5 rtl:scale-x-[-1]" />
        </button>
      </form>
    </div>
  );
};
