import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type NotificationType = 'order_update' | 'payment' | 'dispute' | 'system' | 'settlement';
export type NotificationPriority = 'normal' | 'settlement' | 'urgent';

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
