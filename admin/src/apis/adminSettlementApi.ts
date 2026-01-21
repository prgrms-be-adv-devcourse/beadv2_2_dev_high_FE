import type { ApiResponseDto } from "@moreauction/types";
import {
  SettlementStatus,
  type PagedSettlementResponse,
  type PagedSettlementSummary,
  type SettlementSummary,
} from "@moreauction/types";
import { client } from "@/apis/client";

export type SettlementAdminSearchFilter = {
  sellerId?: string;
  settlementDateFrom?: string;
  settlementDateTo?: string;
};

type SettlementListParams = {
  page?: number;
  size?: number;
  sort?: string | string[];
  filter?: SettlementAdminSearchFilter;
};

type SettlementUpdateRequest = {
  id: string;
  status: SettlementStatus;
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
  ): Promise<PagedSettlementSummary> => {
    const response = await client.get("/admin/settles", {
      params: {
        page: params.page,
        size: params.size,
        sort: params.sort,
        ...(params.filter ?? {}),
      },
    });
    return extractData<PagedSettlementSummary>(response.data);
  },
  getSettlementGroupItems: async (
    groupId: string,
    params?: {
      page?: number;
      size?: number;
      sort?: string | string[];
    }
  ): Promise<PagedSettlementResponse> => {
    const response = await client.get(`/admin/settles/group/${groupId}/items`, {
      params,
    });
    return extractData<PagedSettlementResponse>(response.data);
  },
  createSettlement: async (orderId: string): Promise<ApiResponseDto<null>> => {
    const response = await client.post(`/admin/settles/${orderId}`);
    return response.data;
  },
  runSettlementBatch: async (
    status: SettlementStatus = SettlementStatus.WAITING
  ): Promise<ApiResponseDto<null>> => {
    const response = await client.post("/admin/settles/run", null, {
      params: { status },
    });
    return response.data;
  },
  updateSettlement: async (
    payload: SettlementUpdateRequest
  ): Promise<ApiResponseDto<null>> => {
    const response = await client.patch("/admin/settles", payload);
    return response.data;
  },
};
