import type {
  Auction,
  AuctionCreationRequest,
  AuctionDetailResponse,
  AuctionParticipationResponse,
  AuctionQueryParams,
  AuctionStatus,
  AuctionUpdateRequest,
  PagedAuctionResponse,
  PagedBidHistoryResponse,
} from "../types/auction";
import type { AuctionBidMessage } from "../types/auction"; // Auction 타입 임포트
import type { ApiResponseDto } from "../types/common";
import { client } from "./client";
// Auction 타입 임포트
import qs from "qs";

// 경매 목록 조회 시 사용될 쿼리 파라미터 인터페이스 (필요에 따라 확장)

/**
 * 경매 관련 API 함수들
 */
export const auctionApi = {
  // 예시: 경매 목록 가져오기
  getAuctions: async (
    params: AuctionQueryParams
  ): Promise<ApiResponseDto<PagedAuctionResponse>> => {
    console.log("경매 목록 조회 API 호출:", params);
    const res = await client.get("/auctions", {
      params,
      paramsSerializer: (params) =>
        qs.stringify(params, { arrayFormat: "repeat" }),
    });
    return res.data;
  },

  // 경매 생성
  createAuction: async (
    auctionData: AuctionCreationRequest
  ): Promise<ApiResponseDto<Auction>> => {
    console.log("경매 생성 API 호출:", auctionData);
    const response = await client.post("/auctions", auctionData);
    return response.data;
  },

  // 경매 수정
  updateAuction: async (
    auctionId: string,
    auctionData: AuctionUpdateRequest
  ): Promise<ApiResponseDto<Auction>> => {
    console.log(`경매 수정 API 호출: ${auctionId}`, auctionData);
    const response = await client.put(`/auctions/${auctionId}`, auctionData);
    return response.data;
  },

  // 경매 상세 정보 가져오기
  getAuctionDetail: async (
    auctionId: string
  ): Promise<ApiResponseDto<AuctionDetailResponse>> => {
    console.log(`경매 상세 정보 조회 API 호출: ${auctionId}`);
    const response = await client.get(`/auctions/${auctionId}`);
    return response.data;
  },

  // 입찰 시도
  placeBid: async (
    auctionId: string,
    bidPrice: number
  ): Promise<ApiResponseDto<AuctionBidMessage>> => {
    console.log(`경매 입찰 시도 API 호출: ${auctionId}, 입찰가: ${bidPrice}`);
    const res = await client.post(`/auctions/${auctionId}/bids`, { bidPrice });

    return res.data;
  },

  // 참여 상태 /보증금 환급 여부 / 포기 여부
  checkParticipationStatus: async (
    auctionId: string
  ): Promise<ApiResponseDto<AuctionParticipationResponse>> => {
    console.log(`경매 참여 상태 확인 API 호출: ${auctionId}`);
    const res = await client.get(`/auctions/${auctionId}/participation`);
    return res.data;
  },

  createParticipation: async (
    auctionId: string,
    params: any
  ): Promise<ApiResponseDto<AuctionParticipationResponse>> => {
    console.log(`경매 참여 등록: ${auctionId}`);
    const res = await client.post(
      `/auctions/${auctionId}/participation`,
      params
    );
    return res.data;
  },

  withdrawnParticipation: async (
    auctionId: string
  ): Promise<ApiResponseDto<AuctionParticipationResponse>> => {
    console.log(`경매 포기하기: ${auctionId}`);
    const res = await client.put(`/auctions/${auctionId}/withdraw`);
    return res.data;
  },

  // 경매 입찰 내역 조회 (페이지네이션)
  getAuctionBidHistory: async (
    auctionId: string,
    params: { page?: number; size?: number }
  ): Promise<ApiResponseDto<PagedBidHistoryResponse>> => {
    console.log(`경매 입찰 내역 조회 API 호출: ${auctionId}`, params);
    const res = await client.get(`/auctions/${auctionId}/bids/history`, {
      params,
    });
    return res.data;
  },

  /**
   * 특정 상품에 대한 경매 내역을 조회합니다.
   * @param productId - 조회할 상품의 ID
   */
  getAuctionsByProductId: async (
    productId: string
  ): Promise<ApiResponseDto<any>> => {
    console.log(`상품 관련 경매 내역 조회 API 호출 (ProductID: ${productId})`);
    const response = await client.get(`/auctions/by-product`, {
      params: { productId },
    }); // 예시 API 엔드포인트

    return response.data;
  },
};
