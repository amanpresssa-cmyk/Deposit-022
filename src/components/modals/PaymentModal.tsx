import React from 'react';
import { motion } from 'motion/react';
import { PaymentIcon } from '../ui/PaymentIcon';
import { calculateOrderFees } from '../../lib/payment-utils';

interface PaymentModalProps {
  amount: number;
  loading: boolean;
  paymentMethod: 'card' | 'applepay' | 'stcpay' | 'bnpl';
  setPaymentMethod: (method: 'card' | 'applepay' | 'stcpay' | 'bnpl') => void;
  specificProvider?: 'mada' | 'visa' | 'mastercard' | 'tabby' | 'tamara';
  setSpecificProvider: (p: 'mada' | 'visa' | 'mastercard' | 'tabby' | 'tamara' | undefined) => void;
  profile: any;
  allowBNPL: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSimulate: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  amount, loading, paymentMethod, setPaymentMethod, specificProvider, setSpecificProvider, profile, allowBNPL, onClose, onConfirm, onSimulate
}) => {
  const fees = calculateOrderFees(amount, specificProvider === 'tabby' ? 'tabby' : specificProvider === 'tamara' ? 'tamara' : specificProvider === 'mada' ? 'mada' : paymentMethod === 'applepay' ? 'apple_pay' : 'credit_card');
  const madaFee = calculateOrderFees(amount, 'mada');
  const visaFee = calculateOrderFees(amount, 'credit_card');
  const appleFee = calculateOrderFees(amount, 'apple_pay');
  const bnplFee = calculateOrderFees(amount, specificProvider === 'tamara' ? 'tamara' : 'tabby');
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar">
        <h3 className="text-xl font-black mb-6">الدفع الآمن</h3>
        
        <div className="space-y-3 mb-6">
          <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'card' && specificProvider === 'mada' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <input type="radio" name="payment" checked={paymentMethod === 'card' && specificProvider === 'mada'} onChange={() => { setPaymentMethod('card'); setSpecificProvider('mada'); }} className="text-blue-600 focus:ring-blue-500 w-5 h-5" />
              <span className="font-bold">بطاقة مدى</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-black text-blue-600">
              {madaFee.buyerTotal.toLocaleString()} ر.س
              <PaymentIcon type="mada" className="w-8 h-auto" />
            </div>
          </label>
          
          <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'card' && specificProvider !== 'mada' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <input type="radio" name="payment" checked={paymentMethod === 'card' && specificProvider !== 'mada'} onChange={() => { setPaymentMethod('card'); setSpecificProvider('visa'); }} className="text-blue-600 focus:ring-blue-500 w-5 h-5" />
              <span className="font-bold">بطاقة ائتمانية</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-black text-blue-600">
              {visaFee.buyerTotal.toLocaleString()} ر.س
              <div className="flex gap-1">
                <PaymentIcon type="visa" className="w-8 h-auto" />
                <PaymentIcon type="mastercard" className="w-8 h-auto" />
              </div>
            </div>
          </label>

          <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'applepay' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <input type="radio" name="payment" checked={paymentMethod === 'applepay'} onChange={() => { setPaymentMethod('applepay'); setSpecificProvider(undefined); }} className="text-blue-600 focus:ring-blue-500 w-5 h-5" />
              <span className="font-bold">Apple Pay</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-black text-blue-600">
              {appleFee.buyerTotal.toLocaleString()} ر.س
              <PaymentIcon type="applepay" className="w-10 h-auto" />
            </div>
          </label>

          <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'stcpay' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <input type="radio" name="payment" checked={paymentMethod === 'stcpay'} onChange={() => { setPaymentMethod('stcpay'); setSpecificProvider(undefined); }} className="text-blue-600 focus:ring-blue-500 w-5 h-5" />
              <span className="font-bold">STC Pay</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-black text-blue-600">
              {calculateOrderFees(amount, 'credit_card').buyerTotal.toLocaleString()} ر.س
              <PaymentIcon type="stcpay" className="w-10 h-auto" />
            </div>
          </label>

          {allowBNPL && (
            <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'bnpl' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <input type="radio" name="payment" checked={paymentMethod === 'bnpl'} onChange={() => { setPaymentMethod('bnpl'); setSpecificProvider('tabby'); }} className="text-blue-600 focus:ring-blue-500 w-5 h-5" />
                <span className="font-bold">تقسيط</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-black text-blue-600">
                {bnplFee.buyerTotal.toLocaleString()} ر.س
                <div className="flex gap-1">
                  <PaymentIcon type="tabby" className="w-8 h-auto" />
                  <PaymentIcon type="tamara" className="w-10 h-auto" />
                </div>
              </div>
            </label>
          )}
        </div>

        {paymentMethod === 'bnpl' && (
          <div className="flex gap-2 mb-6">
            <button onClick={() => setSpecificProvider('tabby')} className={`flex-1 p-2 rounded-xl border-2 ${specificProvider === 'tabby' ? 'border-blue-600' : 'border-gray-100'} flex justify-center items-center`}>
              <PaymentIcon type="tabby" className="h-6" />
            </button>
            <button onClick={() => setSpecificProvider('tamara')} className={`flex-1 p-2 rounded-xl border-2 ${specificProvider === 'tamara' ? 'border-blue-600' : 'border-gray-100'} flex justify-center items-center`}>
              <PaymentIcon type="tamara" className="h-6" />
            </button>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <button onClick={onClose} disabled={loading} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">إلغاء</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">تأكيد الدفع</button>
        </div>
        
        {profile?.isAdmin && (
          <button onClick={onSimulate} disabled={loading} className="w-full text-xs text-gray-400 font-bold uppercase tracking-widest mt-2 hover:text-blue-600 transition-colors">
            محاكاة الدفع (للإدارة فقط)
          </button>
        )}
      </motion.div>
    </motion.div>
  );
};
