export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  rating: number;
  reviewsCount: number;
  isVerified: boolean;
  createdAt: any;
}

export type OrderStatus = 'pending' | 'escrowed' | 'delivered' | 'completed' | 'disputed' | 'cancelled';

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  title: string;
  description: string;
  amount: number;
  status: OrderStatus;
  category: string;
  visibility: 'public' | 'private';
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
