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
  deletedYn?: "Y" | "N" | "all";
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
  id?: string;
  status?: OrderStatus;
};

type PayLimitUpdateRequest = {
  id: string;
  payLimitDate: string;
};

type OrderCreateRequest = {
  sellerId: string;
  buyerId: string;
  productId: string;
  productName: string;
  auctionId: string;
  winningAmount: number;
  depositAmount: number;
  winningDate: string;
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
  getOrdersCount: async (
    status?: OrderStatus
  ): Promise<ApiResponseDto<number>> => {
    const response = await client.get("/admin/orders/count", {
      params: { status },
    });
    return response.data;
  },
  updateOrder: async (
    orderId: string,
    payload: OrderUpdateRequest
  ): Promise<ApiResponseDto<OrderResponse>> => {
    const response = await client.patch(`/admin/orders`, {
      id: orderId,
      ...payload,
    });
    return response.data;
  },
  updatePayLimit: async (
    payload: PayLimitUpdateRequest
  ): Promise<ApiResponseDto<OrderResponse>> => {
    const response = await client.patch(`/admin/orders/pay-limit`, payload);
    return response.data;
  },
  createOrder: async (
    payload: OrderCreateRequest
  ): Promise<ApiResponseDto<OrderResponse>> => {
    const response = await client.post(`/admin/orders`, payload);
    return response.data;
  },
  deleteOrder: async (orderId: string): Promise<ApiResponseDto<null>> => {
    const response = await client.delete(`/admin/orders/${orderId}`);
    return response.data;
  },
};
