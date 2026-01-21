import axios, { type AxiosInstance } from "axios";
import type { ApiResponseDto } from "@moreauction/types";

interface CreateApiClientOptions {
  baseUrl: string;
  onUpdateToken: (token: string | null) => void;
}

const refreshToken = async (baseUrl: string): Promise<string | null> => {
  try {
    const refreshTokenValue = localStorage.getItem("refreshToken");
    if (!refreshTokenValue) {
      return null;
    }
    const response = await axios.post(`${baseUrl}/auth/refresh/token`, {
      refreshToken: refreshTokenValue,
    });
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
  });

  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await refreshToken(baseUrl);

          if (newToken) {
            onUpdateToken(newToken);
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            return client(originalRequest);
          }

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
