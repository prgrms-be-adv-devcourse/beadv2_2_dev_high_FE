export const SettlementStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
} as const;

export type SettlementStatus = string;

export interface SettlementResponse {
  id: string;
  orderId: string;
  sellerId: string;
  buyerId: string;
  auctionId: string;
  winningAmount: number;
  charge: number;
  finalAmount: number;
  dueDate: string;
  status: SettlementStatus;
  payYn: string;
  inputDate: string;
  completeDate: string;
  lastUpdateDate: string;
}

