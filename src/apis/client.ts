import axios from "axios";
import { updateAccessTokenOutsideReact } from "../contexts/AuthContext";
import type { ApiResponseDto } from "../types/common";

// API 서버의 기본 URL
// - VITE_API_BASE_URL 없으면 http://localhost:8000
// - /api/v1은 공통으로 붙음
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000")
  .replace(/\/$/, "");
const API_BASE_URL = `${API_ORIGIN}/api/v1`;

/**
 * 기본 axios 인스턴스입니다.
 * 모든 API 요청에 이 인스턴스를 사용합니다.
 *
 * @example
 * client.get('/users');
 */
export const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터: 요청을 보내기 전에 수행할 작업을 정의합니다.
// 예를 들어, 모든 요청에 인증 토큰을 추가할 수 있습니다.
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 응답을 받은 후 수행할 작업을 정의합니다.
// 예를 들어, 특정 에러 코드에 대한 전역 처리를 할 수 있습니다.

client.interceptors.response.use(
  (response) => {
    // 응답 데이터가 있는 경우 그대로 반환합니다.
    return response;
  },
  async (error) => {
    // HTTP 상태 코드가 2xx 범위를 벗어나는 경우 이곳에서 처리됩니다.

    const originalRequest = error.config;

    // 401 에러 && 아직 재시도 안함
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // 무한 루프 방지

      try {
        const newToken = await refreshToken(); // 재발급 대기

        if (newToken) {
          updateAccessTokenOutsideReact(newToken); // 상태 갱신

          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return client(originalRequest); // 재시도
        } else {
          // 리프레시 토큰으로도 재발급 실패 -> 실제 로그아웃 처리
          // 세션 만료 플래그를 남겨서 AuthContext에서 한 번만 안내를 띄운다.
          localStorage.setItem("sessionExpired", "true");
          updateAccessTokenOutsideReact(null); // 상태 갱신

          throw new Error("토큰 재발급 실패");
        }
      } catch (err) {
        return Promise.reject(err); // 재발급 실패
      }
    }
    return Promise.reject(error.response ?? error);
  }
);

// 토큰 재발급 함수 예시
async function refreshToken() {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      return null; // 리프레시 토큰이 없으면 재발급 불가
    }
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh/token`,
      { refreshToken }
      // { withCredentials: true }
    );
    const data = response.data as ApiResponseDto<{ accessToken: string }>;
    const newAccessToken = data.data.accessToken;
    localStorage.setItem("accessToken", newAccessToken);
    return newAccessToken;
  } catch (err) {
    console.error("토큰 재발급 실패:", err);

    return null; // 재발급 실패
  }
}
