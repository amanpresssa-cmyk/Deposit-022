
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
  // رسوم عربون ثابتة 3% تضاف على المشتري
  const arboonFee = amount * 0.03;
  
  // رسوم بوابة التقسيط (تابي/تمارا تأخذ حوالي 7%، نقوم بتحميلها على المشتري بناءً على سياسة المنصة)
  let installmentFee = 0;
  let gatewayName = 'بطاقة بنكية';

  if (method === 'tabby' || method === 'tamara') {
    installmentFee = amount * 0.07;
    gatewayName = method === 'tabby' ? 'تابي' : 'تمارا';
  }

  return {
    baseAmount: amount,
    buyerTotal: parseFloat((amount + arboonFee + installmentFee).toFixed(2)),
    arboonFee: parseFloat(arboonFee.toFixed(2)),
    installmentFee: parseFloat(installmentFee.toFixed(2)),
    sellerNetShare: parseFloat(amount.toFixed(2)),
    gatewayName
  };
}
