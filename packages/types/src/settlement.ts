import type { PagedApiResponse } from "./common";

export const SettlementStatus = {
  WAITING: "WAITING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type SettlementStatus = string;

export type DepositStatus = string;

export interface SettlementResponse {
  id: string;
  settlementGroupId?: string;
  orderId: string;
  sellerId: string;
  buyerId: string;
  auctionId: string;
  winningAmount: number;
  charge: number;
  finalAmount: number;
  dueDate?: string;
  status: SettlementStatus;
  payYn: string;
  inputDate: string;
  completeDate: string;
  lastUpdateDate: string;
}

export interface SettlementSummary {
  id: string;
  sellerId: string;
  settlementDate: string;
  totalCharge: number;
  totalFinalAmount: number;
  paidCharge: number;
  paidFinalAmount: number;
  depositStatus: DepositStatus;
  createdAt: string;
  updateDate: string;
}

export type PagedSettlementResponse = PagedApiResponse<SettlementResponse>;

export type PagedSettlementSummary = PagedApiResponse<SettlementSummary>;
