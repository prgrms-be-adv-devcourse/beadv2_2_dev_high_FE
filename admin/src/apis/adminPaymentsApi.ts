import type {
  ApiResponseDto,
  DepositOrderInfo,
  DepositOrderStatus,
  PagedApiResponse,
  PagedDepositPaymentFailureHistoryResponse,
  PagedDepositPaymentResponse,
} from "@moreauction/types";
import { client } from "@/apis/client";

export const adminPaymentsApi = {
  updateDepositOrderStatus: async (params: {
    id: string;
    status: DepositOrderStatus;
  }): Promise<ApiResponseDto<DepositOrderInfo>> => {
    const res = await client.patch("/payments/orders/status", params);
    return res.data;
  },
  getDepositPayments: async (params?: {
    page?: number;
    size?: number;
    sort?: string | string[];
    userId?: string;
    status?: string;
    startFrom?: string;
    startTo?: string;
  }): Promise<ApiResponseDto<PagedDepositPaymentResponse>> => {
    const res = await client.get("/payments", { params });
    return res.data;
  },
  getDepositOrders: async (params?: {
    page?: number;
    size?: number;
    sort?: string | string[];
    userId?: string;
    status?: string;
    startFrom?: string;
    startTo?: string;
  }): Promise<ApiResponseDto<PagedApiResponse<DepositOrderInfo>>> => {
    const res = await client.get("/payments/order", { params });
    return res.data;
  },
  getPaymentFailureHistory: async (params?: {
    page?: number;
    size?: number;
    sort?: string | string[];
  }): Promise<ApiResponseDto<PagedDepositPaymentFailureHistoryResponse>> => {
    const res = await client.get("/payments/fail/list", { params });
    return res.data;
  },
};
