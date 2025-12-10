export const OrderStatus = {
  UNPAID: "UNPAID",
  PAID: "PAID",
} as const;

export type OrderStatus = string;

export interface PendingOrder {
  id: string;
  productName: string;
  auctionId: string;
  orderPrice: number;
  status: OrderStatus;
  createdAt: string;
}

// 주문/낙찰 내역 응답
export interface OrderResponse {
  id: string;
  sellerId: string;
  buyerId: string;
  auctionId: string;
  winningAmount: number;
  confirmDate?: string | null;
  status: OrderStatus;
  payCompleteDate?: string | null;
  createdAt: string;
  updatedAt: string;
}
