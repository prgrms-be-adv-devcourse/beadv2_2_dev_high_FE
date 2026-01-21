import type {
  ApiResponseDto,
  PagedApiResponse,
  Product,
} from "@moreauction/types";
import { client } from "@/apis/client";

export type ProductAdminSearchFilter = {
  name?: string;
  description?: string;
  sellerId?: string;
};

type ProductAdminListParams = {
  page?: number;
  size?: number;
  sort?: string | string[];
  deletedYn?: "Y" | "N";
  filter?: ProductAdminSearchFilter;
};

export type ProductAdminRequest = {
  name: string;
  description: string;
  sellerId?: string;
  fileGrpId?: number | string | null;
  fileURL?: string | null;
  categoryIds: string[];
};

export type AiProductGenerateRequest = {
  categories: Array<{
    categoryId: string;
    count: number;
  }>;
};

const extractData = <T>(payload: ApiResponseDto<T> | T): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiResponseDto<T>).data;
  }
  return payload as T;
};

export const adminProductApi = {
  getProducts: async (
    params: ProductAdminListParams
  ): Promise<PagedApiResponse<Product>> => {
    const response = await client.get("/products", {
      params: {
        page: params.page,
        size: params.size,
        sort: params.sort,
        ...(params.filter ?? {}),
      },
    });
    return extractData<PagedApiResponse<Product>>(response.data);
  },
  getProduct: async (productId: string): Promise<ApiResponseDto<Product>> => {
    const response = await client.get(`/products/${productId}`);
    return response.data;
  },
  createProduct: async (
    payload: ProductAdminRequest
  ): Promise<ApiResponseDto<Product>> => {
    const response = await client.post("/products", payload);
    return response.data;
  },
  updateProduct: async (
    productId: string,
    payload: ProductAdminRequest
  ): Promise<ApiResponseDto<Product>> => {
    const response = await client.put(`/products/${productId}`, payload);
    return response.data;
  },
  deleteProduct: async (productId: string): Promise<ApiResponseDto<null>> => {
    const response = await client.delete(`/products/${productId}`);
    return response.data;
  },
  generateAiProducts: async (
    payload: AiProductGenerateRequest
  ): Promise<ApiResponseDto<Product[]>> => {
    const response = await client.post("/products/ai/generate", payload);
    return response.data;
  },
};
