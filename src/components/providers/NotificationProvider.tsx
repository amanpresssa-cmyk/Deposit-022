import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { Bell, AlertTriangle, CreditCard, MessageSquare, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { markNotificationAsRead } from '../../lib/notificationService';

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

  // ── Stable refs (never cause useEffect re-run) ──────────────────────────
  const navigateRef = useRef(navigate);
  const shownToastIds = useRef<Set<string>>(new Set());

  // Keep navigateRef current without adding navigate to useEffect deps
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // ── Toast display ────────────────────────────────────────────────────────
  // Defined without depending on navigate — uses navigateRef instead
  const showToast = useCallback((notif: any) => {
    if (!notif.id || shownToastIds.current.has(notif.id)) return;
    shownToastIds.current.add(notif.id);

    const getIcon = () => {
      switch (notif.type) {
        case 'payment':    return <CreditCard  className="w-4 h-4 text-green-500" />;
        case 'dispute':    return <AlertTriangle className="w-4 h-4 text-red-500" />;
        case 'message':    return <MessageSquare className="w-4 h-4 text-blue-500" />;
        case 'settlement': return <Clock        className="w-4 h-4 text-amber-500" />;
        default:           return <Bell         className="w-4 h-4 text-blue-500" />;
      }
    };

    const handleClick = async () => {
      if (notif.id) await markNotificationAsRead(notif.id).catch(() => {});
      const nav = navigateRef.current;
      if      (notif.action?.url)         nav(notif.action.url);
      else if (notif.orderId)             nav(`/order/${notif.orderId}`);
      else if (notif.type === 'message')  nav('/dashboard?tab=messages');
      else                                nav('/dashboard?tab=notifications');
    };

    toast(notif.title, {
      description: (
        <div onClick={handleClick} className="cursor-pointer group">
          <p className="text-[11px] leading-tight text-gray-500">{notif.message}</p>
          {notif.action && (
            <div className="text-[10px] text-blue-600 font-black mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
              {notif.action.label} <span>←</span>
            </div>
          )}
        </div>
      ),
      icon: getIcon(),
      duration: 8000,
      position: 'top-center',
      action: (notif.action || notif.orderId) ? {
        label: notif.action?.label || 'عرض',
        onClick: handleClick,
      } : undefined,
    });

    if (notif.priority === 'urgent' || notif.type === 'message') {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    }
  }, []); // ← no navigate dep! uses ref instead

  // Keep showToast in a ref so we can safely call it from inside effect
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  // ── Main subscription effect ─────────────────────────────────────────────
  // Only depends on uid + isAdmin. Navigate/showToast changes won't re-run this.
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      shownToastIds.current.clear();
      return;
    }

    const isAdmin = user.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

    // Per-subscription-cycle initial-load tracking
    // After the first snapshot of each subscription, we record all existing IDs.
    // Only IDs NOT in this set will trigger toasts on subsequent snapshots.
    const seenIds = new Set<string>();
    let userInitialized = false;
    let adminInitialized = false;

    let userNotifs: any[] = [];
    let adminNotifs: any[] = [];

    const merge = () => {
      const combined = [...userNotifs, ...adminNotifs];
      const unique = Array.from(new Map(combined.map(n => [n.id, n])).values());
      unique.sort((a, b) => {
        const tA = a.createdAt?.toDate?.()?.getTime() ?? (a.createdAt?.seconds * 1000) ?? 0;
        const tB = b.createdAt?.toDate?.()?.getTime() ?? (b.createdAt?.seconds * 1000) ?? 0;
        return tB - tA;
      });
      setNotifications(unique);
      setUnreadCount(unique.filter(n => !n.isRead).length);
    };

    // ── User notifications stream ──────────────────────────────────────────
    const qUser = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(50)
    );

    const unsubUser = onSnapshot(qUser, (snapshot) => {
      if (!userInitialized) {
        // First snapshot: record all existing IDs silently (no toasts)
        snapshot.docs.forEach(d => seenIds.add(d.id));
        userInitialized = true;
        userNotifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        merge();
        return;
      }

      // Subsequent snapshots: only toast for genuinely NEW docs
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' && !seenIds.has(change.doc.id)) {
          seenIds.add(change.doc.id);
          const n = { id: change.doc.id, ...change.doc.data() as any };
          if (!n.isRead) showToastRef.current(n);
        }
      });

      userNotifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      merge();
    }, err => {
      console.error('User notification stream error:', err);
    });

    // ── Admin notifications stream ─────────────────────────────────────────
    let unsubAdmin = () => {};
    if (isAdmin) {
      const qAdmin = query(
        collection(db, 'notifications'),
        where('userId', '==', 'ADMIN'),
        limit(50)
      );

      unsubAdmin = onSnapshot(qAdmin, (snapshot) => {
        if (!adminInitialized) {
          snapshot.docs.forEach(d => seenIds.add(d.id));
          adminInitialized = true;
          adminNotifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          merge();
          return;
        }

        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' && !seenIds.has(change.doc.id)) {
            seenIds.add(change.doc.id);
            const n = { id: change.doc.id, ...change.doc.data() as any };
            if (!n.isRead) showToastRef.current(n);
          }
        });

        adminNotifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        merge();
      }, err => {
        console.error('Admin notification stream error:', err);
      });
    }

    return () => {
      unsubUser();
      unsubAdmin();
    };
  // !! IMPORTANT: Only uid and isAdmin. Do NOT add navigate/showToast here.
  // Those are accessed via refs to prevent re-subscription on every navigation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, profile?.isAdmin]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
