import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type NotificationType = 'order_update' | 'payment' | 'dispute' | 'system';

export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'order_update',
  orderId?: string
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      orderId: orderId || null,
      isRead: false,
      createdAt: serverTimestamp()
    });
    
    // Simulate SMS Log in console for development
    console.log(`[SMS Simulation] TO: ${userId} | ${title}: ${message}`);
  } catch (error) {
    console.error('Failed to send notification:', error);
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
