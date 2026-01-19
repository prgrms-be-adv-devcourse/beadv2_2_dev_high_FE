import type {
  ApiResponseDto,
  PagedApiResponse,
  AuctionDetailResponse,
  AuctionStatus,
  AuctionCreationRequest,
  AuctionUpdateRequest,
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
  startFrom?: string | null;
  startTo?: string | null;
  endFrom?: string | null;
  endTo?: string | null;
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
  getAuctionsByProductId: async (
    productId: string
  ): Promise<ApiResponseDto<AuctionDetailResponse[]>> => {
    const response = await client.get(
      `/admin/auctions/by-product/${productId}`
    );
    return response.data;
  },
  getAuctionsCount: async (
    status?: AuctionStatus
  ): Promise<ApiResponseDto<number>> => {
    const response = await client.get("/admin/auctions/count", {
      params: { status },
    });
    return response.data;
  },
  getAuctionCountEndingSoon: async (): Promise<ApiResponseDto<number>> => {
    const response = await client.get("/admin/auctions/count/ending-soon");
    return response.data;
  },

  startNow: async (
    auctionId: string
  ): Promise<ApiResponseDto<AuctionDetailResponse>> => {
    const response = await client.put(`/admin/auctions/${auctionId}/start-now`);
    return response.data;
  },
  endNow: async (
    auctionId: string
  ): Promise<ApiResponseDto<AuctionDetailResponse>> => {
    const response = await client.put(`/admin/auctions/${auctionId}/end-now`);
    return response.data;
  },
  deleteAuction: async (
    auctionId: string
  ): Promise<ApiResponseDto<AuctionDetailResponse>> => {
    const response = await client.delete(`/admin/auctions/${auctionId}`);
    return response.data;
  },
  createAuction: async (
    payload: AuctionCreationRequest
  ): Promise<ApiResponseDto<AuctionDetailResponse>> => {
    const response = await client.post("/admin/auctions", payload);
    return response.data;
  },
  modifyAuction: async (
    auctionId: string,
    payload: AuctionUpdateRequest
  ): Promise<ApiResponseDto<AuctionDetailResponse>> => {
    const response = await client.put(`/admin/auctions/${auctionId}`, payload);
    return response.data;
  },
};
