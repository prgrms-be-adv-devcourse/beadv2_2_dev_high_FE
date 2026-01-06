import axios, { type AxiosInstance } from "axios";
import type { ApiResponseDto } from "@moreauction/types";

interface CreateApiClientOptions {
  baseUrl: string;
  onUpdateToken: (token: string | null) => void;
}

let refreshFailed = false;
let refreshPromise: Promise<string | null> | null = null;

const refreshToken = async (baseUrl: string): Promise<string | null> => {
  try {
    const response = await axios.post(
      `${baseUrl}/auth/refresh/token`,
      {},
      {
        withCredentials: true,
      }
    );
    const data = response.data as ApiResponseDto<{ accessToken: string }>;
    const newAccessToken = data.data.accessToken;
    localStorage.setItem("accessToken", newAccessToken);
    return newAccessToken;
  } catch (error) {
    console.error("토큰 재발급 실패:", error);
    return null;
  }
};

export const createApiClient = ({
  baseUrl,
  onUpdateToken,
}: CreateApiClientOptions): AxiosInstance => {
  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  client.interceptors.request.use(
    (config) => {
      const skipAuth = (config as { skipAuth?: boolean }).skipAuth;
      if (!skipAuth) {
        const token = localStorage.getItem("accessToken");
        if (token) {
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      } else if (config.headers) {
        delete (config.headers as Record<string, string>).Authorization;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (!error?.response) {
        const isOffline =
          typeof navigator !== "undefined" && navigator?.onLine === false;
        const errorCode = error?.code as string | undefined;
        const kind = isOffline
          ? "offline"
          : errorCode === "ECONNABORTED" || errorCode === "ETIMEDOUT"
          ? "timeout"
          : "server_down";
        const message =
          kind === "offline"
            ? "현재 오프라인입니다. 네트워크 상태를 확인해 주세요."
            : kind === "timeout"
            ? "요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."
            : "요청을 보낼 수 없습니다. 네트워크 상태를 확인해 주세요.";
        return Promise.reject({
          kind,
          code: errorCode,
          message,
          originalError: error,
        });
      }

      const originalRequest = error.config;

      const skipAuth = (originalRequest as { skipAuth?: boolean }).skipAuth;
      if (skipAuth) {
        return Promise.reject(error.response ?? error);
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          if (refreshFailed) {
            return Promise.reject(error.response ?? error);
          }

          if (!refreshPromise) {
            refreshPromise = refreshToken(baseUrl).finally(() => {
              refreshPromise = null;
            });
          }
          const newToken = await refreshPromise;

          if (newToken) {
            refreshFailed = false;
            onUpdateToken(newToken);
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            return client(originalRequest);
          }

          refreshFailed = true;
          localStorage.setItem("sessionExpired", "true");
          onUpdateToken(null);
          throw new Error("토큰 재발급 실패");
        } catch (err) {
          return Promise.reject(err);
        }
      }

      return Promise.reject(error.response ?? error);
    }
  );

  return client;
};
