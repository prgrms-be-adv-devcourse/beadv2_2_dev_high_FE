import type { ApiResponseDto, PagedApiResponse } from "@moreauction/types";
import type { OrderResponse, OrderStatus } from "@moreauction/types";
import { client } from "@/apis/client";

export type OrderAdminSearchFilter = {
  orderId?: string;
  sellerId?: string;
  buyerId?: string;
  auctionId?: string;
  status?: OrderStatus;
  payYn?: string;
  createdFrom?: string;
  createdTo?: string;
};

type OrderListParams = {
  page?: number;
  size?: number;
  sort?: string | string[];
  filter?: OrderAdminSearchFilter;
};

type OrderUpdateRequest = {
  status?: OrderStatus;
};

const extractData = <T>(payload: ApiResponseDto<T> | T): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiResponseDto<T>).data;
  }
  return payload as T;
};

export const adminOrderApi = {
  getOrders: async (
    params: OrderListParams
  ): Promise<PagedApiResponse<OrderResponse>> => {
    const response = await client.get("/admin/orders", {
      params: {
        page: params.page,
        size: params.size,
        sort: params.sort,
        ...(params.filter ?? {}),
      },
    });
    return extractData<PagedApiResponse<OrderResponse>>(response.data);
  },
  updateOrder: async (
    orderId: string,
    payload: OrderUpdateRequest
  ): Promise<ApiResponseDto<OrderResponse>> => {
    const response = await client.patch(`/admin/orders/${orderId}`, payload);
    return response.data;
  },
  deleteOrder: async (orderId: string): Promise<ApiResponseDto<null>> => {
    const response = await client.delete(`/admin/orders/${orderId}`);
    return response.data;
  },
};
