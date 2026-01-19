import type { ApiResponseDto } from "@moreauction/types";
import type {
  LoginParams,
  LoginResponse,
  RegisterSellerParams,
  SignupParams,
  User,
} from "@moreauction/types";
import { client } from "./client";

// 로그인 요청 파라미터 타입

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

  /**
   * 현재 로그인된 사용자 정보를 조회합니다.
   */
  getMe: async (): Promise<ApiResponseDto<User>> => {
    console.log("현재 사용자 정보 조회 API 호출");
    const response = await client.get("/users/profile");
    return response.data;
  },
  getSellerInfo: async (): Promise<ApiResponseDto<any>> => {
    const res = await client.get("/sellers/profile");
    return res.data;
  },
  /**
   * 이메일 인증 코드를 전송합니다.
   * @param email - 인증 코드를 받을 이메일 주소
   */
  sendVerificationEmail: async (
    email: string
  ): Promise<ApiResponseDto<any>> => {
    console.log(`이메일 인증 코드 전송 시도: ${email}`);
    const response = await client.post("/auth/send/email", { email });
    return response.data;
  },

  /**
   * 이메일 인증 코드를 확인합니다.
   * @param email - 인증 코드를 확인 할 이메일
   * @param code - 사용자가 입력한 인증 코드
   */
  verifyEmailCode: async (
    email: string,
    code: string
  ): Promise<ApiResponseDto<any>> => {
    console.log(`이메일 인증 코드 확인 시도: ${email}, 코드: ${code}`);
    const response = await client.post("/auth/verify/email", { email, code });
    return response.data;
  },
};
