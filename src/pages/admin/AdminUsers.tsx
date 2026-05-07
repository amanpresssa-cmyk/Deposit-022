import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { ShieldCheck, Search, Star, UserX, UserCheck, ExternalLink, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { sendNotification } from '../../lib/notificationService';
import { Link } from 'react-router-dom';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(allUsers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleVerify = async (uid: string, approve: boolean, reason?: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      if (approve) {
        await updateDoc(userRef, {
          verificationStatus: 'verified',
          isVerified: true,
          rating: 4,
          trustLevel: 80
        });
        await sendNotification(uid, 'تهانينا! تم توثيق حسابك', 'تم مراجعة بياناتك بنجاح وأصبح حسابك الآن موثقاً في منصة عربون.', 'system', 'normal');
      } else {
        await updateDoc(userRef, {
          verificationStatus: 'rejected',
          isVerified: false,
          verificationRejectionReason: reason || null
        });
        await sendNotification(uid, 'تنبيه: تحديث طلب التوثيق', `نعتذر، لم يتم قبول طلب التوثيق: ${reason}`, 'system', 'urgent');
        setRejectingUserId(null);
        setRejectionReason('');
      }
    } catch (error) { console.error(error); }
  };

  const handleToggleBlock = async (uid: string, currentStatus: boolean | undefined) => {
    await updateDoc(doc(db, 'users', uid), { isBlocked: !currentStatus, updatedAt: serverTimestamp() });
  };

  const handleToggleFeatured = async (uid: string, currentStatus: boolean | undefined) => {
    await updateDoc(doc(db, 'users', uid), { isFeatured: !currentStatus, isEliteSeller: !currentStatus, updatedAt: serverTimestamp() });
  };

  const filteredUsers = users.filter(u => {
    const matchesFilter = filter === 'all' || u.verificationStatus === filter;
    const matchesSearch = u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div>
           <h2 className="text-lg font-black text-gray-900">إدارة المستخدمين</h2>
           <p className="text-gray-400 font-medium font-mono text-[10px]">عرض {filteredUsers.length} مستخدم نشط</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="بحث بالاسم أو البريد..."
              className="pr-10 pl-4 py-2 bg-gray-50 border border-transparent focus:border-blue-500 rounded-lg outline-none transition-all text-xs font-medium sm:w-56"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl">
             {['all', 'pending', 'verified', 'rejected'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all ${
                    filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f === 'all' ? 'الكل' : f === 'pending' ? 'مراجعة' : f === 'verified' ? 'موثق' : 'مرفوض'}
                </button>
             ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[9px] font-bold uppercase tracking-widest border-b">
                <th className="px-6 py-4">المستخدم</th>
                <th className="px-6 py-4">المكانة</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(user => (
                <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={user.photoURL} className="w-10 h-10 rounded-xl object-cover ring-2 ring-gray-50" />
                      <div>
                        <div className="flex items-center gap-1.5">
                           <p className="font-bold text-gray-900">{user.displayName}</p>
                           <Link to={`/seller/${user.uid}`} className="text-gray-300 hover:text-blue-600 transition-colors">
                              <ExternalLink className="w-3 h-3" />
                           </Link>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <button 
                        onClick={() => handleToggleFeatured(user.uid, user.isFeatured)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all border ${
                          user.isFeatured ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                        }`}
                     >
                        <Star className={`w-2.5 h-2.5 ${user.isFeatured ? 'fill-current' : ''}`} />
                        {user.isFeatured ? 'متميز' : 'تمييز'}
                     </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase border ${
                      user.verificationStatus === 'verified' ? 'bg-green-50 text-green-600 border-green-100' :
                      user.verificationStatus === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {user.verificationStatus === 'verified' ? 'موثق' : 
                       user.verificationStatus === 'pending' ? 'بانتظار المراجعة' : 'مرفوض'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       {user.verificationStatus === 'pending' && (
                         <>
                           <button 
                             onClick={() => handleVerify(user.uid, true)}
                             className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all border border-green-100"
                           >
                             <UserCheck className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => setRejectingUserId(user.uid)}
                             className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all border border-red-100"
                           >
                             <UserX className="w-4 h-4" />
                           </button>
                         </>
                       )}
                       <button 
                          onClick={() => handleToggleBlock(user.uid, user.isBlocked)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[9px] border transition-all ${
                            user.isBlocked ? 'bg-red-600 text-white border-red-600' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                          }`}
                       >
                          {user.isBlocked ? 'فك الحظر' : 'حظر الحساب'}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectingUserId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
           >
              <div className="text-center">
                 <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6" />
                 </div>
                 <h3 className="text-lg font-black text-gray-900">سبب رفض التوثيق</h3>
                 <p className="text-gray-400 font-medium text-xs mt-1">يرجى كتابة سبب واضح ليظهر للمستخدم</p>
              </div>
              <textarea 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 focus:ring-2 focus:ring-red-100 outline-none transition-all text-xs font-medium text-right"
                placeholder="مثال: صورة الهوية غير واضحة..."
              />
              <div className="flex gap-3">
                 <button 
                   onClick={() => handleVerify(rejectingUserId, false, rejectionReason)}
                   className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-xs shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
                 >
                   تأكيد الرفض
                 </button>
                 <button 
                   onClick={() => setRejectingUserId(null)}
                   className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-200 transition-all"
                 >
                   إلغاء
                 </button>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
};

const AlertCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
