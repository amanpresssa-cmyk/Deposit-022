import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Message, Order, UserProfile } from '../../types';
import { Send, User as UserIcon, CheckCircle2, AlertCircle, Eye, EyeOff, Package, CreditCard, Receipt, Clock, Image as ImageIcon, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { sendNotification } from '../../lib/notificationService';
import { motion, AnimatePresence } from 'motion/react';

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
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserInChat, setOtherUserInChat] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const scrollRef    = useRef<HTMLDivElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchOrderAndOtherUser = async () => {
      try {
        const orderRef = doc(db, 'orders', orderId);
        
        // Listen to order for typing status and presence
        const unsubOrder = onSnapshot(orderRef, (snap) => {
          if (snap.exists()) {
            const orderData = { id: snap.id, ...snap.data() } as Order;
            setOrder(orderData);
            
            const otherUserId = orderData.buyerId === user?.uid ? orderData.sellerId : orderData.buyerId;
            if (otherUserId) {
              // Check typing
              if (orderData.typingStatus && orderData.typingStatus[otherUserId]) {
                setOtherUserTyping(true);
              } else {
                setOtherUserTyping(false);
              }
              // Check chat presence
              if (orderData.chatPresence && orderData.chatPresence[otherUserId]) {
                setOtherUserInChat(true);
              } else {
                setOtherUserInChat(false);
              }
            }
          }
        });

        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          const orderData = orderSnap.data() as Order;
          const otherUserId = orderData.buyerId === user?.uid ? orderData.sellerId : orderData.buyerId;
          
          if (otherUserId && otherUserId !== 'unknown') {
            // Listen to other user's profile for real-time app presence
            const unsubProfile = onSnapshot(doc(db, 'users', otherUserId), (snap) => {
              if (snap.exists()) {
                setOtherUser({ uid: snap.id, ...snap.data() } as UserProfile);
              }
            });
            return () => {
              unsubOrder();
              unsubProfile();
            };
          } else {
            setOtherUser(null);
            return () => {
              unsubOrder();
            };
          }
        }
      } catch (error) {
        console.error("Error fetching other user:", error);
      }
    };

    let cleanup: (() => void) | undefined;
    fetchOrderAndOtherUser().then(cb => {
      cleanup = cb;
    });

    const q = query(
      collection(db, `orders/${orderId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, (error) => {
      console.error('[ChatRoom] messages listener error:', (error as any)?.code, (error as any)?.message);
    });

    return () => {
      unsubscribe();
      if (cleanup) cleanup();
    };
  }, [orderId, user?.uid]);

  // Manage own Chat Presence
  useEffect(() => {
    if (!user || !orderId) return;
    
    const setPresence = (status: boolean) => {
      updateDoc(doc(db, 'orders', orderId), {
        [`chatPresence.${user.uid}`]: status,
        updatedAt: serverTimestamp()
      }).catch(() => {});
    };

    setPresence(true);

    const handleVisibilityChange = () => {
      setPresence(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle window blur/focus as a fallback for presence
    window.addEventListener('focus', () => setPresence(true));
    window.addEventListener('blur', () => setPresence(false));

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', () => setPresence(true));
      window.removeEventListener('blur', () => setPresence(false));
      setPresence(false);
    };
  }, [user, orderId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, otherUserTyping]);

  const safeUpdateTyping = async (value: boolean) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        [`typingStatus.${user.uid}`]: value,
        updatedAt: serverTimestamp()
      });
    } catch {
      // Silently ignore
    }
  };

  const handleTyping = () => {
    if (!user || !order) return;
    
    if (!isTyping) {
      setIsTyping(true);
      safeUpdateTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      safeUpdateTyping(false);
    }, 3000);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        import('sonner').then(m => m.toast.error('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت'));
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newMessage.trim() && !selectedImage)) return;

    const text = newMessage.trim();
    setSending(true);

    // Clear typing status instantly
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    safeUpdateTyping(false);

    try {
      let imageUrl = '';
      if (selectedImage) {
        const fileRef = ref(storage, `chat_images/${orderId}/${Date.now()}_${selectedImage.name}`);
        await uploadBytes(fileRef, selectedImage);
        imageUrl = await getDownloadURL(fileRef);
      }

      const msgData: any = {
        orderId,
        senderId: user.uid,
        text,
        createdAt: serverTimestamp(),
      };
      
      if (imageUrl) msgData.imageUrl = imageUrl;

      await addDoc(collection(db, `orders/${orderId}/messages`), msgData);

      updateDoc(doc(db, 'orders', orderId), {
        lastMessage: text || '📎 صورة مرفقة',
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch(() => {});

      if (otherUser?.uid) {
        sendNotification(
          otherUser.uid,
          `رسالة جديدة بخصوص: ${order?.title || 'طلب'}`,
          text || '📎 صورة مرفقة',
          'message',
          'normal',
          orderId,
          user.uid
        ).catch(() => {});
      }
      
      setNewMessage('');
      removeSelectedImage();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      import('sonner').then(m => m.toast.error('تعذر الإرسال: ' + (error.message || 'خطأ غير معروف')));
    } finally {
      setSending(false);
    }
  };

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const isTrulyOnline = (u: UserProfile | null) => {
    if (!u) return false;
    if (!u.lastSeen) return false;
    const lastSeenDate = u.lastSeen.toDate ? u.lastSeen.toDate() : new Date(u.lastSeen);
    const diff = (new Date().getTime() - lastSeenDate.getTime()) / 1000;
    return u.isOnline && diff < 45;
  };

  const formatLastSeen = (timestamp: any) => {
    if (!timestamp) return 'غير متاح';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true, locale: ar });
  };

  // Helper to get order context icon and color
  const getOrderStatusContext = () => {
    if (!order) return null;
    switch (order.status) {
      case 'pending': return { icon: <Clock className="w-4 h-4 text-amber-600" />, text: 'بانتظار الدفع والإيداع', color: 'bg-amber-50 text-amber-800 border-amber-100' };
      case 'escrowed': return { icon: <CreditCard className="w-4 h-4 text-blue-600" />, text: 'المبلغ محفوظ لدى عربون', color: 'bg-blue-50 text-blue-800 border-blue-100' };
      case 'delivered': return { icon: <Package className="w-4 h-4 text-purple-600" />, text: 'تم التسليم، بانتظار الموافقة', color: 'bg-purple-50 text-purple-800 border-purple-100' };
      case 'completed': return { icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, text: 'مكتمل (تم تحويل المبلغ للبائع)', color: 'bg-green-50 text-green-800 border-green-100' };
      case 'disputed': return { icon: <AlertCircle className="w-4 h-4 text-red-600" />, text: 'يوجد نزاع - قيد التحكيم', color: 'bg-red-50 text-red-800 border-red-100' };
      case 'cancelled': return { icon: <AlertCircle className="w-4 h-4 text-gray-500" />, text: 'ملغى', color: 'bg-gray-100 text-gray-600 border-gray-200' };
      default: return null;
    }
  };

  const orderContext = getOrderStatusContext();

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
      {/* HEADER */}
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden relative shadow-sm">
            {otherUser?.photoURL ? (
              <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-6 h-6 text-gray-400" />
            )}
            {(otherUserInChat || isTrulyOnline(otherUser)) && (
              <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${otherUserInChat ? 'bg-green-500 animate-pulse' : 'bg-emerald-400'}`} />
            )}
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-sm">
               {otherUser ? (otherUser.displayName || 'مستخدم') : 'الطرف الآخر (غير مسجل بعد)'}
            </h3>
            <div className="flex items-center gap-1.5 h-4 mt-0.5">
              {otherUserTyping ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-blue-600">جاري الكتابة</span>
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" />
                  </div>
                </div>
              ) : otherUserInChat ? (
                <span className="text-[10px] font-black text-green-600 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  يقرأ المحادثة الآن
                </span>
              ) : isTrulyOnline(otherUser) ? (
                <span className="text-[10px] font-bold text-emerald-600">متصل بالمنصة</span>
              ) : (
                <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                  <EyeOff className="w-3 h-3" />
                  آخر ظهور: {formatLastSeen(otherUser?.lastSeen)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth">
        {/* Order Context Sticky Banner inside chat */}
        {order && orderContext && (
          <div className={`sticky top-0 z-10 backdrop-blur-md bg-white/80 p-3 rounded-2xl border ${orderContext.color} flex items-center justify-between mb-6 shadow-sm`}>
            <div className="flex items-center gap-2">
               {orderContext.icon}
               <span className="text-xs font-black">{orderContext.text}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-xl border border-black/5">
               <Receipt className="w-3.5 h-3.5 opacity-70" />
               <span className="text-xs font-black font-mono">{order.amount.toLocaleString()} ر.س</span>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn = msg.senderId === user?.uid;
          const isSystem = msg.senderId === 'SYSTEM' || msg.isSystem;
          const showTime = idx === 0 || messages[idx-1].senderId !== msg.senderId || (msg.createdAt && messages[idx-1].createdAt && (msg.createdAt as any).seconds - (messages[idx-1].createdAt as any).seconds > 300);
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex ${isSystem ? 'justify-center w-full' : isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] sm:max-w-[85%] space-y-1 flex flex-col ${isSystem ? 'items-center w-full' : isOwn ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-3 text-sm leading-relaxed shadow-sm w-full flex flex-col ${
                    isSystem 
                      ? 'bg-amber-50/80 text-amber-900 border border-amber-200/60 rounded-2xl font-bold gap-3 items-start'
                      : isOwn
                        ? 'bg-blue-600 text-white rounded-3xl rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-3xl rounded-bl-sm border border-gray-100'
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  <div className="flex gap-3">
                    {isSystem && <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />}
                    {msg.text && <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>}
                  </div>
                  {msg.imageUrl && (
                    <a href={msg.imageUrl} target="_blank" rel="noreferrer" className="block mt-2 rounded-xl overflow-hidden border border-black/10 hover:opacity-90 transition-opacity">
                      <img src={msg.imageUrl} alt="مرفق" className="max-w-[200px] sm:max-w-[250px] object-cover" />
                    </a>
                  )}
                  {((msg.fileUrls && msg.fileUrls.length > 0) || msg.fileUrl) && (
                    <div className="flex flex-col gap-2 mt-2">
                      {(msg.fileUrls || (msg.fileUrl ? [msg.fileUrl] : [])).map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-current p-2 rounded-xl border border-current/10 transition-colors text-xs font-bold w-fit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          تحميل المرفق {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {showTime && !isSystem && (
                  <p className={`text-[9px] font-bold text-gray-400 px-2 ${isOwn ? 'text-right' : 'text-left'}`}>
                    {msg.createdAt ? format(msg.createdAt.toDate(), 'hh:mm a', { locale: ar }) : 'الآن'}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Dynamic Typing Indicator Bubble */}
        <AnimatePresence>
          {otherUserTyping && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, originY: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-gray-100 rounded-3xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5 w-16">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-2" /> {/* Bottom Padding */}
      </div>

      {/* INPUT AREA */}
      <div className="bg-white border-t border-gray-100 z-10 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)]">
        {imagePreview && (
          <div className="p-3 border-b border-gray-100 flex items-start gap-3 bg-gray-50/50">
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-gray-200 shadow-sm" />
              <button 
                type="button"
                onClick={removeSelectedImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="text-xs text-gray-500 font-medium py-2">صورة مرفقة</div>
          </div>
        )}
        <form onSubmit={sendMessage} className="p-4">
          <div className="flex gap-2 items-end">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageSelect}
              disabled={sending || order?.status === 'completed' || order?.status === 'cancelled'}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || order?.status === 'completed' || order?.status === 'cancelled'}
              className="p-3 h-12 w-12 rounded-2xl flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-all shrink-0"
            >
              <ImageIcon className="w-6 h-6" />
            </button>
            <textarea
              className="flex-1 max-h-32 min-h-[48px] px-4 py-3 rounded-2xl border border-gray-200 focus:border-blue-500 outline-none text-sm font-medium transition-all disabled:bg-gray-50 disabled:cursor-not-allowed resize-none bg-gray-50/50"
              placeholder={order?.status === 'completed' || order?.status === 'cancelled' ? "تم إغلاق المحادثة لانتهاء الصفقة" : "اكتب رسالتك هنا..."}
              disabled={sending || order?.status === 'completed' || order?.status === 'cancelled'}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e as any);
                }
              }}
              rows={1}
              style={{
                 height: newMessage ? 'auto' : '48px',
              }}
            />
            <button
              type="submit"
              disabled={sending || (!newMessage.trim() && !selectedImage) || order?.status === 'completed' || order?.status === 'cancelled'}
              className="bg-blue-600 text-white p-3 h-12 w-12 rounded-2xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-md shadow-blue-600/20 active:scale-95 shrink-0"
            >
              <Send className="w-5 h-5 rtl:-scale-x-100 -ml-1" />
            </button>
          </div>
          <p className="text-[9px] font-bold text-gray-400 text-center mt-3">
            الرسائل مشفرة ومحفوظة لحماية حقوق الطرفين في منصة عربون.
          </p>
        </form>
      </div>
    </div>
  );
};
