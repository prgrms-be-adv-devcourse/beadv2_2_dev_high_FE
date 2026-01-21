// src/apis/categoryApi.ts
import type { ApiResponseDto } from "../types/common";
import type { ProductCategory } from "../types/product";
import { client } from "./client";

export const categoryApi = {
  getCategories: async (): Promise<ApiResponseDto<ProductCategory[]>> => {
    const response = await client.get("/categories");
    return response.data;
  },
};
