import type { ApiResponseDto } from "../types/common";
import type { OrderResponse, PendingOrder } from "../types/order";
import { client } from "./client";

export const orderApi = {
  getPendingOrders: async (): Promise<ApiResponseDto<PendingOrder[]>> => {
    const res = await client.get("/orders/pending");
    return res.data;
  },
  completeOrderByDeposit: async (
    orderId: string
  ): Promise<ApiResponseDto<PendingOrder>> => {
    const res = await client.post(`/orders/${orderId}/complete/deposit`);
    return res.data;
  },

  getSoldOrders: async (): Promise<ApiResponseDto<OrderResponse[]>> => {
    const res = await client.get("/order/sold");
    return res.data;
  },

  getBoughtOrders: async (): Promise<ApiResponseDto<OrderResponse[]>> => {
    const res = await client.get("/order/bought");
    return res.data;
  },
};
