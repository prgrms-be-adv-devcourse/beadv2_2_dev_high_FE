import type { ApiResponseDto } from "../types/common";
import type { OrderResponse, OrderStatus } from "../types/order";
import { client } from "./client";

export const orderApi = {
  getOrderByStatus: async (
    type: "sold" | "bought",
    status?: OrderStatus
  ): Promise<ApiResponseDto<OrderResponse[]>> => {
    const res = await client.get("/order", { params: { status, type } });
    return res.data;
  },

  getOrderDetail: async (
    orderId: string
  ): Promise<ApiResponseDto<OrderResponse>> => {
    const res = await client.get(`/order/${orderId}`);
    return res.data;
  },

  getStatusCount: async (
    status: OrderStatus
  ): Promise<ApiResponseDto<number>> => {
    const res = await client.get("/order/count", { params: { status } });

    return res.data;
  },
};
