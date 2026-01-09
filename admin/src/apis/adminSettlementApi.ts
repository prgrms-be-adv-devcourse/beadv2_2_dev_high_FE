import type { ApiResponseDto, PagedApiResponse } from "@moreauction/types";
import type {
  SettlementResponse,
  SettlementStatus,
} from "@moreauction/types";
import { client } from "@/apis/client";

export type SettlementAdminSearchFilter = {
  settlementId?: string;
  orderId?: string;
  sellerId?: string;
  buyerId?: string;
  auctionId?: string;
  status?: SettlementStatus;
  completeYn?: string;
  createdFrom?: string;
  createdTo?: string;
  completeFrom?: string;
  completeTo?: string;
};

type SettlementListParams = {
  page?: number;
  size?: number;
  sort?: string | string[];
  filter?: SettlementAdminSearchFilter;
};

type SettlementUpdateRequest = {
  status?: SettlementStatus;
};

const extractData = <T>(payload: ApiResponseDto<T> | T): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiResponseDto<T>).data;
  }
  return payload as T;
};

export const adminSettlementApi = {
  getSettlements: async (
    params: SettlementListParams
  ): Promise<PagedApiResponse<SettlementResponse>> => {
    const response = await client.get("/admin/settles", {
      params: {
        page: params.page,
        size: params.size,
        sort: params.sort,
        ...(params.filter ?? {}),
      },
    });
    return extractData<PagedApiResponse<SettlementResponse>>(response.data);
  },
  updateSettlement: async (
    settlementId: string,
    payload: SettlementUpdateRequest
  ): Promise<ApiResponseDto<SettlementResponse>> => {
    const response = await client.patch(
      `/admin/settles/${settlementId}`,
      payload
    );
    return response.data;
  },
  deleteSettlement: async (
    settlementId: string
  ): Promise<ApiResponseDto<null>> => {
    const response = await client.delete(`/admin/settles/${settlementId}`);
    return response.data;
  },
};
