import type {
  ApiResponseDto,
  PagedApiResponse,
  AuctionDetailResponse,
  AuctionStatus,
} from "@moreauction/types";
import { client } from "@/apis/client";

type AdminAuctionListParams = {
  page?: number;
  size?: number;
  sort?: string | string[];
  status?: AuctionStatus;
  deletedYn?: "Y" | "N";
  productId?: string;
  sellerId?: string;
  minBid?: number;
  maxBid?: number;
  startFrom?: string;
  startTo?: string;
  endFrom?: string;
  endTo?: string;
};

const extractData = <T>(payload: ApiResponseDto<T> | T): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiResponseDto<T>).data;
  }
  return payload as T;
};

export const adminAuctionApi = {
  getAuctions: async (
    params: AdminAuctionListParams
  ): Promise<PagedApiResponse<AuctionDetailResponse>> => {
    const response = await client.get("/admin/auctions", { params });
    return extractData<PagedApiResponse<AuctionDetailResponse>>(response.data);
  },
  startNow: async (auctionId: string): Promise<ApiResponseDto<null>> => {
    const response = await client.put(`/admin/auctions/${auctionId}/start-now`);
    return response.data;
  },
  endNow: async (auctionId: string): Promise<ApiResponseDto<null>> => {
    const response = await client.put(`/admin/auctions/${auctionId}/end-now`);
    return response.data;
  },
};
