
export type PaymentMethod = 'standard' | 'credit_card' | 'mada' | 'apple_pay' | 'tabby' | 'tamara';

export interface PaymentCalculation {
  baseAmount: number;         // المبلغ الأصلي للخدمة
  buyerTotal: number;         // إجمالي ما يدفعه المشتري (Base + Arboon Fee)
  arboonFee: number;          // رسوم منصة عربون (3%)
  installmentFee: number;     // رسوم بوابة التقسيط (تقريباً 7%)
  sellerNetShare: number;     // صافي ربح البائع بعد خصم رسوم التقسيط
  gatewayName: string;
}

export function calculateOrderFees(amount: number, method: PaymentMethod = 'credit_card'): PaymentCalculation {
  // رسوم المنصة الأساسية 3%
  const arboonFee = amount * 0.03;
  let buyerTotal = amount + arboonFee;
  
  // الرسوم الإضافية لحماية التقسيط
  let installmentFee = 0;
  let gatewayName = 'بطاقة بنكية';

  if (method === 'tabby' || method === 'tamara') {
    // الالتفاف القانوني: لا نضيف "رسوم تابي" بل نعدل إجمالي الفاتورة بحيث بعد خصم تابي 7% يتبقى المبلغ الصافي (المبلغ + 3% للمنصة)
    const requiredNet = amount + arboonFee;
    buyerTotal = requiredNet / 0.93; // 0.93 = (1 - 0.07)
    
    installmentFee = buyerTotal - requiredNet;
    gatewayName = method === 'tabby' ? 'تابي' : 'تمارا';
  }

  return {
    baseAmount: amount,
    buyerTotal: parseFloat(buyerTotal.toFixed(2)),
    arboonFee: parseFloat(arboonFee.toFixed(2)),
    installmentFee: parseFloat(installmentFee.toFixed(2)),
    sellerNetShare: parseFloat(amount.toFixed(2)), // البائع يأخذ مبلغه كاملاً
    gatewayName
  };
}
