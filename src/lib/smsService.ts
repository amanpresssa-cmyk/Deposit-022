import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const sendOrderSMS = async (phoneNumber: string, orderId: string, title: string, amount: number) => {
  const baseUrl = window.location.origin;
  const orderUrl = `${baseUrl}/order/${orderId}`;
  
  const message = `منصة عربون: لديك طلب ضمان جديد لـ "${title}" بمبلغ ${amount} ريال. اضغط للتعميد: ${orderUrl}`;
  
  console.log(`[SIMULATED SMS] TO: ${phoneNumber}`);
  console.log(`[SIMULATED SMS] MESSAGE: ${message}`);

  try {
    // Record the SMS in Firestore for debugging/history
    await addDoc(collection(db, 'sms_logs'), {
      phoneNumber,
      orderId,
      message,
      status: 'sent_simulated',
      createdAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Failed to log SMS:', error);
    return false;
  }
};
