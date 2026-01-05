import type { PagedApiResponse } from "./common";

/**
 * 상품 카테고리 인터페이스
 */
export interface ProductCategory {
  id: string;
  categoryName: string;
}
export interface ProductImage {
  id: string;
  url?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  path?: string;
  imageUrl?: string;
  originalFilename?: string;
}

export interface ProductQueryParams {
  page?: number;
  size?: number;
  search?: string;
  sort?: string[];
  // 기타 필터링 옵션
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  deletedYn: "Y" | "N"; // 백엔드 `DeleteStatus` enum을 "Y" | "N"으로 매핑
  deletedAt?: string;
  sellerId: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  categories?: ProductCategory[] | string[]; // 상품-카테고리 관계
  latestAuctionId?: string;
  fileGroupId?: number | string;
}

/**
 * 상품 생성을 위한 요청 데이터 인터페이스
 */
export interface ProductCreationRequest {
  name: string;
  description: string;
  fileGrpId?: number | string;
  categoryIds: string[];
  sellerId?: string;
}

/**
 * 상품 수정을 위한 요청 데이터 인터페이스
 */
export interface ProductUpdateRequest {
  name: string;
  description: string;
  fileGrpId?: number | string;
  categoryIds: string[];
  sellerId?: string;
}

export type PagedProductResponse = PagedApiResponse<Product>;
