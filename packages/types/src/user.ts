export const UserRole = {
  ADMIN: "ADMIN",
  SELLER: "SELLER",
  USER: "USER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export type UserRoles = UserRole[];
export type UserRoleValue = UserRole | UserRoles;
export const normalizeRoles = (roles?: UserRoleValue): UserRoles =>
  Array.isArray(roles) ? roles : roles ? [roles] : [];
export const hasRole = (roles: UserRoleValue | undefined, role: UserRole) =>
  normalizeRoles(roles).includes(role);
export interface User {
  userId?: string;
  name?: string;
  email?: string;
  nickname?: string;
  roles?: UserRoles;
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

export type SocialProvider = "google" | "naver";

export interface SocialLoginRequest {
  provider: SocialProvider;
  code: string;
  state?: string;
}

// 로그인 응답 데이터 타입 (API 명세에 따라 실제 타입으로 교체)
export interface LoginResponse {
  accessToken: string;
  userId: string;
  nickname: string;
  roles: UserRoles;
}

// 회원가입 요청 파라미터 타입 (API 명세에 따라 실제 타입으로 교체)
export interface SignupParams {
  email: string;
  password: string;
  name: string;
  nickname: string;
  phone_number: string;
}

// 판매자 등록 요청 파라미터 타입 (API 명세에 따라 실제 타입으로 교체)
export interface RegisterSellerParams {
  bankName: string;
  bankAccount: string;
}
