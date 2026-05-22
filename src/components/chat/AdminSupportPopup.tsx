import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, ChevronRight, Clock, User, Reply, AlertCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AdminSupportPopupProps {
  onReply: (ticketId: string, userId: string) => void;
}

export const AdminSupportPopup: React.FC<AdminSupportPopupProps> = ({ onReply }) => {
  const [activeNotification, setActiveNotification] = useState<any>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', 'ADMIN'),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));
        // Sort client-side by createdAt desc
        items.sort((a, b) => {
          const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
          const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
          return timeB - timeA;
        });

        const notif = items[0];
        if (!isFirstLoad) {
          // Play sound
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio playback blocked until user interaction:', e));
          } catch (e) {}
          setActiveNotification(notif);
        }
      }
      setIsFirstLoad(false);
    });

    return () => unsubscribe();
  }, [isFirstLoad]);

  const handlePostpone = async () => {
    if (activeNotification) {
      const ref = doc(db, 'notifications', activeNotification.id);
      await updateDoc(ref, { isRead: true, postponedAt: serverTimestamp() });
      setActiveNotification(null);
    }
  };

  const handleReply = async () => {
    if (activeNotification) {
      const ref = doc(db, 'notifications', activeNotification.id);
      await updateDoc(ref, { isRead: true });
      onReply(activeNotification.id, activeNotification.targetUserId || 'unknown');
      setActiveNotification(null);
    }
  };

  return (
    <AnimatePresence>
      {activeNotification && (
        <div className="fixed bottom-24 left-6 z-[100] w-full max-w-sm px-4 md:px-0">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2rem] shadow-2xl shadow-blue-200/50 border border-blue-100 overflow-hidden"
          >
            <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <span className="font-black text-sm uppercase tracking-tighter">طلب دعم جديد</span>
              </div>
              <button 
                onClick={() => setActiveNotification(null)}
                className="p-1 hover:bg-white/20 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 leading-tight mb-1">{activeNotification.title}</h4>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">{activeNotification.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <Clock className="w-3 h-3" />
                {activeNotification.createdAt ? format(activeNotification.createdAt.toDate(), 'HH:mm:ss') : 'الآن'}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handlePostpone}
                  className="py-3 px-4 rounded-xl font-bold bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all text-sm"
                >
                  تأجيل
                </button>
                <button
                  onClick={handleReply}
                  className="py-3 px-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 text-sm"
                >
                  <Reply className="w-4 h-4" />
                  رد فوري
                </button>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
               <button 
                onClick={handleReply}
                className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-tighter"
               >
                 فتح تذكرة الدعم بالكامل
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
