import type { User } from "../contexts/AuthContext";
import { client, type ApiResponseDto } from "./client";

// 로그인 요청 파라미터 타입
export interface LoginParams {
  email: string;
  password: string;
}

// 로그인 응답 데이터 타입 (API 명세에 따라 실제 타입으로 교체)
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user?: User;
}

// 회원가입 요청 파라미터 타입 (API 명세에 따라 실제 타입으로 교체)
export interface SignupParams {
  email: string;
  password: string;
  name: string;
  nickname: string;
  phone_number: string;
  zip_code: string;
  state: string;
  city: string;
  detail: string;
}

// 판매자 등록 요청 파라미터 타입 (API 명세에 따라 실제 타입으로 교체)
export interface RegisterSellerParams {
  bankName: string;
  bankAccount: string;
}

/**
 * 사용자 관련 API 함수들
 */
export const userApi = {
  /**
   * 이메일과 비밀번호로 로그인합니다.
   * @param params - { email, password }
   */
  login: async (
    params: LoginParams
  ): Promise<ApiResponseDto<LoginResponse>> => {
    console.log("로그인 시도:", params);
    const response = await client.post("/auth/login", params);

    return response.data;
  },

  /**
   * 회원가입을 요청합니다.
   * @param params - 회원가입 폼 데이터
   */
  signup: async (params: SignupParams): Promise<ApiResponseDto<any>> => {
    console.log("회원가입 시도:", params);
    const response = await client.post("/users/signup", params);
    return response.data;
    // --- Mock 데이터 (실제 API 연결 시 주석 처리 또는 제거) ---
    /*
    return Promise.resolve({
      data: {
        id: "new-user-id",
        ...params,
      },
    });
    */
  },

  /**
   * 판매자 등록을 요청합니다.
   * @param params - 판매자 등록 폼 데이터
   */
  registerSeller: async (
    params: RegisterSellerParams
  ): Promise<ApiResponseDto<any>> => {
    console.log("판매자 등록 시도:", params);
    const response = await client.post("/sellers", params);
    return response.data;
  },
};
