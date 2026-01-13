import { AuctionStatus } from "@moreauction/types";

/**
 * 공통 상태 텍스트 매핑
 * - 상품/경매에서 공통으로 사용하는 상태값을 한글로 일관되게 변환합니다.
 */
export const getCommonStatusText = (
  status: string | null | undefined
): string => {
  if (status == null) return "준비중";
  switch (status) {
    case AuctionStatus.READY:
    case "READY":
      return "대기중";
    case AuctionStatus.IN_PROGRESS:
    case "IN_PROGESS":
    case "IN_PROGRESS":
      return "진행중";
    case AuctionStatus.COMPLETED:
    case "COMPLETED":
      return "종료";
    case AuctionStatus.FAILED:
    case "FAILED":
      return "유찰";
    case AuctionStatus.CANCELLED:
    case "CANCELLED":
      return "취소됨";
    default:
      return "알 수 없음";
  }
};

export const getAuctionStatusText = (
  status: string | null | undefined
): string => {
  if (status == null) return "준비중";
  switch (status) {
    case AuctionStatus.READY:
      return "경매대기";
    case AuctionStatus.IN_PROGRESS:
      return "경매진행";
    case AuctionStatus.COMPLETED:
      return "경매종료";
    case AuctionStatus.FAILED:
      return "경매유찰";
    case AuctionStatus.CANCELLED:
      return "경매취소";
    default:
      return "경매 상태 알 수 없음";
  }
};
