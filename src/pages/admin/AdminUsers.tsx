import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { ShieldCheck, Search, Star, UserX, UserCheck, ExternalLink, Clock, AlertCircle, Ban } from 'lucide-react';
import { motion } from 'motion/react';
import { sendNotification } from '../../lib/notificationService';
import { Link } from 'react-router-dom';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'buyers' | 'sellers' | 'new' | 'old'>('all');
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState('');

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

  const handleBlockAction = async () => {
    if (!blockingUserId) return;
    try {
      await updateDoc(doc(db, 'users', blockingUserId), { 
        isBlocked: true, 
        blockReason: blockReasonInput,
        updatedAt: serverTimestamp() 
      });
      setBlockingUserId(null);
      setBlockReasonInput('');
    } catch (error) { console.error(error); }
  };

  const handleToggleBlock = async (uid: string, currentStatus: boolean | undefined) => {
    if (currentStatus) {
      // Unblock directly
      await updateDoc(doc(db, 'users', uid), { isBlocked: false, blockReason: null, updatedAt: serverTimestamp() });
    } else {
      // Show modal for reason
      setBlockingUserId(uid);
    }
  };

  const handleToggleAdmin = async (uid: string, currentStatus: boolean | undefined) => {
    if (!window.confirm(`هل أنت متأكد من ${currentStatus ? 'إلغاء صلاحيات المدير' : 'ترقية هذا المستخدم ليكون مديراً'}؟`)) return;
    try {
      await updateDoc(doc(db, 'users', uid), { 
        isAdmin: !currentStatus, 
        updatedAt: serverTimestamp() 
      });
      await sendNotification(uid, 'تحديث الصلاحيات', currentStatus ? 'تم إلغاء صلاحيات المدير من حسابك.' : 'لقد تم ترقيتك لتكون مديراً في منصة عربون، يرجى إعادة تسجيل الدخول لتفعيل الصلاحيات.', 'system', 'urgent');
    } catch (error) { console.error(error); }
  };

  const handleToggleFeatured = async (uid: string, currentStatus: boolean | undefined) => {
    await updateDoc(doc(db, 'users', uid), { isFeatured: !currentStatus, isEliteSeller: !currentStatus, updatedAt: serverTimestamp() });
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Logic for "New" (Registered in last 7 days)
    const isNew = u.createdAt && (Date.now() - u.createdAt.toDate().getTime()) < 7 * 24 * 60 * 60 * 1000;
    
    // Logic for "Old" (Total orders > 10)
    const totalOps = (u.completedOrdersCount || 0) + (u.totalSales || 0); // Combined metrics
    const isOld = totalOps > 10;

    switch (activeFilter) {
      case 'sellers': return u.isSeller === true && u.verificationStatus === 'verified';
      case 'buyers': return u.isSeller !== true;
      case 'new': return isNew;
      case 'old': return isOld;
      default: return true;
    }
  });

  const stats = {
    all: users.length,
    sellers: users.filter(u => u.isSeller && u.verificationStatus === 'verified').length,
    buyers: users.filter(u => !u.isSeller).length,
    new: users.filter(u => u.createdAt && (Date.now() - u.createdAt.toDate().getTime()) < 7 * 24 * 60 * 60 * 1000).length,
    old: users.filter(u => ((u.completedOrdersCount || 0) + (u.totalSales || 0)) > 10).length
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
        <div>
           <h2 className="text-xl font-black text-gray-900 tracking-tight italic">إدارة <span className="text-blue-600">المستخدمين</span></h2>
           <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest leading-none">عرض {filteredUsers.length} عميل في هذا القسم</p>
           </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text"
              placeholder="البحث بالاسم أو البريد..."
              className="pr-12 pl-4 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none transition-all text-xs font-black sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex bg-gray-950 p-1.5 rounded-xl shadow-lg">
             {[
               { id: 'all', label: 'الكل', count: stats.all },
               { id: 'sellers', label: 'البائعين الموثقين', count: stats.sellers },
               { id: 'buyers', label: 'المشترين', count: stats.buyers },
               { id: 'new', label: 'جديد (7 أيام)', count: stats.new },
               { id: 'old', label: 'قديم (+10 عمليات)', count: stats.old }
             ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id as any)}
                  className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all relative ${
                    activeFilter === f.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {f.label}
                  {activeFilter === f.id && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[7px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                       {f.count}
                    </span>
                  )}
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
                     <div className="flex flex-col gap-2">
                        <button 
                           onClick={() => handleToggleFeatured(user.uid, user.isFeatured)}
                           className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all border ${
                             user.isFeatured ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                           }`}
                        >
                           <Star className={`w-2.5 h-2.5 ${user.isFeatured ? 'fill-current' : ''}`} />
                           {user.isFeatured ? 'متميز' : 'تمييز'}
                        </button>
                        {user.isAdmin && (
                           <div className="flex items-center gap-1 text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              مدير نظام
                           </div>
                        )}
                     </div>
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
              <div className="flex flex-wrap gap-2 mb-2">
                 {[
                   'صورة الهوية غير واضحة',
                   'البيانات لا تطابق الصورة',
                   'الهوية منتهية الصلاحية',
                   'يرجى إرفاق فيديو توثيق',
                 ].map(reason => (
                    <button
                      key={reason}
                      onClick={() => setRejectionReason(reason)}
                      className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black hover:bg-red-100 transition-all border border-red-100"
                    >
                      {reason}
                    </button>
                 ))}
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
      {/* Blocking Modal */}
      {blockingUserId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
           >
              <div className="text-center">
                 <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-200">
                    <Ban className="w-6 h-6" />
                 </div>
                 <h3 className="text-lg font-black text-gray-900">تأكيد حظر المستخدم</h3>
                 <p className="text-gray-400 font-medium text-xs mt-1">سيتم منع المستخدم من الدخول للمنصة. يرجى توضيح السبب.</p>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                 {[
                   'محاولة احتيال',
                   'مخالفة شروط الاستخدام',
                   'سلوك غير لائق',
                   'حساب وهمي',
                   'تكرار الشكاوى',
                 ].map(reason => (
                    <button
                      key={reason}
                      onClick={() => setBlockReasonInput(reason)}
                      className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black hover:bg-red-100 transition-all border border-red-100"
                    >
                      {reason}
                    </button>
                 ))}
              </div>
              <textarea 
                value={blockReasonInput}
                onChange={(e) => setBlockReasonInput(e.target.value)}
                rows={3}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 focus:ring-2 focus:ring-red-100 outline-none transition-all text-xs font-medium text-right"
                placeholder="مثال: مخالفة شروط الاستخدام، محاولة احتيال..."
              />
              <div className="flex gap-3">
                 <button 
                   onClick={handleBlockAction}
                   disabled={!blockReasonInput.trim()}
                   className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-xs shadow-lg shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50"
                 >
                   تأكيد الحظر
                 </button>
                 <button 
                   onClick={() => setBlockingUserId(null)}
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

export { AdminUsers as default }; // Ensure export matches expected patterns if necessary, but naming is consistent.

