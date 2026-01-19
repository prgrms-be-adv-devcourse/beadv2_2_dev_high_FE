import type { ApiResponseDto, PagedApiResponse } from "@moreauction/types";
import { client } from "./client";

const extractData = <T>(payload: ApiResponseDto<T> | T): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiResponseDto<T>).data;
  }
  return payload as T;
};

type SellerListParams = {
  userId: string;
  status?: string;
  bankName?: string;
  bankAccount?: string;
  deletedYn?: "Y" | "N" | null;
  page?: number;
  size?: number;
  sort?: string | string[];
};

export const adminUserApi = {
  getSellers: async (
    params: SellerListParams
  ): Promise<PagedApiResponse<any>> => {
    const response = await client.get("/admin/sellers", {
      params,
    });
    return extractData<PagedApiResponse<any>>(response.data);
  },
  approveSellerSelected: async (payload: {
    sellerIds: string[];
  }): Promise<ApiResponseDto<any>> => {
    const response = await client.post(
      "/admin/sellers/approve/selected",
      payload
    );
    return response.data;
  },
  approveSellerBatch: async (): Promise<ApiResponseDto<any>> => {
    const response = await client.post("/admin/sellers/approve/batch");
    return response.data;
  },
};
