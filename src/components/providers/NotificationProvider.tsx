import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { Bell, AlertTriangle, CreditCard, MessageSquare, Clock } from 'lucide-react';

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsFirstLoad(true);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Real-time toast for new unread notifications
      if (!isFirstLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newNotif = change.doc.data() as any;
            if (!newNotif.isRead) {
               showToastNotification({ ...newNotif, id: change.doc.id });
            }
          }
        });
      }

      setNotifications(items);
      setUnreadCount(items.filter((n: any) => !n.isRead).length);
      setIsFirstLoad(false);
    }, (error) => {
      console.warn('Notifications snapshot error:', error);
    });

    return () => unsubscribe();
  }, [user, isFirstLoad]);

  const showToastNotification = (notif: any) => {
    const getIcon = () => {
      switch (notif.type) {
        case 'payment': return <CreditCard className="w-4 h-4 text-green-500" />;
        case 'dispute': return <AlertTriangle className="w-4 h-4 text-red-500" />;
        case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />;
        case 'settlement': return <Clock className="w-4 h-4 text-amber-500" />;
        default: return <Bell className="w-4 h-4 text-blue-500" />;
      }
    };

    toast(notif.title, {
      description: notif.message,
      icon: getIcon(),
      duration: 5000,
      position: 'top-center',
    });
    
    // Play sound if urgent
    if (notif.priority === 'urgent') {
       try {
         const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
         audio.volume = 0.5;
         audio.play();
       } catch (e) {}
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
