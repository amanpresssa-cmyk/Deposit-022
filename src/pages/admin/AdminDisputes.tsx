import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/error-handler';
import { recordOrderEvent, recordTransaction, sendNotification } from '../../lib/notificationService';
import { 
  AlertCircle, Scale, Clock, MessageSquare, Shield, CheckCircle2, 
  XCircle, Percent, ArrowRight, User, DollarSign, Loader2, Landmark
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

export const AdminDisputes: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [disputes, setDisputes] = useState<any[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  
  // Selected dispute context details
  const [buyerProfile, setBuyerProfile] = useState<any | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any | null>(null);
  const [orderData, setOrderData] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  
  // Action configurations
  const [actionLoading, setActionLoading] = useState(false);
  const [filterResolved, setFilterResolved] = useState(false);
  const [resolutionComment, setResolutionComment] = useState('');
  
  // Custom split configuration
  const [splitMode, setSplitMode] = useState(false);
  const [buyerPercent, setBuyerPercent] = useState(50);
  const [sellerPercent, setSellerPercent] = useState(50);

  // Fetch disputes
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'disputes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setDisputes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'disputes');
    });
    return () => unsub();
  }, [isAdmin]);

  // Fetch selected dispute contextual data in real time
  useEffect(() => {
    if (!selectedDispute) {
      setBuyerProfile(null);
      setSellerProfile(null);
      setOrderData(null);
      setChatMessages([]);
      return;
    }

    const fetchContextData = async () => {
      try {
        // 1. Fetch Buyer Profile
        const buyerRef = doc(db, 'users', selectedDispute.buyerId);
        const buyerSnap = await getDoc(buyerRef);
        if (buyerSnap.exists()) setBuyerProfile(buyerSnap.data());

        // 2. Fetch Seller Profile
        const sellerRef = doc(db, 'users', selectedDispute.sellerId);
        const sellerSnap = await getDoc(sellerRef);
        if (sellerSnap.exists()) setSellerProfile(sellerSnap.data());

        // 3. Fetch Order Data
        const orderRef = doc(db, 'orders', selectedDispute.orderId);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) setOrderData(orderSnap.data());
      } catch (err) {
        console.error('Error loading dispute context profiles:', err);
      }
    };
    fetchContextData();

    // 4. Fetch Order Chat History in real time
    const messagesQuery = query(
      collection(db, 'orders', selectedDispute.orderId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubMessages = onSnapshot(messagesQuery, (snap) => {
      setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.warn('Error listening to chat messages:', error);
    });

    return () => {
      unsubMessages();
    };
  }, [selectedDispute]);

  // Split calculations
  const buyerSplitAmount = selectedDispute ? (selectedDispute.amount * buyerPercent) / 100 : 0;
  const sellerSplitAmount = selectedDispute ? (selectedDispute.amount * sellerPercent) / 100 : 0;

  // Percentage slider synchronization
  const handleBuyerPercentChange = (val: number) => {
    setBuyerPercent(val);
    setSellerPercent(100 - val);
  };

  const handleSellerPercentChange = (val: number) => {
    setSellerPercent(val);
    setBuyerPercent(100 - val);
  };

  // Helper payment API wrappers
  const capturePayment = async (orderId: string, amount: number, paymentRef?: string) => {
    try {
      const response = await fetch('/api/payment/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount, transactionId: paymentRef })
      });
      return response.ok;
    } catch (err) {
      console.error('Geidea capture API failed:', err);
      return false;
    }
  };

  const refundPayment = async (orderId: string, amount: number, paymentRef?: string) => {
    try {
      const response = await fetch('/api/payment/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount, transactionId: paymentRef })
      });
      return response.ok;
    } catch (err) {
      console.error('Geidea refund API failed:', err);
      return false;
    }
  };

  // 1. Resolve: Release to Seller
  const handleReleaseToSeller = async () => {
    if (!selectedDispute || !isAdmin) return;
    setActionLoading(true);
    try {
      const finalComment = resolutionComment.trim() || 'تمت تسوية النزاع وتحرير كامل مبلغ الضمان للبائع.';
      
      // Update Dispute
      await updateDoc(doc(db, 'disputes', selectedDispute.id), {
        status: 'resolved',
        resolution: 'released_to_seller',
        resolutionNotes: finalComment,
        resolvedAt: serverTimestamp(),
        resolvedById: user?.uid
      });

      // Update Order
      await updateDoc(doc(db, 'orders', selectedDispute.orderId), {
        status: 'completed',
        updatedAt: serverTimestamp()
      });

      // Execute Capture API
      await capturePayment(selectedDispute.orderId, selectedDispute.amount, orderData?.paymentRef);

      // Increment seller's balance
      const sellerNetShare = orderData?.paymentFees?.sellerNetShare || selectedDispute.amount;
      if (selectedDispute.sellerId && selectedDispute.sellerId !== 'unknown') {
        await updateDoc(doc(db, 'users', selectedDispute.sellerId), { balance: increment(sellerNetShare) });
      }

      // Record Ledger Events
      await recordOrderEvent(
        selectedDispute.orderId,
        'ADMIN',
        'تسوية النزاع: تحرير بالكامل للبائع',
        'disputed',
        'completed',
        finalComment
      );

      await recordTransaction({
        orderId: selectedDispute.orderId,
        buyerId: selectedDispute.buyerId,
        sellerId: selectedDispute.sellerId,
        amount: selectedDispute.amount,
        fee: orderData?.paymentFees?.arboonFee || 0,
        netAmount: selectedDispute.amount,
        status: 'completed',
        sellerNetShare: orderData?.paymentFees?.sellerNetShare || selectedDispute.amount,
        paymentRef: orderData?.paymentRef || '',
        paymentMethod: orderData?.paymentMethod || 'credit_card'
      });

      // Push Notifications
      await sendNotification(
        selectedDispute.sellerId,
        '🚨 تسوية نزاع: تم تحرير الرصيد لك',
        `تمت تسوية النزاع المالي لصالحك من قبل الإدارة. القرار: ${finalComment}`,
        'settlement',
        'urgent',
        selectedDispute.orderId
      );

      await sendNotification(
        selectedDispute.buyerId,
        '🚨 قرار تسوية النزاع المالي',
        `تمت تسوية النزاع الإداري وتحرير الرصيد للبائع. القرار: ${finalComment}`,
        'order_update',
        'normal',
        selectedDispute.orderId
      );

      toast.success('تمت تسوية النزاع بنجاح وتحرير الرصيد للبائع');
      setSelectedDispute(null);
      setResolutionComment('');
    } catch (err) {
      toast.error('حدث خطأ أثناء إجراء التسوية');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Resolve: Refund to Buyer
  const handleRefundToBuyer = async () => {
    if (!selectedDispute || !isAdmin) return;
    setActionLoading(true);
    try {
      const finalComment = resolutionComment.trim() || 'تمت تسوية النزاع وإرجاع كامل مبلغ الضمان للمشتري.';

      // Update Dispute
      await updateDoc(doc(db, 'disputes', selectedDispute.id), {
        status: 'resolved',
        resolution: 'refunded_to_buyer',
        resolutionNotes: finalComment,
        resolvedAt: serverTimestamp(),
        resolvedById: user?.uid
      });

      // Update Order
      await updateDoc(doc(db, 'orders', selectedDispute.orderId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });

      // Execute Refund API
      await refundPayment(selectedDispute.orderId, selectedDispute.amount, orderData?.paymentRef);

      // Increment buyer's balance
      if (selectedDispute.buyerId && selectedDispute.buyerId !== 'unknown') {
        await updateDoc(doc(db, 'users', selectedDispute.buyerId), { balance: increment(selectedDispute.amount) });
      }

      // Record Ledger Events
      await recordOrderEvent(
        selectedDispute.orderId,
        'ADMIN',
        'تسوية النزاع: إرجاع بالكامل للمشتري',
        'disputed',
        'cancelled',
        finalComment
      );

      await recordTransaction({
        orderId: selectedDispute.orderId,
        buyerId: selectedDispute.buyerId,
        sellerId: selectedDispute.sellerId,
        amount: selectedDispute.amount,
        fee: 0,
        netAmount: selectedDispute.amount,
        status: 'refunded',
        sellerNetShare: 0,
        paymentRef: orderData?.paymentRef || '',
        paymentMethod: orderData?.paymentMethod || 'credit_card'
      });

      // Push Notifications
      await sendNotification(
        selectedDispute.buyerId,
        '🚨 تسوية نزاع: تم إرجاع أموالك',
        `تمت تسوية النزاع لصالحك وإرجاع كامل الرصيد لبطاقتك. القرار: ${finalComment}`,
        'settlement',
        'urgent',
        selectedDispute.orderId
      );

      await sendNotification(
        selectedDispute.sellerId,
        '🚨 قرار تسوية النزاع المالي',
        `تم إلغاء الصفقة وإرجاع الأموال للمشتري بموجب قرار تسوية النزاع. القرار: ${finalComment}`,
        'order_update',
        'normal',
        selectedDispute.orderId
      );

      toast.success('تمت تسوية النزاع بنجاح وإرجاع الرصيد بالكامل للمشتري');
      setSelectedDispute(null);
      setResolutionComment('');
    } catch (err) {
      toast.error('حدث خطأ أثناء إجراء التسوية والإرجاع');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Resolve: Arbitration Custom Split
  const handleArbitrationSplit = async () => {
    if (!selectedDispute || !isAdmin) return;
    setActionLoading(true);
    try {
      const finalComment = resolutionComment.trim() || `تقسيم بالتراضي: ${buyerPercent}% للمشتري و ${sellerPercent}% للبائع.`;

      // Update Dispute
      await updateDoc(doc(db, 'disputes', selectedDispute.id), {
        status: 'resolved',
        resolution: 'arbitration_split',
        resolutionNotes: finalComment,
        resolvedAt: serverTimestamp(),
        resolvedById: user?.uid,
        splitDetails: {
          buyerPercent,
          sellerPercent,
          buyerSplitAmount,
          sellerSplitAmount
        }
      });

      // Update Order
      await updateDoc(doc(db, 'orders', selectedDispute.orderId), {
        status: 'completed',
        updatedAt: serverTimestamp(),
        splitResolution: {
          buyerSplitAmount,
          sellerSplitAmount
        }
      });

      // Split geidea transactions:
      // Refund the buyer portion, capture the seller portion
      if (buyerSplitAmount > 0) {
        await refundPayment(selectedDispute.orderId, buyerSplitAmount, orderData?.paymentRef);
        if (selectedDispute.buyerId && selectedDispute.buyerId !== 'unknown') {
          await updateDoc(doc(db, 'users', selectedDispute.buyerId), { balance: increment(buyerSplitAmount) });
        }
      }
      if (sellerSplitAmount > 0) {
        await capturePayment(selectedDispute.orderId, sellerSplitAmount, orderData?.paymentRef);
        if (selectedDispute.sellerId && selectedDispute.sellerId !== 'unknown') {
          await updateDoc(doc(db, 'users', selectedDispute.sellerId), { balance: increment(sellerSplitAmount) });
        }
      }

      // Record Ledger Events
      await recordOrderEvent(
        selectedDispute.orderId,
        'ADMIN',
        'تسوية النزاع: تقسيم بالتراضي',
        'disputed',
        'completed',
        finalComment
      );

      await recordTransaction({
        orderId: selectedDispute.orderId,
        buyerId: selectedDispute.buyerId,
        sellerId: selectedDispute.sellerId,
        amount: selectedDispute.amount,
        fee: orderData?.paymentFees?.arboonFee || 0,
        netAmount: selectedDispute.amount,
        status: 'completed',
        sellerNetShare: sellerSplitAmount,
        paymentRef: orderData?.paymentRef || '',
        paymentMethod: orderData?.paymentMethod || 'credit_card'
      });

      // Push Notifications
      await sendNotification(
        selectedDispute.buyerId,
        '🚨 تسوية نزاع: تقسيم الرصيد بالتراضي',
        `تمت تسوية النزاع بنظام التقسيم. تم إرجاع ${buyerSplitAmount} ر.س لبطاقتك. القرار: ${finalComment}`,
        'settlement',
        'urgent',
        selectedDispute.orderId
      );

      await sendNotification(
        selectedDispute.sellerId,
        '🚨 تسوية نزاع: تقسيم الرصيد بالتراضي',
        `تمت تسوية النزاع بنظام التقسيم. تم تحرير ${sellerSplitAmount} ر.س لمحفظتك. القرار: ${finalComment}`,
        'settlement',
        'urgent',
        selectedDispute.orderId
      );

      toast.success(`تم تقسيم المبلغ بنجاح: ${buyerSplitAmount} ر.س للمشتري | ${sellerSplitAmount} ر.س للبائع`);
      setSelectedDispute(null);
      setResolutionComment('');
      setSplitMode(false);
    } catch (err) {
      toast.error('حدث خطأ أثناء إجراء التقسيم');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 text-center space-y-6">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black text-gray-900">غير مصرح بالدخول</h2>
        <p className="text-gray-500 font-medium">عذراً، هذه الواجهة مخصصة فقط لمدراء الإدارة والوساطة لمنصة عربون.</p>
      </div>
    );
  }

  const filteredDisputes = disputes.filter(d => filterResolved ? d.status === 'resolved' : d.status === 'open');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-right">
      
      {/* Title Header Block */}
      <div className="bg-gradient-to-l from-orange-500 to-amber-600 p-8 md:p-12 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl shadow-amber-900/10">
         <div className="flex gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
               <Scale className="w-9 h-9 text-white" />
            </div>
            <div>
               <h2 className="text-3xl font-black font-display leading-tight">مركز حل النزاعات والتحكيم</h2>
               <p className="text-orange-100 font-bold text-xs mt-1">إشراف كامل وتدخل مباشر لتسوية القضايا المالية المعلقة وحفظ الحقوق</p>
            </div>
         </div>
         <div className="flex gap-2">
           <button 
             onClick={() => { setFilterResolved(false); setSelectedDispute(null); }}
             className={`px-5 py-2.5 rounded-xl font-bold transition-all text-xs ${!filterResolved ? 'bg-white text-orange-600 shadow-lg shadow-orange-950/10' : 'bg-white/10 hover:bg-white/20 text-white'}`}
           >
             نزاعات مفتوحة ({disputes.filter(d => d.status === 'open').length})
           </button>
           <button 
             onClick={() => { setFilterResolved(true); setSelectedDispute(null); }}
             className={`px-5 py-2.5 rounded-xl font-bold transition-all text-xs ${filterResolved ? 'bg-white text-orange-600 shadow-lg shadow-orange-950/10' : 'bg-white/10 hover:bg-white/20 text-white'}`}
           >
             نزاعات مغلقة ({disputes.filter(d => d.status === 'resolved').length})
           </button>
         </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Side: Dispute List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-black text-gray-900 px-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            <span>قائمة القضايا المعروضة</span>
          </h3>
          
          <div className="space-y-3">
            {filteredDisputes.length === 0 ? (
              <div className="bg-white rounded-[2rem] border border-gray-100 p-12 text-center text-gray-400 font-bold space-y-4">
                <AlertCircle className="w-12 h-12 mx-auto text-gray-200" />
                <p>لا يوجد نزاعات في هذا القسم حالياً.</p>
              </div>
            ) : (
              filteredDisputes.map(dispute => (
                <div 
                  key={dispute.id}
                  onClick={() => setSelectedDispute(dispute)}
                  className={`bg-white p-6 rounded-[2rem] border-2 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${
                    selectedDispute?.id === dispute.id ? 'border-orange-500 bg-orange-50/20' : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <span className="font-display font-black text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                      #ARB-{dispute.id.slice(0, 4).toUpperCase()}
                    </span>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                      dispute.status === 'open' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
                    }`}>
                      {dispute.status === 'open' ? 'نشط ويحتاج قرار' : 'تمت التسوية والحل'}
                    </span>
                  </div>
                  
                  <h4 className="font-black text-gray-900 mb-1 text-sm">{dispute.orderTitle}</h4>
                  <div className="flex justify-between items-center text-xs mt-3 border-t border-gray-50 pt-3">
                    <p className="font-black text-orange-600 font-display">{dispute.amount} ر.س</p>
                    <p className="text-gray-400">
                      {dispute.createdAt ? format(dispute.createdAt.toDate(), 'dd MMM yyyy', { locale: ar }) : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Dispute Detail Dashboard & Context */}
        <div className="lg:col-span-2">
          {!selectedDispute ? (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-24 text-center space-y-6">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <Scale className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-black text-gray-900">يرجى اختيار قضية من القائمة للبدء</h4>
                <p className="text-gray-400 font-medium text-xs mt-1">اختر أي نزاع من القائمة الجانبية لاستعراض كافة التفاصيل والمحادثات وإصدار القرار.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Dispute Core Data Card */}
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                
                {/* Header */}
                <div className="bg-gray-50/50 p-8 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black font-display bg-gray-100 text-gray-500 px-3 py-1 rounded-lg">
                      معرف النزاع: #ARB-{selectedDispute.id.toUpperCase()}
                    </span>
                    <h3 className="text-xl font-black text-gray-950 mt-2">{selectedDispute.orderTitle}</h3>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-black italic">مبلغ النزاع بالكامل</p>
                    <p className="text-2xl font-display font-black text-orange-600">{selectedDispute.amount} ر.س</p>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  
                  {/* Parties Info Grid */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Buyer Details */}
                    <div className="bg-blue-50/30 border border-blue-100/50 p-6 rounded-3xl flex gap-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-blue-600 font-black">المشتري (دافع الضمان)</p>
                        <p className="font-black text-sm text-gray-900">{buyerProfile?.fullName || 'تحميل...'}</p>
                        <p className="text-xs text-gray-400">{buyerProfile?.phoneNumber || 'لا يوجد هاتف'}</p>
                      </div>
                    </div>

                    {/* Seller Details */}
                    <div className="bg-emerald-50/30 border border-emerald-100/50 p-6 rounded-3xl flex gap-4">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Landmark className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-emerald-600 font-black">المعقب / البائع (مستحق الرصيد)</p>
                        <p className="font-black text-sm text-gray-900">{sellerProfile?.fullName || 'تحميل...'}</p>
                        <p className="text-xs text-gray-400">{sellerProfile?.phoneNumber || 'لا يوجد هاتف'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Reason for Dispute */}
                  <div className="bg-red-50/30 border border-red-100 p-6 rounded-3xl space-y-3">
                    <h4 className="font-black text-red-700 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>سبب النزاع المرفوع:</span>
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed font-medium bg-white p-4 rounded-2xl border border-red-50">
                      {selectedDispute.reason}
                    </p>
                  </div>

                  {/* Conversation Real-Time Viewer */}
                  <div className="space-y-4">
                    <h4 className="font-black text-gray-900 text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span>سجل المحادثات الموثقة للطلب</span>
                    </h4>
                    <div className="border border-gray-100 rounded-3xl overflow-hidden max-h-[300px] overflow-y-auto p-6 bg-gray-50/30 space-y-4">
                      {chatMessages.length === 0 ? (
                        <p className="text-center text-gray-400 py-10 font-bold text-xs italic">لا توجد محادثات موثقة بين الطرفين على شات الطلب.</p>
                      ) : (
                        chatMessages.map(msg => {
                          const isSenderBuyer = msg.senderId === selectedDispute.buyerId;
                          const senderName = isSenderBuyer ? (buyerProfile?.fullName || 'المشتري') : (sellerProfile?.fullName || 'البائع');
                          
                          return (
                            <div key={msg.id} className={`flex flex-col ${isSenderBuyer ? 'items-start' : 'items-end'}`}>
                              <span className="text-[10px] font-black text-gray-400 mb-1 px-1">{senderName}</span>
                              <div className={`p-4 rounded-2xl max-w-[85%] text-xs font-bold ${
                                isSenderBuyer ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Interactive Split Mode Slider */}
                  {splitMode && selectedDispute.status === 'open' && (
                    <div className="bg-amber-50/50 border border-amber-100 p-8 rounded-3xl space-y-6 animate-in slide-in-from-bottom duration-300">
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-amber-800 text-sm flex items-center gap-2">
                          <Percent className="w-5 h-5" />
                          <span>تحديد نسب التقسيم المالي بالتراضي</span>
                        </h4>
                        <button onClick={() => setSplitMode(false)} className="text-xs text-amber-700 font-bold hover:underline">إلغاء التقسيم</button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-amber-100">
                        <div className="space-y-2 text-center border-l border-gray-100 pb-4 md:pb-0">
                          <p className="text-xs font-black text-blue-600">نصيب المشتري ({buyerPercent}%)</p>
                          <p className="text-2xl font-display font-black text-gray-950">{buyerSplitAmount.toLocaleString()} ر.س</p>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={buyerPercent} 
                            onChange={(e) => handleBuyerPercentChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                        <div className="space-y-2 text-center pt-4 md:pt-0">
                          <p className="text-xs font-black text-emerald-600">نصيب البائع ({sellerPercent}%)</p>
                          <p className="text-2xl font-display font-black text-gray-950">{sellerSplitAmount.toLocaleString()} ر.س</p>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={sellerPercent} 
                            onChange={(e) => handleSellerPercentChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Decisive Notes / Comment */}
                  {selectedDispute.status === 'open' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-black text-gray-700">ملاحظات وسبب قرار التسوية (سيتم إرسالها للطرفين) *</label>
                      <textarea
                        className="w-full border border-gray-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                        placeholder="يرجى كتابة شرح توضيحي للقرار النهائي المتخذ لضمان الشفافية ومشاركتها مع البائع والمشتري في سجل الطلب..."
                        value={resolutionComment}
                        onChange={(e) => setResolutionComment(e.target.value)}
                        disabled={actionLoading}
                      />
                    </div>
                  )}

                  {/* Status of Closed Disputes */}
                  {selectedDispute.status === 'resolved' && (
                    <div className="p-6 bg-green-50 border border-green-100 rounded-3xl space-y-4">
                      <h4 className="font-black text-green-700 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 animate-bounce" />
                        <span>تم حل القضية وإغلاق النزاع</span>
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4 text-xs font-bold text-gray-600">
                        <p><strong>نوع القرار:</strong> {
                          selectedDispute.resolution === 'released_to_seller' ? 'تحرير المبلغ كاملاً للبائع' :
                          selectedDispute.resolution === 'refunded_to_buyer' ? 'إرجاع المبلغ كاملاً للمشتري' : 'تقسيم بالتراضي'
                        }</p>
                        <p><strong>تاريخ التسوية:</strong> {selectedDispute.resolvedAt ? format(selectedDispute.resolvedAt.toDate(), 'dd MMMM yyyy HH:mm', { locale: ar }) : ''}</p>
                      </div>
                      {selectedDispute.splitDetails && (
                        <div className="p-4 bg-white rounded-2xl border border-green-50 text-xs font-black text-green-800 flex justify-between">
                          <span>حصّة المشتري المسترجعة: {selectedDispute.splitDetails.buyerSplitAmount} ر.س ({selectedDispute.splitDetails.buyerPercent}%)</span>
                          <span>حصّة البائع المحررة: {selectedDispute.splitDetails.sellerSplitAmount} ر.س ({selectedDispute.splitDetails.sellerPercent}%)</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 border-t border-green-100/50 pt-3">
                        <strong>ملاحظات القرار:</strong> {selectedDispute.resolutionNotes}
                      </p>
                    </div>
                  )}

                  {/* Resolution Buttons Grid */}
                  {selectedDispute.status === 'open' && (
                    <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-50">
                      
                      {!splitMode ? (
                        <>
                          <button
                            onClick={handleReleaseToSeller}
                            disabled={actionLoading}
                            className="flex-1 min-w-[200px] bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/10 hover:scale-[1.01]"
                          >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            <span>تحرير بالكامل للبائع</span>
                          </button>

                          <button
                            onClick={handleRefundToBuyer}
                            disabled={actionLoading}
                            className="flex-1 min-w-[200px] bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/10 hover:scale-[1.01]"
                          >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                            <span>إرجاع بالكامل للمشتري</span>
                          </button>

                          <button
                            onClick={() => setSplitMode(true)}
                            disabled={actionLoading}
                            className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                          >
                            <Percent className="w-5 h-5" />
                            <span>تقسيم مالي بالتراضي</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleArbitrationSplit}
                          disabled={actionLoading}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/15"
                        >
                          {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Percent className="w-5 h-5" />}
                          <span>تأكيد وتقسيم المبلغ بالتراضي ({buyerPercent}% / {sellerPercent}%)</span>
                        </button>
                      )}

                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
