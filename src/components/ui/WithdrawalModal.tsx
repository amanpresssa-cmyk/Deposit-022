import React, { useState } from 'react';
import { X, CheckCircle2, Zap, Clock, AlertCircle, Building2, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export const WithdrawalModal: React.FC<Props> = ({ isOpen, onClose, profile }) => {
  const [loading, setLoading] = useState(false);
  const [withdrawalType, setWithdrawalType] = useState<'standard' | 'fast_track'>('standard');
  const [amount, setAmount] = useState<string>(profile.balance ? profile.balance.toString() : '');
  const [bankAccount, setBankAccount] = useState('');
  const [iban, setIban] = useState('SA');

  const availableBalance = profile.balance || 0;
  
  // Calculate fast-track fee (1%)
  const withdrawalAmount = parseFloat(amount) || 0;
  const fastTrackFee = withdrawalType === 'fast_track' ? withdrawalAmount * 0.01 : 0;
  const netAmount = withdrawalAmount - fastTrackFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawalAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح للتحويل');
      return;
    }
    if (withdrawalAmount > availableBalance) {
      toast.error('المبلغ المطلوب يتجاوز رصيدك المتاح');
      return;
    }
    if (iban.length < 24) {
      toast.error('يرجى إدخال رقم آيبان صحيح');
      return;
    }

    setLoading(true);
    try {
      // Create withdrawal request in Firestore
      await addDoc(collection(db, 'withdrawals'), {
        userId: profile.uid,
        userEmail: profile.email,
        userName: profile.displayName,
        amount: withdrawalAmount,
        netAmount: netAmount,
        fee: fastTrackFee,
        type: withdrawalType, // 'standard' or 'fast_track'
        status: 'pending',
        bankAccount,
        iban,
        createdAt: serverTimestamp()
      });

      // Deduct balance from user
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        balance: increment(-withdrawalAmount)
      });

      toast.success(withdrawalType === 'fast_track' ? 'تم طلب التحويل الفوري بنجاح! جاري معالجة التحويل' : 'تم استلام طلب التحويل بنجاح. قيد المعالجة (24-48 ساعة)');
      onClose();
    } catch (error) {
      console.error('Withdrawal Error:', error);
      toast.error('حدث خطأ أثناء معالجة الطلب');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
        dir="rtl"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">تحويل المستحقات</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Available Balance */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl flex justify-between items-center border border-gray-100 dark:border-gray-700">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">المستحقات القابلة للتحويل</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {availableBalance.toLocaleString()} <span className="text-xs">ر.س</span>
            </span>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-gray-700 dark:text-gray-300">المبلغ المراد تحويله</label>
            <input 
              type="number"
              required
              max={availableBalance}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold"
              placeholder="0.00"
            />
          </div>

          {/* Withdrawal Type Selection */}
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-700 dark:text-gray-300">طريقة التحويل</label>
            <div className="grid grid-cols-1 gap-3">
              <label 
                className={`relative flex items-start gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all ${withdrawalType === 'standard' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <input type="radio" name="withdrawType" className="sr-only" checked={withdrawalType === 'standard'} onChange={() => setWithdrawalType('standard')} />
                <div className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm">
                  <Clock className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-gray-900 dark:text-white">تحويل مجاني (عادي)</h3>
                    {withdrawalType === 'standard' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">يتم معالجة تحويل المبلغ لحسابك بناءً على سياسة وأوقات بوابة الدفع المعتمدة.</p>
                </div>
              </label>

              <label 
                className={`relative flex items-start gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all ${withdrawalType === 'fast_track' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <input type="radio" name="withdrawType" className="sr-only" checked={withdrawalType === 'fast_track'} onChange={() => setWithdrawalType('fast_track')} />
                <div className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm">
                  <Zap className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-gray-900 dark:text-white">التحويل الفوري (Fast-Track)</h3>
                    {withdrawalType === 'fast_track' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    رسوم خدمة <span className="font-bold text-red-500">1%</span>. سيتم تحويل المبلغ فوراً إلى حسابك البنكي دون انتظار!
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <h4 className="font-black text-sm flex items-center gap-2 text-gray-900 dark:text-white">
              <Building2 className="w-4 h-4 text-gray-400" />
              بيانات الحساب البنكي
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500">اسم صاحب الحساب</label>
                <input 
                  type="text" 
                  required
                  value={bankAccount}
                  onChange={e => setBankAccount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  placeholder="الاسم الثلاثي مطابق للبنك"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500">رقم الآيبان (IBAN)</label>
                <input 
                  type="text" 
                  required
                  dir="ltr"
                  value={iban}
                  onChange={e => setIban(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-left tracking-widest font-mono uppercase"
                  placeholder="SA0000000000000000000000"
                />
              </div>
            </div>
          </div>

          {withdrawalType === 'fast_track' && withdrawalAmount > 0 && (
            <div className="bg-blue-100/50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 text-sm font-medium">
              <div className="flex justify-between items-center text-blue-800 dark:text-blue-200 mb-1">
                <span>المبلغ المحول:</span>
                <span className="font-bold">{withdrawalAmount.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center text-red-600 dark:text-red-400 mb-2">
                <span>رسوم التحويل الفوري (1%):</span>
                <span className="font-bold">- {fastTrackFee.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between items-center text-gray-900 dark:text-white pt-2 border-t border-blue-200 dark:border-blue-800 font-black">
                <span>المبلغ الصافي المحول:</span>
                <span className="text-lg text-emerald-600 dark:text-emerald-400">{netAmount.toLocaleString()} ر.س</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || availableBalance <= 0 || withdrawalAmount <= 0}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black hover:bg-emerald-700 shadow-xl shadow-emerald-200/50 dark:shadow-emerald-900/20 disabled:opacity-50 transition-all flex justify-center items-center"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'تأكيد طلب التحويل'}
          </button>

        </form>
      </motion.div>
    </div>
  );
};
