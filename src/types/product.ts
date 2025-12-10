import type { PagedApiResponse } from "./common";

export const ProductStatus = {
  READY: "READY",
  IN_PROGESS: "IN_PROGRESS",
  COMPLETE: "COMPLETE",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

/**
 * 상품 카테고리 인터페이스
 */
export interface ProductCategory {
  id: string;
  categoryName: string;
}

export interface ProductQueryParams {
  page?: number;
  size?: number;
  status?: ProductStatus;
  search?: string;
  // 기타 필터링 옵션
}

/**
 * 상품 정보 인터페이스 (product.product 테이블 기반) - 백엔드 Product 엔티티와 일치하도록 업데이트
 */
export interface Product {
  id: string;
  name: string;
  description?: string;
  status: ProductStatus;
  deletedYn: "Y" | "N"; // 백엔드 `DeleteStatus` enum을 "Y" | "N"으로 매핑
  deletedAt?: string;
  fileGroupId?: number;
  sellerId: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  imageUrl?: string; // 임시 이미지 URL 필드
  categories?: ProductCategory[] | string[]; // 상품-카테고리 관계
  /**
   * 최근 경매 기준 가격 정보
   * - status가 READY일 때: startBid만 의미 있음
   * - status가 IN_PROGRESS일 때: currentBid(없으면 startBid) 사용
   */
  startBid?: number;
  currentBid?: number;
}

/**
 * 백엔드 ProductResponse record에 대응하는 인터페이스
 */
export interface ProductResponse {
  id: string;
  name: string;
  description?: string;
  status: ProductStatus;
  sellerId: string;
  deletedYn: "Y" | "N";
  fileGroupId?: number;
  createdAt?: string; // LocalDateTime
  createdBy?: string;
  updatedAt?: string; // LocalDateTime
  updatedBy?: string;
}

/**
 * 상품 생성을 위한 요청 데이터 인터페이스
 */
export interface ProductCreationRequest {
  name: string;
  description: string;
  fileId?: string;
  categoryIds: string[];
  sellerId?: string;
}

/**
 * 상품 수정을 위한 요청 데이터 인터페이스
 */
export interface ProductUpdateRequest {
  name: string;
  description: string;
  fileId?: string;
  categoryIds: string[];
  sellerId?: string;
}

export type PagedProductResponse = PagedApiResponse<Product>;
