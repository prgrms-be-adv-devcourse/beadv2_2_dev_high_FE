import type {
  ApiResponseDto,
  DepositHstRequest,
  DepositInfo,
  DepositOrderInfo,
  PagedDepositHistoryResponse,
  PagedDepositPaymentFailureHistoryResponse,
  PagedDepositPaymentResponse,
  DepositPaymentFailureHistorySearchRequest,
  PaymentFailReqeuest,
  PaymentSuccessReqeuest,
  DepositType,
} from "@moreauction/types";
import { client } from "@/apis/client";

export const depositApi = {
  /**
   * 사용자 예치금계좌조회
   */
  getAccount: async (userId?: string): Promise<ApiResponseDto<DepositInfo>> => {
    console.log("사용자 예치금 계좌 조회 API 호출:", userId);
    const response = await client.get(`/deposit/me`);
    return response.data;
  },

  /**
   * 예치금계좌 생성 (최초 1회)
   * @param userId - user ID
   */
  createAccount: async (
    userId?: string
  ): Promise<ApiResponseDto<DepositInfo>> => {
    console.log(`예치금 계좌 생성 API 호출 (ID: ${userId})`);
    const response = await client.post(`/deposit`, { userId });
    return response.data;
  },

  /**
   *
   * @param userId
   * @returns
   */
  createDeposit: async (
    params: DepositHstRequest
  ): Promise<ApiResponseDto<DepositInfo>> => {
    const response = await client.post(`/deposit/usages`, params);
    return response.data;
  },

  createDepositChargeOrder: async (params: {
    amount: number;
  }): Promise<ApiResponseDto<DepositOrderInfo>> => {
    const res = await client.post(`/payments/orders/deposit-charge`, {
      amount: params.amount,
    });

    return res.data;
  },
  createOrderPayment: async (params: {
    amount: number;
    deposit?: number;
  }): Promise<ApiResponseDto<DepositOrderInfo>> => {
    const res = await client.post(`/payments/orders/order-payment`, {
      amount: params.amount,
      deposit: params.deposit,
    });

    return res.data;
  },
  getPurchaseOrder: async (
    purchaseOrderId: string
  ): Promise<ApiResponseDto<DepositOrderInfo>> => {
    const res = await client.get(`/payments/orders/${purchaseOrderId}`);

    return res.data;
  },
  payOrderByDeposit: async (params: {
    id: string;
    winningOrderId?: string;
  }): Promise<ApiResponseDto<DepositOrderInfo>> => {
    const res = await client.post(`/payments/orders/pay-by-deposit`, params);

    return res.data;
  },
  paymentSuccess: async (
    params: PaymentSuccessReqeuest
  ): Promise<ApiResponseDto<unknown>> => {
    const res = await client.post(`/payments/confirm`, params);

    return res.data;
  },

  paymentFail: async (
    params: PaymentFailReqeuest
  ): Promise<ApiResponseDto<unknown>> => {
    const res = await client.post(`/payments/fail`, params);

    return res.data;
  },

  /**
   * /deposit/histories/me - 예치금 이력(충전/사용) 조회
   * 페이징 응답을 그대로 반환합니다. (ApiResponseDto로 감싸져 있지 않음)
   */
  getDepositHistories: async (params?: {
    type?: DepositType;
    page?: number;
    size?: number;
  }): Promise<ApiResponseDto<PagedDepositHistoryResponse>> => {
    const res = await client.get("/deposit/histories/me", { params });
    return res.data;
  },

  /**
   * /deposit/payments/me - 예치금 결제 내역 조회
   */
  getDepositPayments: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<ApiResponseDto<PagedDepositPaymentResponse>> => {
    const res = await client.get("/payments/me", { params });
    return res.data;
  },

  /**
   * /deposit/payments/fail/search/user/userId - 결제 실패 내역 조회
   */
  getDepositPaymentFailuresByUser: async (
    request: DepositPaymentFailureHistorySearchRequest,
    params?: { page?: number; size?: number; sort?: string }
  ): Promise<ApiResponseDto<PagedDepositPaymentFailureHistoryResponse>> => {
    const res = await client.post(
      "/payments/fail/search/user/userId",
      request,
      { params }
    );
    return res.data;
  },

  /**
   * /deposit/payments/fail/paymentId - 결제 실패 내역(주문 ID 기준)
   */
  getDepositPaymentFailuresByOrderId: async (
    request: DepositPaymentFailureHistorySearchRequest,
    params?: { page?: number; size?: number; sort?: string }
  ): Promise<ApiResponseDto<PagedDepositPaymentFailureHistoryResponse>> => {
    const res = await client.post("/payments/fail/paymentId", request, {
      params,
    });
    return res.data;
  },
};
