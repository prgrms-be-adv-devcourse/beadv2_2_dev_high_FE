import type {
  ApiResponseDto,
  CancelPaymentRequest,
  DepositOrderInfo,
  DepositOrderStatus,
  PagedApiResponse,
  PagedDepositPaymentFailureHistoryResponse,
  PagedDepositPaymentResponse,
} from "@moreauction/types";
import { authClient, client } from "@/apis/client";

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
    method?: string;
    startFrom?: string;
    startTo?: string;
  }): Promise<ApiResponseDto<PagedDepositPaymentResponse>> => {
    const res = await client.get("/payments", { params });
    return res.data;
  },
  getDepositOrders: async (params?: {
    id?: string;
    page?: number;
    size?: number;
    sort?: string | string[];
    userId?: string;
    status?: string;
    type?: string;
    createdAt?: string;
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
  cancelPaymentOrders: async (
    params: CancelPaymentRequest,
  ): Promise<ApiResponseDto<DepositOrderInfo>> => {
    const res = await authClient.post(`/payments/orders/cancel`, params);
    return res.data;
  },
};
