import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { sendNotification } from '../lib/notificationService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  sendOTP: (phoneNumber: string, recaptchaContainerId: string) => Promise<ConfirmationResult | null>;
  verifyOTP: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  updateUserPhone: (phoneNumber: string) => Promise<void>;
  submitVerification: (data: { idNumber: string, phoneNumber: string, idPhotoUrl: string, agreedToTerms: boolean }) => Promise<void>;
  clearError: () => void;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Safety timeout to prevent white screen hanging
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      try {
        setUser(user);
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'مستخدم جديد',
              email: user.email || '',
              phoneNumber: user.phoneNumber || '',
              photoURL: user.photoURL || '',
              rating: 3,
              reviewsCount: 0,
              isVerified: false,
              isSeller: false,
              isAdmin: user.email === 'khyratfarmdates@gmail.com', // Auto-admin for this email
              trustLevel: 10,
              verificationStatus: 'none',
              createdAt: serverTimestamp(),
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          } else {
            const data = userSnap.data() as UserProfile;
            // Ensure admin flag is set if email matches
            if (user.email === 'khyratfarmdates@gmail.com' && !data.isAdmin) {
              await updateDoc(userRef, { isAdmin: true });
              data.isAdmin = true;
            }
            setProfile(data);
          }
        } else {
          setProfile(null);
        }
      } catch (err: any) {
        console.error('Error fetching/creating profile:', err);
        setError('حدث خطأ أثناء تحميل بيانات الحساب');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!profile || !user) return;

    const userRef = doc(db, 'users', user.uid);
    
    // Set online
    updateDoc(userRef, { 
      isOnline: true,
      lastSeen: serverTimestamp()
    }).catch(console.error);

    const handleVisibilityChange = () => {
      updateDoc(userRef, { 
        isOnline: document.visibilityState === 'visible',
        lastSeen: serverTimestamp()
      }).catch(console.error);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Periodically update lastSeen as a heartbeat
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateDoc(userRef, { lastSeen: serverTimestamp() }).catch(console.error);
      }
    }, 60000); // Every minute
    
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
      // Best effort set offline on unmount
      updateDoc(userRef, { 
        isOnline: false,
        lastSeen: serverTimestamp() 
      }).catch(console.error);
    };
  }, [user]);

  const login = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('خطأ: هذا النطاق غير مصرح له بتسجيل الدخول. يجب إضافة الرابط الحالي في إعدادات Firebase Console (Authorized Domains).');
      } else {
        setError(err.message || 'فشل تسجيل الدخول');
      }
    }
  };

  const sendOTP = async (phoneNumber: string, recaptchaContainerId: string): Promise<ConfirmationResult | null> => {
    try {
      const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: 'invisible',
      });
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      return confirmation;
    } catch (err: any) {
      console.error('SMS Send Error:', err);
      setError('فشل إرسال كود التحقق. تأكد من صحة الرقم وتفعيل ميزة الـ SMS في Firebase.');
      return null;
    }
  };

  const verifyOTP = async (confirmationResult: ConfirmationResult, code: string) => {
    try {
      const result = await confirmationResult.confirm(code);
      if (result.user) {
        // Phone verification success
        const userRef = doc(db, 'users', result.user.uid);
        await updateDoc(userRef, { 
          phoneNumber: result.user.phoneNumber,
          isVerified: true 
        });
      }
    } catch (err: any) {
      console.error('OTP Verification Error:', err);
      setError('كود التحقق غير صحيح');
      throw err;
    }
  };

  const updateUserPhone = async (phoneNumber: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { phoneNumber });
      setProfile(prev => prev ? { ...prev, phoneNumber } : null);
    } catch (err: any) {
      setError('فشل تحديث رقم الهاتف في الملف الشخصي');
    }
  };

  const submitVerification = async (data: { idNumber: string, phoneNumber: string, idPhotoUrl: string, agreedToTerms: boolean }) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...data,
        verificationStatus: 'pending',
        updatedAt: serverTimestamp()
      });
      
      await sendNotification(
        user.uid,
        'تم استلام طلب التوثيق',
        'طلب التوثيق الخاص بك قيد المراجعة الآن. سنقوم بإبلاغك بالنتيجة فور الانتهاء.',
        'system'
      );

      setProfile(prev => prev ? { ...prev, ...data, verificationStatus: 'pending' } : null);
    } catch (err: any) {
      console.error('Submit verification error:', err);
      setError('فشل إرسال طلب التوثيق. يرجى التأكد من اتصالك بالإنترنت واكتمال بياناتك.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      setError('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      error, 
      login, 
      logout, 
      sendOTP, 
      verifyOTP, 
      updateUserPhone,
      submitVerification,
      clearError,
      setProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
