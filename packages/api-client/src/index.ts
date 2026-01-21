import axios, { type AxiosInstance, type AxiosRequestHeaders } from "axios";
import type {
  ApiResponseDto,
  FileGroup,
  ProductCategory,
} from "@moreauction/types";

interface CreateApiClientOptions {
  baseUrl: string;
  onUpdateToken: (token: string | null) => void;
  refreshTokenUrl?: string;
}

let refreshFailed = false;
let refreshPromise: Promise<string | null> | null = null;

const refreshToken = async (refreshUrl: string): Promise<string | null> => {
  try {
    const response = await axios.post(
      refreshUrl,
      {},
      {
        withCredentials: true,
      }
    );
    const res: any = response.data as ApiResponseDto<{ accessToken: string }>;
    const newAccessToken = res?.data?.accessToken ?? null;
    if (typeof newAccessToken === "string" && newAccessToken.length > 0) {
      localStorage.setItem("accessToken", newAccessToken);
      return newAccessToken;
    }
    return null;
  } catch (error) {
    console.error("토큰 재발급 실패:", error);
    return null;
  }
};

export const createApiClient = ({
  baseUrl,
  onUpdateToken,
  refreshTokenUrl,
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
      if (config.data instanceof FormData) {
        delete (config.headers as any)?.["Content-Type"];
        delete (config.headers as any)?.["content-type"];
      }
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
            const refreshUrl =
              refreshTokenUrl ?? `${baseUrl}/auth/refresh/token`;
            refreshPromise = refreshToken(refreshUrl)
              .then((newToken) => {
                if (!newToken) {
                  refreshFailed = true;
                  onUpdateToken(null);
                } else {
                  refreshFailed = false;
                  onUpdateToken(newToken);
                }
                return newToken;
              })
              .finally(() => {
                refreshPromise = null;
              });
          }
          const newToken = await refreshPromise;

          if (newToken) {
            originalRequest.headers = originalRequest.headers ?? {};
            (
              originalRequest.headers as Record<string, string>
            ).Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          }

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

export const createCategoryApi = (client: AxiosInstance) => ({
  getCategories: async (): Promise<ApiResponseDto<ProductCategory[]>> => {
    const response = await client.get("/categories");
    return response.data;
  },
});

export interface UploadedFileInfo {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileGroupId: string;
  createdBy?: string;
  createdAt?: string;
}

export interface FileGroupUploadResponse {
  fileGroupId: string;
  files: UploadedFileInfo[];
}

export const createFileApi = (client: AxiosInstance) => {
  const uploadFiles = async (
    files: File[]
  ): Promise<ApiResponseDto<FileGroupUploadResponse>> => {
    if (!files.length) {
      throw new Error("업로드할 파일이 없습니다.");
    }
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await client.post("/files", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  };

  return {
    uploadFiles,
    uploadFile: async (file: File) => uploadFiles([file]),
    getFiles: async (fileGroupId: string): Promise<ApiResponseDto<FileGroup>> => {
      const response = await client.get(`/files/groups/${fileGroupId}`);
      return response.data;
    },
    getFileGroupsByIds: async (
      fileGroupIds: string[]
    ): Promise<ApiResponseDto<FileGroup[]>> => {
      const ids = fileGroupIds.filter(Boolean).map(encodeURIComponent).join(",");
      const response = await client.get(`/files/groups/${ids}/many`);
      return response.data;
    },
  };
};
