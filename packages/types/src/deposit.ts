import type { PagedApiResponse } from "./common";

export const DepositType = {
  CHARGE: "CHARGE",
  USAGE: "USAGE",
  DEPOSIT: "DEPOSIT",
  REFUND: "REFUND",
  PAYMENT: "PAYMENT",
} as const;

export type DepositType = (typeof DepositType)[keyof typeof DepositType];

export const DepositOrderStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCEL_PENDING: "CANCEL_PENDING",
  CANCELLED: "CANCELLED",
} as const;

export type DepositOrderType =
  (typeof DepositOrderTypes)[keyof typeof DepositOrderTypes];

export const DepositOrderTypes = {
  DEPOSIT_CHARGE: "DEPOSIT_CHARGE",
  ORDER_PAYMENT: "ORDER_PAYMENT",
} as const;

export type DepositOrderStatus =
  (typeof DepositOrderStatus)[keyof typeof DepositOrderStatus];

export interface DepositInfo {
  userId: string;
  balance: number; //현재잔액
}
export interface DepositHstRequest {
  userId?: string;
  depositOrderId?: string;
  type: DepositType;
  amount: number;
}

export interface DepositOrderInfo {
  id: string;
  userId: String;
  amount: number;
  deposit?: number;
  paidAmount?: number;
  status: DepositOrderStatus;
  createdAt: string;
  updatedAt: string;
  type?: DepositOrderType;
}

export type DepositPaymentStatus =
  | "READY"
  | "IN_PROGRESS"
  | "CONFIRMED"
  | "CANCELED"
  | "FAILED"
  | "CONFIRMED_FAILED";

export const DepositPaymentStatuses: Record<string, string> = {
  READY: "결제 준비",
  IN_PROGRESS: "결제 진행 중",
  CONFIRMED: "승인 완료",
  CANCELED: "결제 취소",
  FAILED: "결제 실패",
  CONFIRMED_FAILED: "결제 승인 실패",
};

export interface DepositPaymentDetail {
  id: string;
  orderId: string;
  userId: string;
  paymentKey: string;
  method: string;
  amount: number;
  requestedAt: string;
  status: DepositPaymentStatus;
  approvalNum?: string | null;
  approvedAt?: string | null;
  canceledAt?: string | null;
  createdAt?: string | null;
}

export type PagedDepositPaymentResponse =
  PagedApiResponse<DepositPaymentDetail>;

export interface DepositPaymentFailureHistoryDetail {
  id: number;
  orderId: string;
  userId: string;
  code?: string | null;
  message?: string | null;
}

export type PagedDepositPaymentFailureHistoryResponse =
  PagedApiResponse<DepositPaymentFailureHistoryDetail>;

export interface DepositPaymentFailureHistorySearchRequest {
  orderId?: string;
  userId?: string;
}
/**
 * /deposit/histories/me 응답 레코드 (DepositHistoryInfo)
 */
export interface DepositHistory {
  id: number;
  userId: string;
  depositOrderId: string;
  type: DepositType;
  amount: number;
  balance: number;
  createdAt: string; // ISO 문자열로 직렬화된 LocalDateTime
}

export type PagedDepositHistoryResponse = PagedApiResponse<DepositHistory>;

export interface PaymentSuccessReqeuest {
  paymentKey: string;
  orderId: string;
  amount: number;
  winningOrderId?: string;
}

export interface PaymentFailReqeuest {
  code?: string;
  message?: string;
  orderId?: string;
  userId?: string;
}

export interface CancelPaymentRequest {
  id: string;
  cancelReason?: string;
}
