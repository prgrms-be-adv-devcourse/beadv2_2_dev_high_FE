import type { ApiResponseDto } from "@moreauction/types";
import { client } from "@/apis/client";

export const adminDepositApi = {
  createDepositAccount: async (
    userId: string
  ): Promise<ApiResponseDto<unknown>> => {
    const res = await client.post("/admin/deposit", { userId });
    return res.data;
  },
};
