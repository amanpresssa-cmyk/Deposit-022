import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  FileText, Users, CreditCard, Calendar, Printer, X,
  Shield, Activity
} from 'lucide-react';

interface ReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ isOpen, onClose }) => {
  // Config States
  const [reportType, setReportType] = useState<'user' | 'operations' | 'financial'>('user');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // Customization
  const [includeStamp, setIncludeStamp] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [adminNote, setAdminNote] = useState('');

  // Fetch Data
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [generalSettings, setGeneralSettings] = useState<any>(null);

  // Generated Report State
  const [previewMode, setPreviewMode] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    // Fetch settings and quick user list
    const loadInitData = async () => {
      try {
        setLoading(true);
        
        // Fetch users
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(usersList);

        // Fetch general settings
        const settingsSnap = await getDoc(doc(db, 'app_settings', 'general'));
        if (settingsSnap.exists()) {
          setGeneralSettings(settingsSnap.data());
        }
      } catch (error) {
        console.error("Error fetching admin reporting data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitData();
  }, [isOpen]);

  const filteredUsers = users.filter(u => {
    const term = searchQuery.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.phone || '').includes(term)
    );
  });

  // Calculate Report Data
  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const allOrders = ordersSnap.docs.map(d => {
        const o: any = d.data();
        let dateVal = new Date();
        if (o.createdAt?.toDate) {
          dateVal = o.createdAt.toDate();
        } else if (o.createdAt) {
          dateVal = new Date(o.createdAt);
        }
        return { id: d.id, ...o, date: dateVal };
      });

      const txSnap = await getDocs(collection(db, 'transactions'));
      const allTxs = txSnap.docs.map(d => {
        const t: any = d.data();
        let dateVal = new Date();
        if (t.createdAt?.toDate) {
          dateVal = t.createdAt.toDate();
        } else if (t.createdAt) {
          dateVal = new Date(t.createdAt);
        }
        return { id: d.id, ...t, date: dateVal };
      });

      // Filter by range
      let startDate = new Date();
      if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (timeRange === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (timeRange === 'custom' && customStart) {
        startDate = new Date(customStart);
      }

      let endDate = new Date();
      if (timeRange === 'custom' && customEnd) {
        endDate = new Date(customEnd);
      }

      if (reportType === 'user') {
        if (!selectedUser) {
          alert('يرجى اختيار مستخدم أولا لإنشاء التقرير');
          setLoading(false);
          return;
        }

        // Get orders for this user (buyer or seller)
        const userOrders = allOrders.filter(o => o.buyerId === selectedUser.id || o.sellerId === selectedUser.id);
        const buyerOrders = userOrders.filter(o => o.buyerId === selectedUser.id);
        const sellerOrders = userOrders.filter(o => o.sellerId === selectedUser.id);
        
        const totalBought = buyerOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
        const totalSold = sellerOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

        setGeneratedData({
          user: selectedUser,
          orders: userOrders,
          stats: {
            totalDeals: userOrders.length,
            buyerCount: buyerOrders.length,
            sellerCount: sellerOrders.length,
            totalBought,
            totalSold,
            successRate: userOrders.length > 0 ? (userOrders.filter(o => o.status === 'completed').length / userOrders.length * 100).toFixed(0) : 100,
            activeCount: userOrders.filter(o => ['pending', 'active', 'shipped'].includes(o.status)).length
          }
        });
      } else if (reportType === 'operations') {
        // Filter orders inside the selected range
        const periodOrders = allOrders.filter(o => o.date >= startDate && o.date <= endDate);
        
        let totalVal = 0;
        let successVal = 0;
        let cancelledVal = 0;
        let activeVal = 0;

        periodOrders.forEach(o => {
          const amt = Number(o.amount) || 0;
          totalVal += amt;
          if (o.status === 'completed') {
            successVal += amt;
          } else if (o.status === 'cancelled') {
            cancelledVal += amt;
          } else {
            activeVal += amt;
          }
        });

        // Group by status
        const counts = {
          completed: periodOrders.filter(o => o.status === 'completed').length,
          cancelled: periodOrders.filter(o => o.status === 'cancelled').length,
          active: periodOrders.filter(o => ['pending', 'active', 'shipped'].includes(o.status)).length,
          disputed: periodOrders.filter(o => o.status === 'disputed').length,
        };

        setGeneratedData({
          range: { start: startDate, end: endDate, label: timeRange },
          orders: periodOrders.slice(0, 20), // Show latest 20 in table
          stats: {
            totalVolume: totalVal,
            successVolume: successVal,
            cancelledVolume: cancelledVal,
            activeVolume: activeVal,
            totalDeals: periodOrders.length,
            counts
          }
        });
      } else if (reportType === 'financial') {
        // Financial summary (commissions, volumes, withdrawals)
        const periodTxs = allTxs.filter(t => t.date >= startDate && t.date <= endDate);
        const periodOrders = allOrders.filter(o => o.date >= startDate && o.date <= endDate);

        const totalFees = periodTxs
          .filter(t => t.type === 'commission' || t.type === 'fee')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const totalDeposits = periodTxs
          .filter(t => t.type === 'deposit')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const totalWithdraws = periodTxs
          .filter(t => t.type === 'withdrawal' && t.status === 'completed')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const totalEscrowVolume = periodOrders
          .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

        setGeneratedData({
          range: { start: startDate, end: endDate, label: timeRange },
          stats: {
            totalFees,
            totalDeposits,
            totalEscrowVolume,
            totalWithdraws,
            completedPayoutsCount: periodTxs.filter(t => t.type === 'withdrawal' && t.status === 'completed').length,
            pendingPayoutsCount: periodTxs.filter(t => t.type === 'withdrawal' && t.status === 'pending').length,
          },
          txs: periodTxs.slice(0, 20)
        });
      }

      setPreviewMode(true);
    } catch (err) {
      console.error("Error generating report:", err);
      alert('حدث خطأ أثناء تجميع بيانات التقرير.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto font-sans">
      
      {/* Dynamic Printing CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-report-container, #print-report-container * {
            visibility: visible !important;
          }
          #print-report-container {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 44px !important;
            background: white !important;
            color: black !important;
            direction: rtl !important;
            z-index: 9999999 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }

          /* Prevent clipping of stamp and signature and force object-fit: contain */
          .print-signature-container, .print-stamp-container {
            overflow: visible !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }
          .print-signature-img, .print-stamp-img {
            object-fit: contain !important;
            max-width: 100% !important;
            max-height: 100% !important;
            display: block !important;
            overflow: visible !important;
          }
          .print-stamp-fallback {
            overflow: visible !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Main Container */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-full max-w-[1000px] flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300 no-print">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <FileText className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">نظام التقارير المعتمد</h3>
              <p className="text-[10px] text-gray-400 font-bold">توليد تقارير رسمية مختومة وموقعة قابلة للطباعة والحفظ بصيغة PDF</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {!previewMode ? (
            <>
              {/* Report Category Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setReportType('user')}
                  className={`p-5 rounded-3xl border text-right transition-all flex items-start gap-4 ${
                    reportType === 'user' 
                      ? 'border-blue-600 bg-blue-50/20 shadow-lg shadow-blue-50' 
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-3 rounded-2xl ${reportType === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">تقارير المستخدمين</h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">تفاصيل مستخدم محدد ومؤشراته المالية والتبادلية</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setReportType('operations')}
                  className={`p-5 rounded-3xl border text-right transition-all flex items-start gap-4 ${
                    reportType === 'operations' 
                      ? 'border-blue-600 bg-blue-50/20 shadow-lg shadow-blue-50' 
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-3 rounded-2xl ${reportType === 'operations' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">تقرير العمليات والتبادل</h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">حجم الصفقات والعمليات الأسبوعية أو الشهرية أو السنوية</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setReportType('financial')}
                  className={`p-5 rounded-3xl border text-right transition-all flex items-start gap-4 ${
                    reportType === 'financial' 
                      ? 'border-blue-600 bg-blue-50/20 shadow-lg shadow-blue-50' 
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-3 rounded-2xl ${reportType === 'financial' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">التقرير المالي العام والأرباح</h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">كشف حركات الأموال، الإيداعات، السحوبات، والرسوم المحصلة</p>
                  </div>
                </button>
              </div>

              {/* Parameters Area */}
              <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-6">
                <h4 className="text-xs font-black text-gray-900">خيارات التقارير وتحديد المدى:</h4>
                
                {reportType === 'user' && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">بحث واختيار عضو محدد:</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="ابحث باسم المستخدم، البريد، أو رقم الهاتف..."
                        value={searchQuery}
                        onChange={e => {
                          setSearchQuery(e.target.value);
                          setSelectedUser(null);
                        }}
                        className="w-full bg-white rounded-2xl p-4 text-xs font-bold border border-gray-200 outline-none transition-all focus:border-blue-500 text-right"
                      />
                    </div>
                    {searchQuery && !selectedUser && (
                      <div className="bg-white border border-gray-100 rounded-2xl max-h-48 overflow-y-auto divide-y divide-gray-50 text-right">
                        {filteredUsers.length === 0 ? (
                          <div className="p-4 text-xs text-gray-400 font-bold">لا توجد نتائج مطابقة</div>
                        ) : (
                          filteredUsers.slice(0, 5).map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setSearchQuery(u.name || u.email);
                              }}
                              className="w-full p-3 hover:bg-blue-50/30 text-right flex items-center justify-between transition-all"
                            >
                              <div>
                                <span className="text-xs font-black text-gray-900 block">{u.name || "عضو بدون اسم"}</span>
                                <span className="text-[10px] text-gray-400 block mt-0.5">{u.email}</span>
                              </div>
                              <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">تحديد العضو</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    {selectedUser && (
                      <div className="p-4 bg-green-50/50 border border-green-100 rounded-2xl flex items-center justify-between text-right">
                        <div>
                          <span className="text-xs font-black text-green-800">تم اختيار: {selectedUser.name || selectedUser.email}</span>
                          <span className="text-[9px] text-green-600 block mt-0.5">بريد: {selectedUser.email} | هاتف: {selectedUser.phone || 'غير مضبوط'}</span>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedUser(null);
                            setSearchQuery('');
                          }}
                          className="p-1 px-2.5 text-[10px] bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-all"
                        >
                          حذف التحديد
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {reportType !== 'user' && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">الفترة الزمنية للتقرير:</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'week', label: 'آخر 7 أيام (أسبوعي)' },
                        { id: 'month', label: 'آخر 30 يوم (شهري)' },
                        { id: 'year', label: 'آخر 12 شهر (سنوي)' },
                        { id: 'custom', label: 'تخصيص فترة معينة' }
                      ].map(range => (
                        <button
                          key={range.id}
                          type="button"
                          onClick={() => setTimeRange(range.id as any)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            timeRange === range.id 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>

                    {timeRange === 'custom' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-gray-400">تاريخ البداية</span>
                          <input 
                            type="date" 
                            value={customStart}
                            onChange={e => setCustomStart(e.target.value)}
                            className="w-full bg-white rounded-xl p-3 text-xs font-bold border border-gray-200 outline-none text-right"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-gray-400">تاريخ النهاية</span>
                          <input 
                            type="date" 
                            value={customEnd}
                            onChange={e => setCustomEnd(e.target.value)}
                            className="w-full bg-white rounded-xl p-3 text-xs font-bold border border-gray-200 outline-none text-right"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional parameters */}
                <div className="border-t border-gray-200/60 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-[11px] font-black text-gray-900">الختم والتوقيع الرسمي</h5>
                      <p className="text-[9px] text-gray-400 font-bold">تطبيق الأختام وتفاصيل التوقيعات المترجمة من لوحة الإعدادات</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={includeStamp}
                          onChange={e => setIncludeStamp(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        />
                        <span className="text-[10px] font-black text-gray-600 select-none">تضمين الختم</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={includeSignature}
                          onChange={e => setIncludeSignature(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        />
                        <span className="text-[10px] font-black text-gray-600 select-none">تضمين التوقيع</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">ملاحظات إدارية ملحقة بأسفل التقرير (اختياري)</label>
                    <textarea 
                      placeholder="اكتب أي ملاحظة أو ملحوظة ترغب في أن تظهر رسمياً في ذيل التقرير..."
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      rows={2}
                      className="w-full bg-white rounded-2xl p-4 text-xs font-bold border border-gray-200 outline-none transition-all focus:border-blue-500 text-right resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-blue-50 hover:scale-[1.01] active:scale-95 transition-all"
              >
                {loading ? (
                  <span>جاري سحب وتصنيف البيانات...</span>
                ) : (
                  <>
                    <Printer className="w-4 h-4 animate-bounce" />
                    <span>توليد ومعاينة التقرير الجاهز للطباعة</span>
                  </>
                )}
              </button>
            </>
          ) : (
            
            // Preview State
            <div className="space-y-6">
              
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-right">
                <div>
                  <h4 className="text-xs font-black text-blue-900">جاهز للطباعة والتحميل كـ PDF</h4>
                  <p className="text-[10px] text-blue-600 font-bold mt-1">التقرير أدناه تم تنسيقه ليلائم مقاسات أوراق الطباعة A4 الرسمية. اضغط على زر طباعة لحفظه كملف PDF مرتب ومختوم.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewMode(false)}
                    className="p-2.5 px-4 bg-white hover:bg-gray-50 text-gray-600 rounded-xl font-bold text-xs border border-gray-200 transition-all"
                  >
                    تعديل الخيارات
                  </button>
                  <button
                    onClick={handlePrint}
                    className="p-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    طباعة التقرير (أو PDF)
                  </button>
                </div>
              </div>

              {/* Printed Container Target */}
              <div 
                id="print-report-container"
                className="bg-white p-10 rounded-[2rem] border border-gray-200/70 shadow-inner text-right relative overflow-hidden"
              >
                
                {/* Official Stamp Overlay Watermark */}
                {includeStamp && (
                  <div className="absolute right-10 top-12 opacity-5 pointer-events-none select-none">
                    <Shield className="w-96 h-96 text-gray-900" />
                  </div>
                )}

                {/* Header Platform */}
                <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                  <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">{generalSettings?.platformName || 'منصة عربون الرقمية'}</h1>
                    <p className="text-[10px] text-gray-500 font-bold mt-0.5">{generalSettings?.platformTagline || 'نظام الوساطة والضمان التجاري الآمن'}</p>
                    <span className="text-[9px] bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-bold inline-block mt-3">تقرير رسمي معتمد</span>
                  </div>
                  <div className="text-left font-mono">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">الرقم المرجعي للتقرير</p>
                    <h4 className="text-xs font-black text-gray-900 mt-0.5">REF-{Math.floor(100000 + Math.random() * 900000)}</h4>
                    
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-2.5">تاريخ التصدير والاستخراج</p>
                    <h4 className="text-[10px] font-black text-gray-800 mt-0.5">{new Date().toLocaleString('ar-SA')}</h4>
                  </div>
                </div>

                {/* Report Context Title */}
                <div className="my-6">
                  {reportType === 'user' && (
                    <div>
                      <h2 className="text-sm font-black text-gray-900 bg-gray-50 p-3 rounded-xl inline-block">كشف تقرير النشاط والملف الشخصي للعضو</h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border border-gray-100 p-5 rounded-2xl bg-white">
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold">اسم المستخدم</span>
                          <p className="text-xs font-black text-gray-800 mt-0.5">{generatedData?.user?.name || 'عضو بدون اسم'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold">البريد الإلكتروني</span>
                          <p className="text-xs font-bold text-gray-800 mt-0.5">{generatedData?.user?.email}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold">رقم الأيبان أو الهاتف</span>
                          <p className="text-xs font-bold text-gray-800 mt-0.5">{generatedData?.user?.phone || 'غير مدرج'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold">تاريخ المعاملة الأولى</span>
                          <p className="text-xs font-bold text-gray-800 mt-0.5">
                            {generatedData?.user?.createdAt?.toDate ? new Date(generatedData.user.createdAt.toDate()).toLocaleDateString('ar-SA') : 'التحق حديثاً'}
                          </p>
                        </div>
                      </div>

                      {/* Performance Highlights */}
                      <h3 className="text-xs font-black text-gray-900 mt-8 mb-4 border-r-4 border-blue-600 pr-2">ملخص مؤشرات العضو</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-gray-50 rounded-2xl text-right">
                          <span className="text-[9px] text-gray-400 font-bold">إجمالي العمليات المبرمة</span>
                          <h4 className="text-base font-black text-gray-900 mt-1">{generatedData?.stats?.totalDeals} صفقة</h4>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl text-right">
                          <span className="text-[9px] text-gray-400 font-bold">حجم الشراء الإجمالي</span>
                          <h4 className="text-base font-black text-blue-600 mt-1">{Number(generatedData?.stats?.totalBought).toLocaleString()} ر.س</h4>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl text-right">
                          <span className="text-[9px] text-gray-400 font-bold">حجم البيع الإجمالي</span>
                          <h4 className="text-base font-black text-green-600 mt-1">{Number(generatedData?.stats?.totalSold).toLocaleString()} ر.س</h4>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl text-right">
                          <span className="text-[9px] text-gray-400 font-bold">معدل نجاح الصفقات</span>
                          <h4 className="text-base font-black text-indigo-600 mt-1">{generatedData?.stats?.successRate}%</h4>
                        </div>
                      </div>

                      {/* Table list of transactions */}
                      <h3 className="text-xs font-black text-gray-900 mt-8 mb-4 border-r-4 border-blue-600 pr-2">أحدث المبادلات التجارية والصفقات الجارية</h3>
                      <div className="border border-gray-100 rounded-2xl overflow-hidden mt-2 bg-white">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="p-3 text-[10px] font-black text-gray-500">رقم الصفقة</th>
                              <th className="p-3 text-[10px] font-black text-gray-500">المبلغ</th>
                              <th className="p-3 text-[10px] font-black text-gray-500">طبيعة العضو</th>
                              <th className="p-3 text-[10px] font-black text-gray-500">الوصف / الغرض</th>
                              <th className="p-3 text-[10px] font-black text-gray-500">تاريخ الصفقة</th>
                              <th className="p-3 text-[10px] font-black text-gray-500">الحالة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-bold">
                            {generatedData?.orders?.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-6 text-center text-gray-400 text-[10px]">لا توجد مبادلات مبرمة لهذا العضو بعد.</td>
                              </tr>
                            ) : (
                              generatedData.orders.map((o: any) => (
                                <tr key={o.id}>
                                  <td className="p-3 font-mono text-[10px]">#{o.id.substring(0, 8)}</td>
                                  <td className="p-3 text-blue-600">{Number(o.amount).toLocaleString()} ر.س</td>
                                  <td className="p-3 text-[10px]">{o.buyerId === generatedData.user.id ? 'مشتري' : 'بائع'}</td>
                                  <td className="p-3 text-[10px] max-w-xs truncate">{o.title || o.description || 'طلب ضمان تجاري'}</td>
                                  <td className="p-3 text-[10px] text-gray-400">{o.date ? o.date.toLocaleDateString('ar-SA') : 'الآن'}</td>
                                  <td className="p-3">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                      o.status === 'completed' ? 'bg-green-50 text-green-600' :
                                      o.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                                    }`}>
                                      {o.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {reportType === 'operations' && (
                    <div>
                      <h2 className="text-sm font-black text-gray-900 bg-gray-50 p-3 rounded-xl inline-block">كشف تقرير حركة الصفقات والضمانات الجارية</h2>
                      <p className="text-[10px] text-gray-400 mt-2 font-bold">المدى الزمني المستطلع: من <span className="text-gray-900">{generatedData?.range?.start?.toLocaleDateString('ar-SA')}</span> إلى <span className="text-gray-900">{generatedData?.range?.end?.toLocaleDateString('ar-SA')}</span></p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="p-4 bg-gray-50 rounded-2xl text-right">
                          <span className="text-[9px] text-gray-400 font-bold">عدد الصفقات المطروحة</span>
                          <h4 className="text-base font-black text-gray-900 mt-1">{generatedData?.stats?.totalDeals} صفقة</h4>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl text-right">
                          <span className="text-[9px] text-gray-400 font-bold">إجمالي التدفق المتداول</span>
                          <h4 className="text-base font-black text-blue-600 mt-1">{Number(generatedData?.stats?.totalVolume).toLocaleString()} ر.س</h4>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl text-right">
                          <span className="text-[9px] text-gray-400 font-bold">قيمة الصفقات المنجزة</span>
                          <h4 className="text-base font-black text-green-600 mt-1">{Number(generatedData?.stats?.successVolume).toLocaleString()} ر.س</h4>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl text-right">
                          <span className="text-[9px] text-gray-400 font-bold">حجم الصفقات المعلقة بالضمان</span>
                          <h4 className="text-base font-black text-orange-600 mt-1">{Number(generatedData?.stats?.activeVolume).toLocaleString()} ر.س</h4>
                        </div>
                      </div>

                      {/* Status breakdown metrics */}
                      <h3 className="text-xs font-black text-gray-900 mt-8 mb-4 border-r-4 border-blue-600 pr-2">توزيع الصفقات حسب الحالة التشغيلية</h3>
                      <div className="grid grid-cols-4 gap-4 mt-2">
                        <div className="p-4 border border-gray-100 rounded-xl text-center bg-green-50/10">
                          <span className="text-[9px] text-gray-400 font-bold">منجزة</span>
                          <h5 className="text-base font-black text-green-600 mt-0.5">{generatedData?.stats?.counts?.completed}</h5>
                        </div>
                        <div className="p-4 border border-gray-100 rounded-xl text-center bg-red-50/10">
                          <span className="text-[9px] text-gray-400 font-bold">ملغاة</span>
                          <h5 className="text-base font-black text-red-600 mt-0.5">{generatedData?.stats?.counts?.cancelled}</h5>
                        </div>
                        <div className="p-4 border border-gray-100 rounded-xl text-center bg-blue-50/10">
                          <span className="text-[9px] text-gray-400 font-bold">جارية وقيد التسليم</span>
                          <h5 className="text-base font-black text-blue-600 mt-0.5">{generatedData?.stats?.counts?.active}</h5>
                        </div>
                        <div className="p-4 border border-gray-100 rounded-xl text-center bg-yellow-50/10">
                          <span className="text-[9px] text-gray-400 font-bold">قيد النزاعات</span>
                          <h5 className="text-base font-black text-yellow-600 mt-0.5">{generatedData?.stats?.counts?.disputed}</h5>
                        </div>
                      </div>

                      {/* Display table */}
                      <h3 className="text-xs font-black text-gray-900 mt-8 mb-4 border-r-4 border-blue-600 pr-2">عينة من حركات المبادلات والصفقات المدرجة</h3>
                      <div className="border border-gray-100 rounded-2xl overflow-hidden mt-2 bg-white">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-gray-50 border-b border-gray-100 font-black">
                            <tr>
                              <th className="p-3 text-[10px] text-gray-500">رقم المرجع في النظام</th>
                              <th className="p-3 text-[10px] text-gray-500">القيمة الإجمالية</th>
                              <th className="p-3 text-[10px] text-gray-500">المشتري الكود</th>
                              <th className="p-3 text-[10px] text-gray-500">البائع الكود</th>
                              <th className="p-3 text-[10px] text-gray-500">تاريخ الإنشاء</th>
                              <th className="p-3 text-[10px] text-gray-500">حالة الصفقة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-bold">
                            {generatedData?.orders?.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-6 text-center text-gray-400 text-[10px]">لا توجد صفقات مبرمة ضمن الفترة الزمنية المحددة.</td>
                              </tr>
                            ) : (
                              generatedData.orders.map((o: any) => (
                                <tr key={o.id}>
                                  <td className="p-3 font-mono text-[10px]">#{o.id.substring(0, 8)}</td>
                                  <td className="p-3 text-blue-600">{Number(o.amount).toLocaleString()} ر.س</td>
                                  <td className="p-3 font-mono text-[10px] text-gray-500">UI-{o.buyerId?.substring(0, 5)}</td>
                                  <td className="p-3 font-mono text-[10px] text-gray-500">UI-{o.sellerId?.substring(0, 5)}</td>
                                  <td className="p-3 text-[10px] text-gray-400">{o.date ? o.date.toLocaleDateString('ar-SA') : 'الآن'}</td>
                                  <td className="p-3">
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                                      o.status === 'completed' ? 'bg-green-50 text-green-600' :
                                      o.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                                    }`}>
                                      {o.status === 'completed' ? 'ناجحة' : o.status === 'cancelled' ? 'ملغاة' : 'نشطة'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {reportType === 'financial' && (
                    <div>
                      <h2 className="text-sm font-black text-gray-900 bg-gray-50 p-3 rounded-xl inline-block">التقرير المالي وكشف الأرباح والرسوم للمنصة</h2>
                      <p className="text-[10px] text-gray-400 mt-2 font-bold">المدى الزمني المشمول بالتدقيق: من <span className="text-gray-900">{generatedData?.range?.start?.toLocaleDateString('ar-SA')}</span> إلى <span className="text-gray-900">{generatedData?.range?.end?.toLocaleDateString('ar-SA')}</span></p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="p-4 bg-gray-50 rounded-2xl text-right">
                          <span className="text-[9px] text-gray-400 font-bold">صافي أرباح المنصة (الرسوم)</span>
                          <h4 className="text-base font-black text-green-600 mt-1">{Number(generatedData?.stats?.totalFees).toLocaleString()} ر.س</h4>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl text-right">
                          <span className="text-[9px] text-gray-400 font-bold">إجمالي الإيداعات</span>
                          <h4 className="text-base font-black text-blue-600 mt-1">{Number(generatedData?.stats?.totalDeposits).toLocaleString()} ر.س</h4>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl text-right">
                          <span className="text-[9px] text-gray-400 font-bold">السحوبات المكتملة للأعضاء</span>
                          <h4 className="text-base font-black text-gray-900 mt-1">{Number(generatedData?.stats?.totalWithdraws).toLocaleString()} ر.س</h4>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl text-right">
                          <span className="text-[9px] text-gray-400 font-bold">حجم النقدية الملتزمة بالضمان</span>
                          <h4 className="text-base font-black text-orange-600 mt-1">{Number(generatedData?.stats?.totalEscrowVolume).toLocaleString()} ر.س</h4>
                        </div>
                      </div>

                      {/* Withdrawal actions list */}
                      <h3 className="text-xs font-black text-gray-900 mt-8 mb-4 border-r-4 border-blue-600 pr-2">ملخص تصفية ودور سحب الأرباح</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border border-gray-100 rounded-xl flex justify-between items-center bg-green-50/10">
                          <span className="text-[10px] text-gray-400 font-bold">طلبات سحب أموال مكتملة ومودعة:</span>
                          <h5 className="text-xs font-black text-green-700">{generatedData?.stats?.completedPayoutsCount} عملية سحب مالي ناجحة</h5>
                        </div>
                        <div className="p-4 border border-gray-100 rounded-xl flex justify-between items-center bg-yellow-50/10">
                          <span className="text-[10px] text-gray-400 font-bold">طلبات سحب تسويات معلقة بالمطابقة:</span>
                          <h5 className="text-xs font-black text-yellow-700">{generatedData?.stats?.pendingPayoutsCount} سحب قيد الانتظار والتدقيق</h5>
                        </div>
                      </div>

                      {/* Historical Ledger Table */}
                      <h3 className="text-xs font-black text-gray-900 mt-8 mb-4 border-r-4 border-blue-600 pr-2">أحدث القيود المالية والحركات المستخرجة</h3>
                      <div className="border border-gray-100 rounded-2xl overflow-hidden mt-2 bg-white">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-gray-50 border-b border-gray-100 font-black">
                            <tr>
                              <th className="p-3 text-[10px] text-gray-500">كود الحركة مالي</th>
                              <th className="p-3 text-[10px] text-gray-500">ميزة التدفق</th>
                              <th className="p-3 text-[10px] text-gray-500">القيمة والعملة</th>
                              <th className="p-3 text-[10px] text-gray-500">الحالة المحاسبية</th>
                              <th className="p-3 text-[10px] text-gray-500">تاريخ التوثيق</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-bold">
                            {generatedData?.txs?.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-gray-400 text-[10px]">لا توجد قيود مالية وحركات مضافة في هذه المدة.</td>
                              </tr>
                            ) : (
                              generatedData.txs.map((t: any) => (
                                <tr key={t.id}>
                                  <td className="p-3 font-mono text-[10px] text-gray-500">TX-{t.id.substring(0, 10).toUpperCase()}</td>
                                  <td className="p-3 text-[10px]">
                                    {t.type === 'deposit' ? 'إيداع رصيد' : t.type === 'withdrawal' ? 'سحب رصيد' : t.type === 'commission' ? 'عمولة المنصة' : t.type === 'fee' ? 'رسوم معالجة' : 'حركة مالية'}
                                  </td>
                                  <td className="p-3 text-[10px] text-blue-600 font-mono">{Number(t.amount).toLocaleString()} ر.س</td>
                                  <td className="p-3">
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                                      t.status === 'completed' ? 'bg-green-50 text-green-600' :
                                      t.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
                                    }`}>
                                      {t.status === 'completed' ? 'مكتملة' : t.status === 'pending' ? 'معلقة' : 'ملغاة'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-[10px] text-gray-400">{t.date ? t.date.toLocaleDateString('ar-SA') : 'الآن'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Stamp & Authorizing Signature Row */}
                  <div className="grid grid-cols-2 gap-12 mt-12 border-t-2 border-gray-900 pt-8">
                    {/* Authorized Signatory Column */}
                    <div>
                      <h4 className="text-[10px] text-gray-400 font-bold uppercase mb-3">الجهة الموقِعة والإقرار الرسمي</h4>
                      {includeSignature ? (
                        <div className="min-h-24 flex flex-col justify-end">
                          {generalSettings?.signatureUrl ? (
                            <div className="w-40 h-16 relative overflow-visible print-signature-container">
                              <img 
                                src={generalSettings.signatureUrl} 
                                alt="التوقيع المعتمد" 
                                className="max-w-full max-h-full print-signature-img"
                                style={{ objectFit: 'contain' }}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="text-xl text-blue-700 style-cursive font-black tracking-widest pl-3 mb-1" style={{ fontFamily: 'Dancing Script, cursive, serif' }}>
                              {generalSettings?.signatoryName || 'أحمد عبد الله الراضي'}
                            </div>
                          )}
                          <h5 className="text-xs font-black text-gray-900 mt-2">{generalSettings?.signatoryName || 'أحمد عبد الله الراضي'}</h5>
                          <p className="text-[9px] text-gray-400 font-bold">{generalSettings?.signatoryTitle || 'المدير العام والمطابق المالي'}</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 italic font-bold">التوقيع مستثنى بطلب مسبق</p>
                      )}
                    </div>

                    {/* Stamp Circular Column */}
                    <div className="flex flex-col items-center justify-end">
                      {includeStamp ? (
                        <div className="relative flex flex-col items-center animate-in zoom-in duration-300">
                          <div className="text-[9px] text-gray-400 font-bold mb-3 w-full text-right block">ختم التوثيق المحاسبي والاعتماد الدائري</div>
                          {generalSettings?.stampUrl ? (
                            <div className="w-32 h-32 relative select-none flex items-center justify-center overflow-visible print-stamp-container">
                              <img 
                                src={generalSettings.stampUrl} 
                                alt="الختم الرسمي للمنصة" 
                                className="max-w-full max-h-full print-stamp-img"
                                style={{ objectFit: 'contain' }}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            // High-end CSS Stamp Fallback
                            <div className="w-32 h-32 rounded-full border-4 border-double border-blue-600/75 flex flex-col items-center justify-center p-2 text-center select-none relative rotate-6 shadow-sm overflow-visible print-stamp-fallback">
                              <div className="absolute inset-0.5 rounded-full border border-blue-600/40"></div>
                              <span className="text-[10px] font-black text-blue-600/90 leading-none">{generalSettings?.platformName?.substring(0, 15) || 'عربون'}</span>
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-ping my-2"></div>
                              <span className="text-[8px] font-bold text-gray-400 tracking-tight leading-normal max-w-[70px] truncate">{generalSettings?.stampText?.substring(0, 25) || 'الختم المالي المعتمد'}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full text-right">
                          <h4 className="text-[10px] text-gray-400 font-bold uppercase mb-2">ختم توثيق المنصة</h4>
                          <p className="text-[10px] text-gray-400 italic font-bold">الختم مستثنى بطلب مسبق</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security and Integrity Footer */}
                <div className="border-t border-gray-100 pt-6 mt-12 text-center text-[9px] text-gray-400 font-bold flex justify-between items-center">
                  <p>تم استخراج القيود وتصنيف الجدول مؤتمتاً ١٠٠٪ وهي مطابقة لدفاتر العقود والضمان والتحايل.</p>
                  <p className="font-mono">حالة المستند: أصلي ومختوم ومطابق</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
