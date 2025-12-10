// src/apis/categoryApi.ts
import { client, type ApiResponseDto } from "./client";
import type { ProductCategory } from "../types/product";

export const categoryApi = {
  getCategories: async (): Promise<ApiResponseDto<ProductCategory[]>> => {
    const response = await client.get("/categories");
    return response.data;
  },
};
