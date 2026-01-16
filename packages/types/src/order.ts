export const OrderStatus = {
  UNPAID: "UNPAID", // 구매대기(미결제)
  PAID: "PAID", // 구매완료
  SHIP_STARTED: "SHIP_STARTED", // 배송중
  SHIP_COMPLETED: "SHIP_COMPLETED", // 배송완료
  UNPAID_CANCEL: "UNPAID_CANCEL", // 구매기한 만료로 취소
  CONFIRM_BUY: "CONFIRM_BUY", // 구매확정
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  [OrderStatus.UNPAID]: "구매 대기",
  [OrderStatus.PAID]: "구매 완료",
  [OrderStatus.SHIP_STARTED]: "배송중",
  [OrderStatus.SHIP_COMPLETED]: "배송완료",
  [OrderStatus.UNPAID_CANCEL]: "구매기한 만료",
  [OrderStatus.CONFIRM_BUY]: "구매확정",
};

export function getOrderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status;
}

// 주문/낙찰 내역 응답
export interface OrderResponse {
  id: string;
  sellerId: string;
  buyerId: string;
  auctionId: string;
  deletedYn?: boolean | "Y" | "N";
  winningAmount: number;
  confirmDate?: string | null;
  status: OrderStatus;
  payCompleteDate?: string | null;
  payLimitDate?: string | null;
  createdAt: string;
  updatedAt: string;
  depositAmount?: number;
  productName?: string;
}
