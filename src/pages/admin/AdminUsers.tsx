import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { UserProfile, Order, OrderStatus } from '../../types';
import { 
  ShieldCheck, Search, Star, UserX, UserCheck, ExternalLink, Clock, AlertCircle, Ban, 
  LayoutGrid, List, Table as TableIcon, Wallet, X, FileText, Calendar, 
  User, Mail, Smartphone, Activity, CheckCircle2, ArrowUpRight, ArrowDownLeft, Settings, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendNotification } from '../../lib/notificationService';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const AdminUsers: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'buyers' | 'sellers' | 'new' | 'old'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'compact'>('table');
  const [selectedUserForInspection, setSelectedUserForInspection] = useState<UserProfile | null>(null);
  const [inspectedOrders, setInspectedOrders] = useState<Order[]>([]);
  const [inspectedTransactions, setInspectedTransactions] = useState<any[]>([]);
  const [loadingInspectionData, setLoadingInspectionData] = useState(false);
  const [inspectionActiveTab, setInspectionActiveTab] = useState<'orders' | 'transactions' | 'actions'>('orders');
  const [balanceAdjustAmount, setBalanceAdjustAmount] = useState<string>('');
  const [balanceAdjustReason, setBalanceAdjustReason] = useState<string>('');
  const [adjustingBalance, setAdjustingBalance] = useState(false);

  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [showSupportOnBlock, setShowSupportOnBlock] = useState(true);

  const handleAdjustBalance = () => {};

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
                  <th className="px-6 py-4">رقم المعرف / الهوية</th>
                  <th className="px-6 py-4">المستخدم</th>
                  <th className="px-6 py-4">المكانة</th>
                  <th className="px-6 py-4">حالة التوثيق</th>
                  <th className="px-6 py-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map(user => (
                  <tr 
                    key={user.uid} 
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer group/row"
                    onClick={() => navigate(`/admin/users/${user.uid}`)}
                  >
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-1">
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-mono font-black text-[10px] w-fit">
                             #{user.userShortId || '----'}
                          </span>
                          {user.idNumber && (
                             <span className="text-[9px] font-bold text-gray-400 tracking-wider">ID: {user.idNumber}</span>
                          )}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={user.photoURL} className="w-10 h-10 rounded-xl object-cover ring-2 ring-gray-50 group-hover/row:ring-blue-100 transition-all shadow-sm" />
                        <div>
                          <div className="flex items-center gap-1.5">
                             <p className="font-bold text-gray-900 group-hover/row:text-blue-600 transition-colors uppercase">{user.displayName}</p>
                             <div className="text-gray-300 group-hover/row:text-blue-600 transition-colors">
                                <ExternalLink className="w-3 h-3" />
                             </div>
                          </div>
                          <p className="text-[10px] text-gray-400 font-medium tracking-tight">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
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
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
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
                <div onClick={() => navigate(`/admin/users/${user.uid}`)} className="flex items-center gap-3 group/user cursor-pointer">
                  <div className="relative">
                    <img src={user.photoURL} className="w-14 h-14 rounded-2xl object-cover ring-4 ring-gray-50 group-hover/user:ring-blue-100 transition-all" />
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
                    <h3 className="font-black text-gray-900 group-hover/user:text-blue-600 transition-colors">{user.displayName}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{user.email}</p>
                  </div>
                </div>
                <button onClick={() => navigate(`/admin/users/${user.uid}`)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                  <ExternalLink className="w-4 h-4" />
                </button>
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
              className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between group h-14 hover:border-blue-200 transition-all shadow-sm hover:shadow-md"
            >
              <div onClick={() => navigate(`/admin/users/${user.uid}`)} className="flex items-center gap-3 group/user flex-1 cursor-pointer">
                <div className="bg-gray-100 text-gray-400 w-8 h-8 flex items-center justify-center rounded-lg text-[9px] font-black group-hover/user:bg-blue-50 group-hover/user:text-blue-600 transition-all">
                   #{user.userShortId?.slice(-2)}
                </div>
                <img src={user.photoURL} className="w-8 h-8 rounded-lg object-cover" />
                <div>
                  <p className="text-xs font-black text-gray-900 group-hover/user:text-blue-600 transition-colors">{user.displayName}</p>
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
      {/* User Inspection Modal */}
      {false && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-end p-0 md:p-4 text-right" dir="rtl">
           <motion.div 
             initial={{ x: '100%' }}
             animate={{ x: 0 }}
             exit={{ x: '100%' }}
             className="bg-white dark:bg-gray-950 w-full md:max-w-4xl h-full md:h-[95vh] rounded-none md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border-l border-gray-100 dark:border-gray-900"
           >
              {/* Header */}
              <div className="p-6 md:p-8 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                 <div className="flex items-center gap-4 text-right">
                    <img 
                      src={selectedUserForInspection.photoURL} 
                      className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white dark:ring-gray-800 shadow-sm"
                      alt=""
                    />
                    <div className="text-right">
                       <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase">{selectedUserForInspection.displayName}</h3>
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-mono px-2 py-0.5 rounded-lg font-black leading-none">
                             #{selectedUserForInspection.userShortId || '---'}
                          </span>
                       </div>
                       <p className="text-sm text-gray-400 dark:text-gray-500 font-medium font-mono mt-0.5">{selectedUserForInspection.email}</p>
                    </div>
                 </div>
                 
                 <button 
                   onClick={() => setSelectedUserForInspection(null)}
                   className="p-3 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all"
                 >
                    <X className="w-5 h-5" />
                 </button>
              </div>

              {/* Quick Info Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/40 divide-x divide-x-reverse divide-gray-100 dark:divide-gray-905">
                 <div className="p-4 flex flex-col gap-1 text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">تاريخ الانضمام</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                       {selectedUserForInspection.createdAt ? new Date(selectedUserForInspection.createdAt.toDate()).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'غير متوفر'}
                    </span>
                 </div>
                 <div className="p-4 flex flex-col gap-1 text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">مستوى الثقة</span>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">%{selectedUserForInspection.trustLevel || 10}</span>
                       <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${selectedUserForInspection.trustLevel || 10}%` }}></div>
                       </div>
                    </div>
                 </div>
                 <div className="p-4 flex flex-col gap-1 text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">رصيد المحفظة الاسمي</span>
                    <span className="font-black text-sm text-green-600 dark:text-green-400 font-mono italic">
                       {(selectedUserForInspection.balance || 0).toLocaleString()} ر.س
                    </span>
                 </div>
                 <div className="p-4 flex flex-col gap-1 text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">حالة التوثيق الوطني</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       {selectedUserForInspection.verificationStatus === 'verified' ? (
                          <span className="flex items-center gap-1 text-[9px] font-black text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-lg border border-green-100 dark:border-green-900/30">
                             <CheckCircle2 className="w-2.5 h-2.5" /> موثق (أبشر)
                          </span>
                       ) : selectedUserForInspection.verificationStatus === 'pending' ? (
                          <span className="flex items-center gap-1 text-[9px] font-black text-orange-600 bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded-lg border border-orange-100 dark:border-orange-900/30">
                             <Clock className="w-2.5 h-2.5" /> قيد المراجعة
                          </span>
                       ) : (
                          <span className="flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-900/30">
                             <AlertCircle className="w-2.5 h-2.5" /> غير موثق
                          </span>
                       )}
                       {selectedUserForInspection.idNumber && (
                          <span className="text-[9px] font-mono font-bold text-gray-400">{selectedUserForInspection.idNumber}</span>
                       )}
                    </div>
                 </div>
              </div>

              {/* Tabs Navbar */}
              <div className="flex border-b border-gray-100 dark:border-gray-900 bg-white dark:bg-gray-950 px-6 gap-6">
                 {[
                   { id: 'orders', label: '📦 الطلبات والصفقات', count: inspectedOrders.length },
                   { id: 'transactions', label: '💳 العمليات المالية', count: inspectedTransactions.length },
                   { id: 'actions', label: '⚙️ خيارات الإدارة واستجابة الحساب' }
                 ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setInspectionActiveTab(tab.id as any)}
                      className={`py-4 font-black text-xs transition-all relative ${
                        inspectionActiveTab === tab.id 
                          ? 'text-blue-600 border-b-2 border-blue-600' 
                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                      }`}
                    >
                       <div className="flex items-center gap-2">
                          <span>{tab.label}</span>
                          {tab.count !== undefined && (
                             <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                               inspectionActiveTab === tab.id ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 dark:bg-gray-900 text-gray-500'
                             }`}>
                                {tab.count}
                             </span>
                          )}
                       </div>
                    </button>
                 ))}
              </div>

              {/* Dynamic Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50 dark:bg-[#090d16] space-y-6">
                 {loadingInspectionData ? (
                    <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
                       <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                       <span className="text-xs font-bold">جاري تحميل البيانات المباشرة للمستند...</span>
                    </div>
                 ) : inspectionActiveTab === 'orders' ? (
                    <div className="space-y-4 text-right">
                       {inspectedOrders.length === 0 ? (
                          <div className="bg-white dark:bg-gray-950 p-10 rounded-3xl border border-gray-100 dark:border-gray-900 text-center text-gray-400 font-bold text-xs">
                             <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-300" />
                             <p>لا يوجد أي طلبات أو تعاملات مسجلة لهذا المستخدم</p>
                          </div>
                       ) : (
                          inspectedOrders.map(order => {
                             const isBuyer = order.buyerId === selectedUserForInspection.uid;
                             return (
                                <div 
                                  key={order.id}
                                  className="bg-white dark:bg-gray-950 rounded-2xl p-5 border border-gray-100 dark:border-gray-900 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-100 dark:hover:border-blue-900/30 transition-all cursor-pointer text-right"
                                  onClick={() => {
                                     setSelectedUserForInspection(null);
                                     navigate(`/order/${order.id}`);
                                  }}
                                >
                                   <div className="flex items-center gap-3.5 text-right">
                                      <div className={`p-3 rounded-xl ${isBuyer ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'}`}>
                                         {isBuyer ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                                      </div>
                                      <div className="text-right">
                                         <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white">{order.title || 'عرض شراء صفقات تمور'}</p>
                                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${
                                               isBuyer ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                               {isBuyer ? 'مشتري' : 'بائع ومورد'}
                                            </span>
                                         </div>
                                         <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold mt-1">
                                            <span className="font-mono">ID: {order.id?.slice(0, 8)}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                               <Calendar className="w-3 h-3" />
                                               {order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) : '---'}
                                            </span>
                                         </div>
                                      </div>
                                   </div>

                                   <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-none pt-2 md:pt-0 border-gray-50">
                                      <div className="text-right">
                                         <p className="text-[10px] text-gray-400 font-bold">المبلغ المتفق عليه</p>
                                         <p className="font-black text-df text-gray-900 dark:text-white font-mono italic">{(order.price || order.totalPrice || 0).toLocaleString()} ر.س</p>
                                      </div>
                                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                         order.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/20 dark:border-green-900/30' :
                                         order.status === 'active' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30' :
                                         order.status === 'cancelled' ? 'bg-red-50 text-red-610 border-red-100 dark:bg-red-950/20 dark:border-red-900/30' :
                                         'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30'
                                      }`}>
                                         {order.status === 'completed' ? 'مكتمل' : 
                                          order.status === 'active' ? 'نشط / قيد التنفيذ' : 
                                          order.status === 'cancelled' ? 'ملغي' : 
                                          order.status === 'disputed' ? 'نزاع مفتوح' : 'بانتظار اتمام الدفعة'}
                                      </span>
                                   </div>
                                </div>
                             )
                          })
                       )}
                    </div>
                 ) : inspectionActiveTab === 'transactions' ? (
                    <div className="space-y-4 text-right">
                       {inspectedTransactions.length === 0 ? (
                          <div className="bg-white dark:bg-gray-950 p-10 rounded-3xl border border-gray-100 dark:border-gray-900 text-center text-gray-400 font-bold text-xs">
                             <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-300" />
                             <p>لا يوجد أي حركات مالية مسجلة في محفظة المستخدم</p>
                          </div>
                       ) : (
                          inspectedTransactions.map(tx => {
                             const isDeposit = tx.type === 'deposit';
                             return (
                                <div 
                                  key={tx.id}
                                  className="bg-white dark:bg-gray-950 rounded-2xl p-5 border border-gray-100 dark:border-gray-900 shadow-sm flex justify-between items-center text-right"
                                >
                                   <div className="flex items-center gap-3">
                                      <div className={`p-2.5 rounded-xl ${isDeposit ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'}`}>
                                         {isDeposit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                      </div>
                                      <div className="text-right">
                                         <p className="font-black text-xs text-gray-900 dark:text-white">{tx.description || (isDeposit ? 'إيداع رصيد بالمحفظة' : 'سحب رصيد مالي خارج المنصة')}</p>
                                         <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold mt-1">
                                            <span className="font-mono">ID: {tx.id?.slice(0, 8)}</span>
                                            <span>•</span>
                                            <span>{tx.date ? new Date(tx.date).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---'}</span>
                                         </div>
                                      </div>
                                   </div>

                                   <div className="text-left font-sans">
                                      <p className={`font-black text-sm font-mono italic ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                                         {isDeposit ? '+' : '-'}{Number(tx.amount || 0).toLocaleString()} ر.س
                                      </p>
                                      <span className="text-[8px] font-black uppercase text-green-500 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 px-1.5 py-0.5 rounded-md">مكتمل وموثق</span>
                                   </div>
                                </div>
                             )
                          })
                       )}
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-right">
                       {/* Balance Modifier Form */}
                       <div className="bg-white dark:bg-gray-950 p-6 rounded-3xl border border-gray-100 dark:border-gray-900 shadow-sm space-y-4 text-right">
                          <div className="flex items-center gap-3 mb-2 text-right">
                             <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
                                <Wallet className="w-5 h-5" />
                             </div>
                             <div className="text-right">
                                <h4 className="font-black text-sm text-gray-900 dark:text-white">تعديل رصيد المحفظة</h4>
                                <p className="text-[10px] text-gray-400 font-bold">شحن أو خصم مالي من محفظة العميل الحالية والتوثيق فورياً في السجلات المالية</p>
                             </div>
                          </div>

                          <div className="space-y-3">
                             <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 text-right">المبلغ المراد تعديله في المحفظة (ر.س)</label>
                                <input 
                                  type="number"
                                  placeholder="مثال: 500 للإيداع، أو -500 للخصم..."
                                  value={balanceAdjustAmount}
                                  onChange={e => setBalanceAdjustAmount(e.target.value)}
                                  className="w-full bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3.5 text-xs font-black focus:bg-white outline-none transition-all text-right font-mono"
                                />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 text-right">سبب وغرض تعديل الرصيد</label>
                                <textarea 
                                  placeholder="مثال: تعويض مالي من تسوية نزاع بخصوص شحنة تمور خلاص مكسورة..."
                                  value={balanceAdjustReason}
                                  onChange={e => setBalanceAdjustReason(e.target.value)}
                                  rows={2}
                                  className="w-full bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-xl p-3 text-xs font-medium focus:bg-white outline-none transition-all text-right"
                                />
                             </div>

                             <button 
                               onClick={handleAdjustBalance}
                               disabled={adjustingBalance || !balanceAdjustAmount}
                               className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-blue-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
                             >
                                {adjustingBalance ? (
                                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                   'حفظ وتطبيق العملية المالية'
                                )}
                             </button>
                          </div>
                       </div>

                       {/* Direct Profile Administrative Controls */}
                       <div className="bg-white dark:bg-gray-950 p-6 rounded-3xl border border-gray-100 dark:border-gray-900 shadow-sm space-y-4 text-right">
                          <div className="flex items-center gap-3 mb-2 content-end">
                             <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
                                <Settings className="w-5 h-5" />
                             </div>
                             <div className="text-right">
                                <h4 className="font-black text-sm text-gray-900 dark:text-white">التحكم في امتيازات وحالة العميل</h4>
                                <p className="text-[10px] text-gray-400 font-bold">ترقية لحساب إداري، تفعيل خيار العضوية المتميزة، أو حظر وتعطيل الدخول للمنصة</p>
                             </div>
                          </div>

                          <div className="space-y-3 pt-2 text-right">
                             {/* Promote/Demote Admin */}
                             <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <div className="text-right">
                                   <p className="text-xs font-black text-gray-900 dark:text-white">صلاحيات الإدارة (مدير النظام)</p>
                                   <p className="text-[9px] text-gray-400">إعطاء صلاحية الوصول الكاملة للوحات التحكم الإدارية</p>
                                </div>
                                <button 
                                  onClick={async () => {
                                     await handleToggleAdmin(selectedUserForInspection.uid, selectedUserForInspection.isAdmin);
                                     setSelectedUserForInspection(prev => prev ? { ...prev, isAdmin: !prev.isAdmin } : null);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black transition-all ${
                                     selectedUserForInspection.isAdmin 
                                       ? 'bg-purple-600 text-white shadow-md shadow-purple-100 dark:shadow-none' 
                                       : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 border border-gray-100 dark:border-gray-700 shadow-sm'
                                  }`}
                                >
                                   {selectedUserForInspection.isAdmin ? 'مدير نظام حالياً' : 'ترقية لمدير'}
                                </button>
                             </div>

                             {/* Featured Toggle */}
                             <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <div className="text-right">
                                   <p className="text-xs font-black text-gray-900 dark:text-white">تاجر متميز (Elite Seller)</p>
                                   <p className="text-[9px] text-gray-400">منح تاج التميز في المنصة وإبراز الخدمات للمشترين</p>
                                </div>
                                <button 
                                  onClick={async () => {
                                     await handleToggleFeatured(selectedUserForInspection.uid, selectedUserForInspection.isFeatured);
                                     setSelectedUserForInspection(prev => prev ? { ...prev, isFeatured: !prev.isFeatured } : null);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black transition-all ${
                                     selectedUserForInspection.isFeatured 
                                       ? 'bg-orange-600 text-white shadow-md shadow-orange-100 dark:shadow-none' 
                                       : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 border border-gray-100 dark:border-gray-700 shadow-sm'
                                  }`}
                                >
                                   {selectedUserForInspection.isFeatured ? 'متميز حالياً' : 'تفعيل التميز'}
                                </button>
                             </div>

                             {/* Account Lock Toggle */}
                             <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <div className="text-right">
                                   <p className="text-xs font-black text-gray-900 dark:text-white">عقوبة حظر وتجميد الحساب</p>
                                   <p className="text-[9px] text-gray-400">إيقاف فوري لدخول المستخدم والتداول بالمنصة</p>
                                </div>
                                <button 
                                  onClick={async () => {
                                     await handleToggleBlock(selectedUserForInspection.uid, selectedUserForInspection.isBlocked);
                                     setSelectedUserForInspection(prev => prev ? { ...prev, isBlocked: !prev.isBlocked } : null);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black transition-all ${
                                     selectedUserForInspection.isBlocked 
                                       ? 'bg-red-600 text-white shadow-md shadow-red-100' 
                                       : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 shadow-sm'
                                  }`}
                                >
                                   {selectedUserForInspection.isBlocked ? 'مجمّد ومحظور' : 'حظر الحساب'}
                                </button>
                             </div>

                             {/* Verification status toggle */}
                             <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <div className="text-right">
                                   <p className="text-xs font-black text-gray-900 dark:text-white">حالة التوثيق (أبشر / نفاذ)</p>
                                   <p className="text-[9px] text-gray-400">حالة التوثيق من البيانات الوطنية</p>
                                </div>
                                <div className="flex gap-1.5 justify-end">
                                   {selectedUserForInspection.verificationStatus !== 'verified' && (
                                      <button 
                                        onClick={async () => {
                                           await handleVerify(selectedUserForInspection.uid, true);
                                           setSelectedUserForInspection(prev => prev ? { ...prev, verificationStatus: 'verified', isVerified: true } : null);
                                        }}
                                        className="px-2.5 py-1.5 bg-green-600 text-white rounded-xl text-[9px] font-black"
                                      >
                                         توثيق الحساب
                                      </button>
                                   )}
                                   {selectedUserForInspection.verificationStatus !== 'rejected' && (
                                      <button 
                                        onClick={() => setRejectingUserId(selectedUserForInspection.uid)}
                                        className="px-2.5 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-xl text-[9px] font-black border border-red-200"
                                      >
                                         رفض / إلغاء
                                      </button>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
};

export { AdminUsers as default }; // Ensure export matches expected patterns if necessary, but naming is consistent.

