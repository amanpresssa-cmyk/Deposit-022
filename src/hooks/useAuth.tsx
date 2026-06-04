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
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, onSnapshot, query, collection, where, getDocs, writeBatch, addDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { sendNotification } from '../lib/notificationService';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  pending2FA: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  sendOTP: (phoneNumber: string, recaptchaContainerId: string) => Promise<ConfirmationResult | null>;
  verifyOTP: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  verify2FA: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  updateUserPhone: (phoneNumber: string) => Promise<void>;
  toggle2FA: (enabled: boolean) => Promise<void>;
  submitVerification: (data: { idNumber: string, phoneNumber: string, agreedToTerms: boolean }) => Promise<void>;
  clearError: () => void;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setPending2FA: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to generate a simple referral code
const generateReferralCode = (uid: string) => {
  return uid.slice(0, 6).toUpperCase() + Math.floor(Math.random() * 1000);
};

// Helper to generate a 4-digit numeric ID
const generateShortId = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const autoClaimOrders = async (uid: string, email: string | null, phone: string | null) => {
  try {
    const batch = writeBatch(db);
    let hasUpdates = false;

    // 1. Claim by Email
    if (email) {
      const emailQuery = query(
        collection(db, 'orders'),
        where('sellerId', '==', 'unknown'),
        where('sellerEmail', '==', email.trim().toLowerCase())
      );
      const emailSnap = await getDocs(emailQuery);
      for (const docSnap of emailSnap.docs) {
        batch.update(docSnap.ref, { sellerId: uid, updatedAt: serverTimestamp() });
        
        // Record order event
        const orderData = docSnap.data();
        await addDoc(collection(db, 'orderLogs'), {
          orderId: docSnap.id,
          userId: uid,
          action: 'ربط الحساب تلقائياً',
          previousStatus: orderData.status || '',
          newStatus: orderData.status || '',
          comment: 'تم ربط حساب البائع بالصفقة تلقائياً عند تسجيل الدخول (عبر البريد)',
          createdAt: serverTimestamp()
        });
        hasUpdates = true;
      }
    }

    // 2. Claim by Phone
    if (phone) {
      let cleanPhone = phone.trim();
      if (!cleanPhone.startsWith('+')) {
        cleanPhone = `+966${cleanPhone.replace(/^0/, '')}`;
      }

      const phoneQuery = query(
        collection(db, 'orders'),
        where('sellerId', '==', 'unknown'),
        where('sellerPhone', '==', cleanPhone)
      );
      const phoneSnap = await getDocs(phoneQuery);
      for (const docSnap of phoneSnap.docs) {
        batch.update(docSnap.ref, { sellerId: uid, updatedAt: serverTimestamp() });

        // Record order event
        const orderData = docSnap.data();
        await addDoc(collection(db, 'orderLogs'), {
          orderId: docSnap.id,
          userId: uid,
          action: 'ربط الحساب تلقائياً',
          previousStatus: orderData.status || '',
          newStatus: orderData.status || '',
          comment: 'تم ربط حساب البائع بالصفقة تلقائياً عند تسجيل الدخول (عبر الجوال)',
          createdAt: serverTimestamp()
        });
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      await batch.commit();
      console.log(`✅ [useAuth] Auto-claimed orders for user ${uid}`);
    }
  } catch (error) {
    console.error('❌ [useAuth] Error auto-claiming orders:', error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending2FA, setPending2FA] = useState(false);
  const [twoFactorVerified, setTwoFactorVerified] = useState(false);

  // Capture referral code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      sessionStorage.setItem('pendingReferral', ref);
    }
  }, []);

  useEffect(() => {
    // Safety timeout to prevent white screen hanging
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    let unsubscribeProfile: (() => void) | null = null;

    let autoClaimRun = false;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      
      // Cleanup previous profile listener if any
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(user);
      
      if (user) {
        console.log("Current user authenticated:", user.uid, user.email);
        const userRef = doc(db, 'users', user.uid);
        
        // Use onSnapshot for real-time profile updates
        unsubscribeProfile = onSnapshot(userRef, async (userSnap) => {
          if (!userSnap.exists()) {
            console.log("Profile not found, creating new profile for:", user.uid);
            const pendingRefCode = sessionStorage.getItem('pendingReferral');
            
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
              isAdmin: user.email === 'khyratfarmdates@gmail.com',
              trustLevel: 10,
              userShortId: generateShortId(),
              verificationStatus: 'none',
              referralCode: generateReferralCode(user.uid),
              referredBy: '',
              freeFeeTransactions: pendingRefCode ? 1 : 0,
              twoFactorEnabled: false,
              createdAt: serverTimestamp(),
            };

            // Process referral if exists
            if (pendingRefCode) {
              try {
                const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
                const q = query(collection(db, 'users'), where('referralCode', '==', pendingRefCode), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                  const inviter = snap.docs[0].data();
                  newProfile.referredBy = inviter.uid;
                  
                  const { addDoc } = await import('firebase/firestore');
                  await addDoc(collection(db, 'referrals'), {
                    inviterId: inviter.uid,
                    inviteeId: user.uid,
                    status: 'pending',
                    createdAt: serverTimestamp()
                  });
                }
              } catch (e) {
                console.error("Error processing referral:", e);
              }
              sessionStorage.removeItem('pendingReferral');
            }

            await setDoc(userRef, newProfile);
            setProfile(newProfile);
            sessionStorage.setItem('isFirstLogin', 'true');
            if (!autoClaimRun) {
              autoClaimRun = true;
              autoClaimOrders(user.uid, newProfile.email, newProfile.phoneNumber);
            }

            // Send welcome notification
            await sendNotification(
              user.uid,
              '👋 أهلاً بك في منصة عربون!',
              'نحن سعداء بانضمامك إلينا. يمكنك الآن تصفح الصفقات والبدء في التعامل بأمان تام.',
              'system',
              'normal',
              undefined,
              undefined,
              { label: 'استكمال الملف الشخصي', url: '/settings' }
            );
          } else {
            const data = userSnap.data() as UserProfile;
            // Ensure admin flag is set if email matches
            if (user.email === 'khyratfarmdates@gmail.com' && !data.isAdmin) {
              await updateDoc(userRef, { isAdmin: true });
            }
            // Add referral code if missing for old users
            if (!data.referralCode) {
              const code = generateReferralCode(user.uid);
              await updateDoc(userRef, { referralCode: code });
            }
            // Add short ID if missing for old users
            if (!data.userShortId) {
              const shortId = generateShortId();
              await updateDoc(userRef, { userShortId: shortId });
            }
            setProfile(data);
            if (!autoClaimRun) {
              autoClaimRun = true;
              autoClaimOrders(user.uid, data.email, data.phoneNumber);
            }
            
            // Check for 2FA requirement
            if (data.twoFactorEnabled && !twoFactorVerified) {
              setPending2FA(true);
            } else {
              setPending2FA(false);
            }
          }
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
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
      const isVisible = document.visibilityState === 'visible';
      updateDoc(userRef, { 
        isOnline: isVisible,
        lastSeen: serverTimestamp()
      }).catch(console.error);
    };

    const handleBeforeUnload = () => {
      // Use beacon or sync request if possible, but Firestore update is async. 
      // Most browsers allow some small async work here or it might fail, 
      // but it's worth a shot.
      updateDoc(userRef, { 
        isOnline: false,
        lastSeen: serverTimestamp()
      }).catch(console.error);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Periodically update lastSeen as a heartbeat
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateDoc(userRef, { lastSeen: serverTimestamp(), isOnline: true }).catch(console.error);
      }
    }, 15000); // Every 15 seconds for pin-point presence awareness
    
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
      sessionStorage.setItem('justLoggedIn', 'true');
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
      sessionStorage.setItem('justLoggedIn', 'true');
      if (result.user) {
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const pendingRefCode = sessionStorage.getItem('pendingReferral');
          const newProfile: UserProfile = {
            uid: result.user.uid,
            displayName: result.user.displayName || `مستخدم ${result.user.phoneNumber?.slice(-4) || ''}`,
            email: result.user.email || '',
            phoneNumber: result.user.phoneNumber || '',
            photoURL: result.user.photoURL || '',
            rating: 3,
            reviewsCount: 0,
            isVerified: false,
            isSeller: false,
            isAdmin: false,
            trustLevel: 10,
            userShortId: generateShortId(),
            verificationStatus: 'none',
            referralCode: generateReferralCode(result.user.uid),
            referredBy: '',
            freeFeeTransactions: pendingRefCode ? 1 : 0,
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);

          // Send welcome notification
          await sendNotification(
            result.user.uid,
            '👋 أهلاً بك في منصة عربون!',
            'نحن سعداء بانضمامك إلينا. يمكنك الآن تصفح الصفقات والبدء في التعامل بأمان تام.',
            'system',
            'normal',
            undefined,
            undefined,
            { label: 'استكمال الملف الشخصي', url: '/settings' }
          );
        } else {
          await updateDoc(userRef, { 
            phoneNumber: result.user.phoneNumber,
            isVerified: true 
          });
        }
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

  const submitVerification = async (data: { idNumber: string, phoneNumber: string, agreedToTerms: boolean }) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...data,
        verificationStatus: 'verified',
        isVerified: true,
        updatedAt: serverTimestamp()
      });
      
      await sendNotification(
        user.uid,
        '✅ تهانينا! اكتمل توثيق حسابك',
        'لقد تم التحقق من هويتك آلياً عبر نظام النفاذ الوطني. حسابك الآن يحمل شارة التوثيق ويمكنك استخدام كافة مميزات المنصة.',
        'system',
        'urgent'
      );

      setProfile(prev => prev ? { ...prev, ...data, verificationStatus: 'verified', isVerified: true } : null);
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

  const toggle2FA = async (enabled: boolean) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { twoFactorEnabled: enabled });
      setProfile(prev => prev ? { ...prev, twoFactorEnabled: enabled } : null);
    } catch (err) {
      console.error('Error toggling 2FA:', err);
      setError('فشل تعديل إعدادات التحقق بخطوتين');
    }
  };

  const verify2FA = async (confirmationResult: ConfirmationResult, code: string) => {
    try {
      await confirmationResult.confirm(code);
      setTwoFactorVerified(true);
      setPending2FA(false);
    } catch (err: any) {
      console.error('2FA Verification Error:', err);
      setError('كود التحقق غير صحيح');
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      error, 
      pending2FA,
      login, 
      logout, 
      sendOTP, 
      verifyOTP, 
      verify2FA,
      updateUserPhone,
      toggle2FA,
      submitVerification,
      clearError,
      setProfile,
      setPending2FA
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
