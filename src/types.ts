export interface Service {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  category: string;
  deliveryTime: string;
  isActive?: boolean;
  imageUrl?: string;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoURL: string;
  rating: number;
  reviewsCount: number;
  isVerified: boolean;
  isSeller: boolean;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  specialties?: string[];
  isAdmin?: boolean;
  trustLevel?: number;
  confidenceScore?: number;
  verificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  verificationRejectionReason?: string;
  idNumber?: string;
  idPhotoUrl?: string;
  agreedToTerms?: boolean;
  isBlocked?: boolean;
  isFeatured?: boolean;
  avgResponseTime?: string;
  referralCode?: string;
  referredBy?: string;
  freeFeeTransactions?: number;
  emailConsent?: boolean;
  isOnline?: boolean;
  lastSeen?: any;
  createdAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order_update' | 'payment' | 'dispute' | 'system' | 'settlement';
  priority: 'normal' | 'settlement' | 'urgent';
  orderId?: string;
  isRead: boolean;
  createdAt: any;
}

export type OrderStatus = 'pending' | 'escrowed' | 'delivered' | 'completed' | 'disputed' | 'cancelled';

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  sellerEmail?: string | null;
  sellerPhone?: string | null;
  title: string;
  description: string;
  amount: number;
  status: OrderStatus;
  category: string;
  visibility: 'public' | 'private';
  typingStatus?: Record<string, boolean>;
  buyerRatingCompleted?: boolean;
  sellerRatingCompleted?: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface Message {
  id: string;
  orderId: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export interface Dispute {
  id: string;
  orderId: string;
  raisedById: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  resolution?: string;
  createdAt: any;
}
