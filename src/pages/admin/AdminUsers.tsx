import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { UserProfile } from '../../types';
import { ShieldCheck, Search, Star, UserX, UserCheck, ExternalLink, Clock, AlertCircle, Ban, LayoutGrid, List, Table as TableIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { sendNotification } from '../../lib/notificationService';
import { Link } from 'react-router-dom';

export const AdminUsers: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'buyers' | 'sellers' | 'new' | 'old'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'compact'>('table');
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [showSupportOnBlock, setShowSupportOnBlock] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(allUsers);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
    return () => unsubscribe();
  }, [isAdmin]);

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
        await sendNotification(
          uid, 
          '✅ تهانينا! حسابك الآن موثق بالكامل', 
          'لقد تم التحقق من هويتك بنجاح. يمكنك الآن بدء تداول كميات كبيرة واستخدام كافة مميزات المنصة الاحترافية.', 
          'system', 
          'urgent',
          undefined,
          undefined,
          { label: 'ابدأ تداول الآن', url: '/dashboard' }
        );
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
        showSupportOnBlock: showSupportOnBlock,
        updatedAt: serverTimestamp() 
      });
      setBlockingUserId(null);
      setBlockReasonInput('');
      setShowSupportOnBlock(true);
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
    const term = searchTerm.toLowerCase();
    const matchesSearch = u.displayName?.toLowerCase().includes(term) || 
                          u.email?.toLowerCase().includes(term) ||
                          u.userShortId?.includes(term);
    
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
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <ShieldCheck className="w-7 h-7" />
           </div>
           <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight italic">إدارة <span className="text-blue-600">المستخدمين</span></h2>
              <div className="flex items-center gap-2 mt-1">
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                 <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest leading-none">عرض {filteredUsers.length} عميل نشط حالياً</p>
              </div>
           </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-4 w-full xl:w-auto items-stretch lg:items-center">
          <div className="relative group flex-1 lg:flex-initial">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text"
              placeholder="البحث بالاسم، البريد أو رقم المعرف..."
              className="pr-12 pl-4 py-3.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all text-xs font-black w-full xl:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="flex bg-gray-50 border border-gray-100 p-1.5 rounded-2xl shadow-inner overflow-x-auto no-scrollbar flex-1">
               {[
                 { id: 'all', label: 'الكل', count: stats.all },
                 { id: 'sellers', label: 'البائعين', count: stats.sellers },
                 { id: 'buyers', label: 'المشترين', count: stats.buyers },
                 { id: 'new', label: 'جديد', count: stats.new },
                 { id: 'old', label: 'قديم', count: stats.old }
               ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id as any)}
                    className={`flex-1 min-w-[70px] px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all relative ${
                      activeFilter === f.id 
                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-100' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                       <span>{f.label}</span>
                       <span className={`text-[8px] font-bold ${activeFilter === f.id ? 'text-blue-400' : 'text-gray-300'}`}>
                          {f.count}
                       </span>
                    </div>
                  </button>
               ))}
            </div>

            <div className="flex bg-white border border-gray-100 p-1.5 rounded-2xl shadow-sm shrink-0">
              {[
                { id: 'table', icon: TableIcon, label: 'جدول' },
                { id: 'grid', icon: LayoutGrid, label: 'بطاقات' },
                { id: 'compact', icon: List, label: 'قائمة' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setViewMode(m.id as any)}
                  className={`p-2.5 rounded-xl transition-all ${
                    viewMode === m.id ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={m.label}
                >
                  <m.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[9px] font-bold uppercase tracking-widest border-b">
                  <th className="px-6 py-4">رقم المعرف</th>
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
                       <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-mono font-black text-[10px]">
                          #{user.userShortId || '----'}
                       </span>
                    </td>
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
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
            <motion.div 
              layout
              key={user.uid}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm transition-all hover:shadow-xl group relative overflow-hidden"
            >
              {user.isBlocked && <div className="absolute top-0 right-0 w-2 h-full bg-red-600" />}
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={user.photoURL} className="w-14 h-14 rounded-2xl object-cover ring-4 ring-gray-50" />
                    <div className="absolute -top-2 -right-2 bg-gray-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg shadow-lg">
                       #{user.userShortId}
                    </div>
                    {user.verificationStatus === 'verified' && (
                      <div className="absolute -bottom-1 -left-1 bg-blue-600 text-white p-1 rounded-lg">
                        <ShieldCheck className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{user.displayName}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{user.email}</p>
                  </div>
                </div>
                <Link to={`/seller/${user.uid}`} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                 <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${
                   user.verificationStatus === 'verified' ? 'bg-green-50 text-green-600 border-green-100' :
                   user.verificationStatus === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                   'bg-red-50 text-red-600 border-red-100'
                 }`}>
                   {user.verificationStatus === 'verified' ? 'موثق' : 
                    user.verificationStatus === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
                 </span>
                 {user.isFeatured && (
                   <span className="px-2 py-1 bg-orange-50 text-orange-600 border border-orange-100 rounded-lg text-[8px] font-black uppercase">
                     متميز
                   </span>
                 )}
                 {user.isAdmin && (
                   <span className="px-2 py-1 bg-purple-50 text-purple-600 border border-purple-100 rounded-lg text-[8px] font-black uppercase">
                     مدير
                   </span>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                 <button 
                   onClick={() => handleToggleBlock(user.uid, user.isBlocked)}
                   className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${
                     user.isBlocked ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100'
                   }`}
                 >
                   {user.isBlocked ? 'إلغاء الحظر' : 'حظر'}
                 </button>
                 <button 
                   onClick={() => handleToggleFeatured(user.uid, user.isFeatured)}
                   className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${
                     user.isFeatured ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-orange-100 hover:text-orange-600 hover:border-orange-200'
                   }`}
                 >
                   {user.isFeatured ? 'إلغاء التميز' : 'تمييز'}
                 </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map(user => (
            <motion.div 
              layout
              key={user.uid}
              className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between group h-14"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 text-gray-400 w-8 h-8 flex items-center justify-center rounded-lg text-[9px] font-black">
                   #{user.userShortId?.slice(-2)}
                </div>
                <img src={user.photoURL} className="w-8 h-8 rounded-lg object-cover" />
                <div>
                  <p className="text-xs font-black text-gray-900">{user.displayName}</p>
                  <p className="text-[9px] text-gray-400 font-bold">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    {user.verificationStatus === 'verified' && <ShieldCheck className="w-3 h-3 text-blue-600" />}
                    {user.isFeatured && <Star className="w-3 h-3 text-orange-400 fill-current" />}
                    {user.isAdmin && <ShieldCheck className="w-3 h-3 text-purple-600" />}
                 </div>
                 
                 <div className="h-6 w-px bg-gray-100" />

                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleToggleBlock(user.uid, user.isBlocked)}
                      className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                        user.isBlocked ? 'bg-red-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                    {user.verificationStatus === 'pending' && (
                      <button 
                        onClick={() => handleVerify(user.uid, true)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                 </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

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

              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                 <span className="text-[10px] font-bold text-gray-700">إظهار أزرار التواصل للمستخدم؟</span>
                 <button 
                   onClick={() => setShowSupportOnBlock(!showSupportOnBlock)}
                   className={`w-10 h-6 rounded-full transition-all relative ${showSupportOnBlock ? 'bg-green-500' : 'bg-gray-300'}`}
                 >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showSupportOnBlock ? 'right-1' : 'right-5'}`}></div>
                 </button>
              </div>

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

