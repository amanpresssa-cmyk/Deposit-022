import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../types';
import { ShieldCheck, UserCheck, UserX, Clock, Search, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Only fetch if admin
    if (!profile?.isAdmin && profile?.email !== 'khyratfarmdates@gmail.com') return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleVerify = async (uid: string, approve: boolean) => {
    try {
      const userRef = doc(db, 'users', uid);
      if (approve) {
        await updateDoc(userRef, {
          verificationStatus: 'verified',
          isVerified: true,
          trustLevel: 80 // Jump to high trust upon manual verification
        });
      } else {
        await updateDoc(userRef, {
          verificationStatus: 'rejected',
          isVerified: false
        });
      }
    } catch (error) {
      console.error("Error updating user verification:", error);
    }
  };

  if (!profile?.isAdmin && profile?.email !== 'khyratfarmdates@gmail.com') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-red-50 p-12 rounded-[3rem] border border-red-100 max-w-md">
           <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
           <h2 className="text-2xl font-black text-red-900 mb-4">الدخول غير مصرح</h2>
           <p className="text-red-700 font-medium">ليس لديك صلاحيات الوصول لهذه الصفحة. يرجى العودة للرئيسية.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const matchesFilter = filter === 'all' || u.verificationStatus === filter;
    const matchesSearch = u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h1 className="text-4xl font-black text-gray-900 mb-2">لوحة تحكم الإدارة</h1>
           <p className="text-gray-500 font-medium">إدارة المستخدمين وطلبات التوثيق وبناء الثقة في المنصة.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
           {[
             { id: 'all', label: 'الكل' },
             { id: 'pending', label: 'قيد المراجعة' },
             { id: 'verified', label: 'موثق' },
             { id: 'rejected', label: 'مرفوض' }
           ].map(f => (
             <button
               key={f.id}
               onClick={() => setFilter(f.id as any)}
               className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                 filter === f.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
               }`}
             >
               {f.label}
             </button>
           ))}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-blue-100/10 overflow-hidden">
         <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row justify-between items-center gap-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
               <ShieldCheck className="w-6 h-6 text-blue-500" />
               طلبات التوثيق والمستخدمين ({filteredUsers.length})
            </h2>
            <div className="relative w-full md:w-80">
               <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
               <input 
                  type="text"
                  placeholder="بحث بالاسم أو البريد..."
                  className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
               <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-sm font-bold uppercase tracking-wider">
                     <th className="px-8 py-5">المستخدم</th>
                     <th className="px-8 py-5">رقم الهوية</th>
                     <th className="px-8 py-5">الحالة</th>
                     <th className="px-8 py-5">مستوى الثقة</th>
                     <th className="px-8 py-5">التاريخ</th>
                     <th className="px-8 py-5">الجراءات</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map(user => (
                     <motion.tr 
                        layout 
                        key={user.uid}
                        className="hover:bg-blue-50/10 transition-colors"
                     >
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <img 
                                 src={user.photoURL} 
                                 className="w-12 h-12 rounded-2xl object-cover" 
                                 referrerPolicy="no-referrer"
                              />
                              <div>
                                 <p className="font-bold text-gray-900">{user.displayName}</p>
                                 <p className="text-xs text-gray-400 font-medium">{user.email}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="font-mono font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded-lg">
                              {user.idNumber || 'غير متوفر'}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           {user.verificationStatus === 'pending' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-black">
                                 <Clock className="w-3.5 h-3.5" />
                                 قيد المراجعة
                              </span>
                           )}
                           {user.verificationStatus === 'verified' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-black">
                                 <CheckCircle2 className="w-3.5 h-3.5" />
                                 موثق
                              </span>
                           )}
                           {user.verificationStatus === 'rejected' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-black">
                                 <XCircle className="w-3.5 h-3.5" />
                                 مرفوض
                              </span>
                           )}
                           {(!user.verificationStatus || user.verificationStatus === 'none') && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-400 rounded-full text-xs font-black">
                                 لم يقدم طلب
                              </span>
                           )}
                        </td>
                        <td className="px-8 py-6">
                           <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden max-w-[80px]">
                              <div 
                                 className="bg-blue-600 h-full" 
                                 style={{ width: `${user.trustLevel || 0}%` }} 
                              />
                           </div>
                           <span className="text-[10px] font-bold text-gray-400 mt-1 block">%{user.trustLevel || 0}</span>
                        </td>
                        <td className="px-8 py-6 text-sm text-gray-500 font-medium whitespace-nowrap">
                           {format(user.createdAt?.toDate?.() || new Date(), 'dd MMM yyyy', { locale: ar })}
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex gap-2">
                              {user.verificationStatus === 'pending' && (
                                 <>
                                    <button 
                                       onClick={() => handleVerify(user.uid, true)}
                                       className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all border border-green-200"
                                       title="قبول التوثيق"
                                    >
                                       <UserCheck className="w-5 h-5" />
                                    </button>
                                    <button 
                                       onClick={() => handleVerify(user.uid, false)}
                                       className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-200"
                                       title="رفض التوثيق"
                                    >
                                       <UserX className="w-5 h-5" />
                                    </button>
                                 </>
                              )}
                              {user.verificationStatus === 'verified' && (
                                 <button 
                                    onClick={() => handleVerify(user.uid, false)}
                                    className="px-4 py-2 bg-gray-50 text-red-400 rounded-xl text-xs font-bold hover:bg-red-50 transition-all"
                                 >
                                    إلغاء التوثيق
                                 </button>
                              )}
                           </div>
                        </td>
                     </motion.tr>
                  ))}
               </tbody>
            </table>
         </div>
         {filteredUsers.length === 0 && (
            <div className="text-center py-20 text-gray-400 font-bold">
               لا توجد بيانات مطابقة للبحث أو الفلترة.
            </div>
         )}
      </div>
    </div>
  );
};
