import type {
  DepositHstRequest,
  DepositInfo,
  DepositOrderInfo,
  PagedDepositHistoryResponse,
  PaymentFailReqeuest,
  PaymentSuccessReqeuest,
} from "../types/deposit";
import type { ApiResponseDto } from "../types/common";
import { client } from "./client";

export const depositApi = {
  /**
   * 사용자 예치금계좌조회
   */
  getAccount: async (userId?: string): Promise<DepositInfo> => {
    console.log("사용자 예치금 계좌 조회 API 호출:", userId);
    const response = await client.get(`/deposit/me`);
    return response.data;
  },

  /**
   * 예치금계좌 생성 (최초 1회)
   * @param userId - user ID
   */
  createAccount: async (userId?: string): Promise<DepositInfo> => {
    console.log(`예치금 계좌 생성 API 호출 (ID: ${userId})`);
    const response = await client.post(`/deposit`, { userId });
    return response.data;
  },

  /**
   *
   * @param userId
   * @returns
   */
  createDeposit: async (params: DepositHstRequest): Promise<DepositInfo> => {
    const response = await client.post(`/deposit/usages`, params);
    return response.data;
  },

  createDepositOrder: async (amount: number): Promise<DepositOrderInfo> => {
    const res = await client.post(`/deposit/orders`, { amount });

    return res.data;
  },
  paymentSuccess: async (params: PaymentSuccessReqeuest): Promise<any> => {
    const res = await client.post(`/deposit/payments/confirm`, params);

    return res.data;
  },

  paymentFail: async (params: PaymentFailReqeuest): Promise<any> => {
    const res = await client.post(`/deposit/payments/fail`, params);

    return res.data;
  },

  /**
   * /deposit/histories/me - 예치금 이력(충전/사용) 조회
   * 페이징 응답을 그대로 반환합니다. (ApiResponseDto로 감싸져 있지 않음)
   */
  getDepositHistories: async (params?: {
    page?: number;
    size?: number;
  }): Promise<PagedDepositHistoryResponse> => {
    const res = await client.get("/deposit/histories/me", { params });
    return res.data;
  },
};
