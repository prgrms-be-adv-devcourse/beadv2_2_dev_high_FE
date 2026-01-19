import { AuctionStatus, ProductStatus } from "@moreauction/types";

/**
 * 공통 상태 텍스트 매핑
 * - 상품/경매에서 공통으로 사용하는 상태값을 한글로 일관되게 변환합니다.
 */
export const getCommonStatusText = (
  status: string | null | undefined
): string => {
  switch (status) {
    case ProductStatus.READY:
    case AuctionStatus.READY:
      return "대기중";
    case ProductStatus.IN_PROGESS:
    case AuctionStatus.IN_PROGRESS:
      return "진행중";
    case ProductStatus.COMPLETED:
    case AuctionStatus.COMPLETED:
      return "종료";
    case ProductStatus.FAILED:
    case AuctionStatus.FAILED:
      return "유찰";
    case ProductStatus.CANCELLED:
    case AuctionStatus.CANCELLED:
      return "취소됨";
    default:
      return "알 수 없음";
  }
};

export const getAuctionStatusText = (
  status: string | null | undefined
): string => {
  switch (status) {
    case AuctionStatus.READY:
      return "경매 대기중";
    case AuctionStatus.IN_PROGRESS:
      return "경매 진행중";
    case AuctionStatus.COMPLETED:
      return "경매 종료";
    case AuctionStatus.FAILED:
      return "경매 유찰";
    case AuctionStatus.CANCELLED:
      return "경매 취소";
    default:
      return "경매 상태 알 수 없음";
  }
};
