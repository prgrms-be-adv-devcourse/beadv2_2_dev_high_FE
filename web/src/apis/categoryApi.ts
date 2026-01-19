// src/apis/categoryApi.ts
import type { ApiResponseDto } from "@moreauction/types";
import type { ProductCategory } from "@moreauction/types";
import { client } from "@/apis/client";

export const categoryApi = {
  getCategories: async (): Promise<ApiResponseDto<ProductCategory[]>> => {
    const response = await client.get("/categories");
    return response.data;
  },
};
