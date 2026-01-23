import type { ApiResponseDto, PagedApiResponse } from "@moreauction/types";
import type { OrderResponse, OrderStatus } from "@moreauction/types";
import { client } from "@/apis/client";

export const orderApi = {
  getOrderByStatus: async (
    type: "sold" | "bought",
    status?: OrderStatus,
    params?: { page?: number; size?: number; sort?: string | string[] },
  ): Promise<ApiResponseDto<PagedApiResponse<OrderResponse>>> => {
    const res = await client.get("/orders", {
      params: {
        status,
        type,
        page: params?.page,
        size: params?.size,
        sort: params?.sort,
      },
    });
    return res.data;
  },

  getOrderDetail: async (
    orderId: string,
  ): Promise<ApiResponseDto<OrderResponse>> => {
    const res = await client.get(`/orders/${orderId}`);
    return res.data;
  },

  getStatusCount: async (
    status: OrderStatus,
  ): Promise<ApiResponseDto<number>> => {
    const res = await client.get("/orders/count", { params: { status } });

    return res.data;
  },
  updateAddress: async (
    orderId: string,
    addressId: string,
  ): Promise<ApiResponseDto<OrderResponse>> => {
    const res = await client.patch(`/orders/${orderId}/address`, {
      addressId,
    });
    return res.data;
  },
  updateOrderStatus: async (
    id: string,
    status: OrderStatus,
  ): Promise<ApiResponseDto<OrderResponse>> => {
    const res = await client.put(`/orders`, { id, status });
    return res.data;
  },
};
