import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { getMessaging, getToken } from 'firebase/messaging';
import { toast } from 'sonner';
import { Bell, AlertTriangle, CreditCard, MessageSquare, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendNotification, sendAdminNotification, markNotificationAsRead } from '../../lib/notificationService';
import { handleFirestoreError, OperationType } from '../../lib/error-handler';

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
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isFirstUserLoadRef = useRef(true);
  const isFirstAdminLoadRef = useRef(true);

  useEffect(() => {
    if (!user) return;

    const setupFCM = async () => {
      try {
        if (!('Notification' in window)) {
          console.log('This browser does not support notifications.');
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          
          const messaging = getMessaging();
          const token = await getToken(messaging, {
            vapidKey: 'BM-2QcZ-9ZJszP4K6sT0c1p_rR8e74q8c77K2j6sE-m8aK-6T0c1p_rR8e74q8c77K' // Standard default VAPID key
          }).catch(err => {
            console.warn("FCM getToken failed (expected in local dev or insecure origins):", err);
            return null;
          });

          if (token) {
            console.log('FCM Registration Token:', token);
            const { doc, updateDoc } = await import('firebase/firestore');
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { fcmToken: token });
          }
        }
      } catch (err) {
        console.warn('FCM setup failed. This is expected if running in unsecure local environments:', err);
      }
    };

    setupFCM();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      isFirstUserLoadRef.current = true;
      isFirstAdminLoadRef.current = true;
      return;
    }

    const isAdmin = user.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

    const qUser = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(50)
    );

    let userNotifications: any[] = [];
    let adminNotifications: any[] = [];

    const handleUpdate = (userItems: any[], adminItems: any[]) => {
      const allItems = [...userItems, ...adminItems];
      // Sort in-memory desc by createdAt
      allItems.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || a.createdAt?.seconds * 1000 || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || b.createdAt?.seconds * 1000 || 0;
        return timeB - timeA;
      });

      setNotifications(allItems);
      setUnreadCount(allItems.filter((n: any) => !n.isRead).length);
    };

    const unsubscribeUser = onSnapshot(qUser, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Real-time toast for new unread notifications
      if (!isFirstUserLoadRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newNotif = change.doc.data() as any;
            if (!newNotif.isRead) {
               showToastNotification({ ...newNotif, id: change.doc.id });
            }
          }
        });
      }
      isFirstUserLoadRef.current = false;

      userNotifications = items;
      handleUpdate(userNotifications, adminNotifications);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    let unsubscribeAdmin = () => {};
    if (isAdmin) {
      const qAdmin = query(
        collection(db, 'notifications'),
        where('userId', '==', 'ADMIN'),
        limit(50)
      );

      unsubscribeAdmin = onSnapshot(qAdmin, (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Real-time toast for new unread admin notifications
        if (!isFirstAdminLoadRef.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const newNotif = change.doc.data() as any;
              if (!newNotif.isRead) {
                 showToastNotification({ ...newNotif, id: change.doc.id });
              }
            }
          });
        }
        isFirstAdminLoadRef.current = false;

        adminNotifications = items;
        handleUpdate(userNotifications, adminNotifications);
      }, (error) => {
        console.error('Admin notification stream error:', error);
      });
    }

    return () => {
      unsubscribeUser();
      unsubscribeAdmin();
    };
  }, [user, profile]);

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

    const handleClick = async () => {
      if (notif.id) await markNotificationAsRead(notif.id);
      if (notif.action?.url) {
        navigate(notif.action.url);
      } else if (notif.orderId) {
        navigate(`/order/${notif.orderId}`);
      } else if (notif.type === 'message') {
        navigate('/dashboard?tab=messages');
      } else {
        navigate('/dashboard?tab=notifications');
      }
    };

    toast(notif.title, {
      description: (
        <div onClick={handleClick} className="cursor-pointer group">
          <p className="text-[11px] leading-tight text-gray-500">{notif.message}</p>
          {notif.action && (
            <div className="text-[10px] text-blue-600 font-black mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
               {notif.action.label}
               <span>←</span>
            </div>
          )}
        </div>
      ),
      icon: getIcon(),
      duration: 8000,
      position: 'top-center',
      action: (notif.action || notif.orderId) ? {
        label: notif.action?.label || 'عرض',
        onClick: handleClick
      } : undefined,
    });
    
    // Play sound if urgent or message
    if (notif.priority === 'urgent' || notif.type === 'message') {
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
