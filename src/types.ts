export interface Service {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  category: string;
  deliveryTime: string;
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
  bio?: string;
  specialties?: string[];
  isAdmin?: boolean;
  trustLevel?: number;
  verificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  idNumber?: string;
  idPhotoUrl?: string;
  agreedToTerms?: boolean;
  isBlocked?: boolean;
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
