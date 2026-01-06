import type { ApiResponseDto } from "@moreauction/types";
import type { OrderResponse, OrderStatus } from "@moreauction/types";
import { client } from "./client";

export const orderApi = {
  getOrderByStatus: async (
    type: "sold" | "bought",
    status?: OrderStatus
  ): Promise<ApiResponseDto<OrderResponse[]>> => {
    const res = await client.get("/orders", { params: { status, type } });
    return res.data;
  },

  getOrderDetail: async (
    orderId: string
  ): Promise<ApiResponseDto<OrderResponse>> => {
    const res = await client.get(`/orders/${orderId}`);
    return res.data;
  },

  getStatusCount: async (
    status: OrderStatus
  ): Promise<ApiResponseDto<number>> => {
    const res = await client.get("/orders/count", { params: { status } });

    return res.data;
  },
};
