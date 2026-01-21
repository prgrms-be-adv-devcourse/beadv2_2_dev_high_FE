import { createApiClient } from "@moreauction/api-client";
import { updateAccessTokenOutsideReact } from "@moreauction/auth";

// API 서버의 기본 URL
// - VITE_API_BASE_URL 없으면 http://localhost:8000
// - /api/v1은 공통으로 붙음
const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;

/**
 * 기본 axios 인스턴스입니다.
 * 모든 API 요청에 이 인스턴스를 사용합니다.
 *
 * @example
 * client.get('/users');
 */
export const client = createApiClient({
  baseUrl: API_BASE_URL + "/admin",
  refreshTokenUrl: `${API_BASE_URL}/auth/refresh/token`,
  onUpdateToken: updateAccessTokenOutsideReact,
});

export const authClient = createApiClient({
  baseUrl: API_BASE_URL,
  onUpdateToken: updateAccessTokenOutsideReact,
});
