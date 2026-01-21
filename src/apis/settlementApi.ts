import type { ApiResponseDto } from "../types/common";
import type {
  PagedSettlementResponse,
  PagedSettlementSummary,
} from "../types/settlement";
import { client } from "./client";

export const settlementApi = {
  /**
   * 셀러 정산 내역 조회
   * GET /settlement/history?sellerId={sellerId}
   */
  getSettlementHistory: async (params?: {
    page?: number;
    size?: number;
    sort?: string[];
  }): Promise<ApiResponseDto<PagedSettlementResponse>> => {
    const res = await client.get<ApiResponseDto<PagedSettlementResponse>>(
      "/settle",
      { params }
    );
    return res.data;
  },

  getSettlementSummary: async (params?: {
    page?: number;
    size?: number;
    sort?: string[];
  }): Promise<ApiResponseDto<PagedSettlementSummary>> => {
    const res = await client.get<ApiResponseDto<PagedSettlementSummary>>(
      "/settle/summary",
      { params }
    );
    return res.data;
  },
};
