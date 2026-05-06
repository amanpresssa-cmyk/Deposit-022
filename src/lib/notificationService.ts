import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, orderBy, limit, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

export type NotificationType = 'order_update' | 'payment' | 'dispute' | 'system' | 'settlement';
export type NotificationPriority = 'normal' | 'settlement' | 'urgent';

export const updateSellerPerformance = async (sellerId: string) => {
  try {
    const userRef = doc(db, 'users', sellerId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return;
    const userData = userSnap.data();

    // 1. Calculate Metrics from Logs & Activity
    const recentLogsQuery = query(
      collection(db, 'orderLogs'),
      where('userId', '==', sellerId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const logsSnap = await getDocs(recentLogsQuery);
    
    // Check for open disputes
    const disputesQuery = query(
      collection(db, 'disputes'),
      where('revieweeId', '==', sellerId), // Assuming disputes might follow users
      where('status', '==', 'open'),
      limit(1)
    );
    // Actually, usually disputes are linked to orderIds.
    // Let's stick to Rating and Verified as the core 'Trust' pillars for now.

    // Simulate Response Speed Calculation based on rating + recency in logs
    let speedLabel = 'خلال دقائق';
    const logCount = logsSnap.size;
    
    if (userData.rating < 3.5 || logCount < 2) speedLabel = 'يوم عمل';
    else if (userData.rating < 4.5) speedLabel = 'خلال ساعات';
    else speedLabel = 'خلال دقائق';

    // 2. Automated Featured (Gold Star) Logic
    // Criteria: High Rating (>= 4.7), Verified, and has history (>= 3 reviews)
    const isHighPerformer = 
      (userData.rating >= 4.7) && 
      (userData.reviewsCount >= 3) && 
      (userData.isVerified === true) &&
      (userData.isBlocked !== true);

    await updateDoc(userRef, {
      avgResponseTime: speedLabel,
      isFeatured: isHighPerformer,
      updatedAt: serverTimestamp()
    });

    console.log(`[Performance Sync] Seller ${sellerId} updated. Featured: ${isHighPerformer}`);
  } catch (error) {
    console.error('Failed to update seller performance:', error);
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    
    snap.docs.forEach(d => {
      batch.update(d.ref, { isRead: true });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Failed to mark all as read:', error);
  }
};

export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'order_update',
  priority: NotificationPriority = 'normal',
  orderId?: string,
  targetUserId?: string
) => {
  try {
    // Basic flood protection/deduplication could go here if needed
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      priority,
      orderId: orderId || null,
      targetUserId: targetUserId || null,
      isRead: false,
      createdAt: serverTimestamp()
    });
    
    // Official System Log
    await recordAuditLog({
      action: 'notification_sent',
      targetId: userId,
      details: { title, type }
    });

    console.log(`[SMS Simulation] TO: ${userId} | ${title}: ${message}`);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};

export const recordOrderEvent = async (
  orderId: string,
  userId: string,
  action: string,
  previousStatus: string,
  newStatus: string,
  comment?: string
) => {
  try {
    await addDoc(collection(db, 'orderLogs'), {
      orderId,
      userId,
      action,
      previousStatus,
      newStatus,
      comment: comment || '',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to record order event:', error);
  }
};

export const recordAuditLog = async (data: {
  action: string;
  targetId: string;
  details: any;
}) => {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      ...data,
      officialEmail: 'khyratfarmdates@gmail.com',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
};

export const sendAdminNotification = async (
  title: string,
  message: string,
  targetUserId?: string
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId: 'ADMIN', // Special ID for admin pool or broad notifications
      title: `🚨 إشعار إداري: ${title}`,
      message,
      type: 'emergency',
      targetUserId: targetUserId || null,
      isRead: false,
      createdAt: serverTimestamp()
    });
    
    await recordAuditLog({
      action: 'admin_emergency_alert',
      targetId: 'ADMIN',
      details: { title, message }
    });
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
};

export const recordTransaction = async (data: {
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: 'escrowed' | 'completed' | 'refunded';
  specialty?: string;
}) => {
  try {
    await addDoc(collection(db, 'transactions'), {
      ...data,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to record transaction:', error);
  }
};
