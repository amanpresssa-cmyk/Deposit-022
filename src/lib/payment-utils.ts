
export type PaymentMethod = 'standard' | 'bnpl';

export interface PaymentCalculation {
  totalAmount: number;
  platformCommission: number;
  providerCost: number;
  platformNetRevenue: number;
  sellerNetShare: number;
  feePercentage: number;
}

export function calculateOrderFees(amount: number, method: PaymentMethod = 'standard'): PaymentCalculation {
  const providerCost = amount * 0.03;
  let platformCommission = 0;
  let feePercentage = 0;

  if (method === 'standard') {
    platformCommission = amount * 0.03;
    feePercentage = 3;
  } else if (method === 'bnpl') {
    platformCommission = amount * 0.06;
    feePercentage = 6;
  }

  return {
    totalAmount: amount,
    platformCommission: parseFloat(platformCommission.toFixed(2)),
    providerCost: parseFloat(providerCost.toFixed(2)),
    platformNetRevenue: parseFloat((platformCommission - providerCost).toFixed(2)),
    sellerNetShare: parseFloat((amount - platformCommission).toFixed(2)),
    feePercentage: parseFloat(feePercentage.toFixed(1))
  };
}
