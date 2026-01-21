export const UserRole = {
  ADMIN: "ADMIN",
  SELLER: "SELLER",
  USER: "USER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export interface User {
  userId?: string;
  name?: string;
  email?: string;
  nickname?: string;
  role?: UserRole;
  phone_number?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  detail?: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

// 로그인 응답 데이터 타입 (API 명세에 따라 실제 타입으로 교체)
export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  role?: UserRole;
  nickname?: string;
  userId?: string;
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
