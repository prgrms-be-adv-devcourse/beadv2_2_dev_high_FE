import type { ApiResponseDto } from "../types/common";
import type { SettlementResponse } from "../types/settlement";
import { client } from "./client";

export const settlementApi = {
  /**
   * 셀러 정산 내역 조회
   * GET /settlement/history?sellerId={sellerId}
   */
  getSettlementHistory: async (): Promise<
    ApiResponseDto<SettlementResponse[]>
  > => {
    const res = await client.get<ApiResponseDto<SettlementResponse[]>>(
      "/settle/history"
    );
    return res.data;
  },
};
