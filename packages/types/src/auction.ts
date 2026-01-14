import type { PagedApiResponse } from "./common";

/**
 * 경매 상태 (백엔드 enum과 동일)
 */
export const AuctionStatus = {
  READY: "READY", // 경매 대기 (시작 전)
  IN_PROGRESS: "IN_PROGRESS", // 경매 진행
  COMPLETED: "COMPLETED", // 경매 종료 (낙찰자 확정)
  FAILED: "FAILED", // 경매 유찰 (입찰자 없음)
  CANCELLED: "CANCELLED", // 경매 포기 (낙찰자 취소/결제 취소)
} as const;

export type AuctionStatus = (typeof AuctionStatus)[keyof typeof AuctionStatus];

export type PagedAuctionResponse = PagedApiResponse<AuctionDetailResponse>;

export interface AuctionQueryParams {
  auctionStartAt?: string; // "2025-12-10T00:00:00" 형식, 선택적
  auctionEndAt?: string; // "2025-12-10T23:59:59" 형식, 선택적
  startBid?: number;
  status?: AuctionStatus[];
  page?: number; // 0부터 시작
  size?: number; // 한 페이지당 데이터 수
  sort?: string[];
  search?: string;
}

/**
 * 경매 라이브 상태 인터페이스 (백엔드 AuctionLiveState와 일치하도록 업데이트)
 */
export interface AuctionLiveState {
  id: string; // 백엔드의 auction_id (FK이자 PK)
  currentBidPrice: number; // 백엔드 BigDecimal currentBid
  highestUserId?: string;
  highestBidderUsername?: string; // 백엔드에서 제공되지 않으면 프론트엔드에서 처리 필요
  bidCount: number; // 백엔드에서 직접 제공되지 않으면 프론트엔드에서 계산 또는 별도 API 필요
  version: number;
  updatedAt: string;
}

/**
 * 경매 입찰 메시지 인터페이스 (웹소켓 브로드캐스트)
 */
export interface AuctionBidMessage {
  type:
    | "BID_SUCCESS"
    | "BID_FAILED"
    | "AUCTION_STARTED"
    | "AUCTION_ENDED"
    | "USER_JOIN"
    | "USER_LEAVE"; // 메시지 타입 확장
  auctionId: string;
  highestUserId?: string; // 실제 최고가 입찰자 ID
  highestUsername?: string; // 실제 최고가 입찰자 이름 (백엔드에서 제공 가정)
  bidPrice: number;
  bidAt: string; //
  currentUsers: number; // 현재 경매 참여자 수
  bidSrno: number; // 입찰 일련번호
}

/**
 * 백엔드 AuctionLiveStateResponse record에 대응하는 인터페이스
 */
export interface AuctionLiveStateResponse {
  id: string; // auctionId와 동일
  currentBidPrice: number;
  highestUserId?: string;
  highestBidderUsername?: string; // 백엔드에서 추가 처리 필요
  bidCount: number; // 백엔드에서 추가 처리 필요
  version: number;
  updatedAt: string; // LocalDateTime
}

/**
 * 백엔드 AuctionDetailResponse record에 대응하는 인터페이스
 */
export interface AuctionDetailResponse {
  id: string;
  auctionId?: string; // 경매 ID
  productId: string; // 상품 ID 추가
  status: AuctionStatus;
  startBid: number; // BigDecimal → number
  currentBid: number; // BigDecimal → number
  highestUserId?: string | null;
  description?: string;
  productName?: string;
  productFileGroupId?: string | number | null;
  fileGroupId?: string | number | null;
  sellerId: string;
  auctionStartAt: string; // LocalDateTime → ISO 문자열
  auctionEndAt: string; // LocalDateTime → ISO 문자열
  depositAmount: number; // BigDecimal → number
  deletedYn: boolean | "Y" | "N";
}

export type AuctionResponse = AuctionDetailResponse;

export interface AuctionRankingResponse {
  bidCount: number;
  viewCount: number;
  bidderCount: number;
  score: number;
  auction: AuctionResponse;
}

export interface AuctionParticipationResponse {
  auctionId?: string;
  isParticipated: boolean;
  isWithdrawn: boolean;
  isRefund: boolean;
  depositAmount?: number; // BigDecimal → number
  withdrawnAt?: string; // LocalDateTime → ISO 문자열
  refundAt?: string; // LocalDateTime → ISO 문자열
  lastBidPrice?: number; // BigDecimal → number
}

/**
 * 입찰 내역 페이지네이션 응답 타입
 */
export type PagedBidHistoryResponse = PagedApiResponse<AuctionBidMessage>;

/**
 * 경매 생성을 위한 요청 데이터 인터페이스
 */
export interface AuctionCreationRequest {
  productId: string;
  productName?: string;
  startBid: number;
  auctionStartAt: string;
  auctionEndAt: string;
}

/**
 * 경매 수정을 위한 요청 데이터 인터페이스
 */
export interface AuctionUpdateRequest {
  productName?: string;
  startBid: number;
  auctionStartAt: string;
  auctionEndAt: string;
}

export interface AuctionRecommendationResponse {
  productId: string;
  available: boolean;
  message: string;
  referencePrice: number | null;
  recommendedStartBid: number | null;
  priceRangeMin: number | null;
  priceRangeMax: number | null;
  aiResult: {
    price: number | null;
    reason: string | null;
  } | null;
  recommendedStartAt: string | null;
  recommendedEndAt: string | null;
  similarProductCount: number;
  winningOrderCount: number;
  auctionCount: number;
  winningOrderCountPaidLike: number;
}
