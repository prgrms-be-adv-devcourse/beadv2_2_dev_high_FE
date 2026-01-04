import type { ApiResponseDto } from "@moreauction/types";
import type { LoginParams, LoginResponse } from "@moreauction/types";
import { client } from "./client";

export const userApi = {
  login: async (
    params: LoginParams
  ): Promise<ApiResponseDto<LoginResponse>> => {
    const response = await client.post("/auth/login", params);
    return response.data;
  },
  logout: async (): Promise<ApiResponseDto<null>> => {
    const response = await client.post("/auth/logout");
    return response.data;
  },
};
