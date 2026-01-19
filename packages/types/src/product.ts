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
  fileGroupId?: string | null;
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
  fileGrpId?: null | string;
  categoryIds: string[];
  sellerId?: string;
}

export type PagedProductResponse = PagedApiResponse<Product>;

export type AiConditionOverall = "상" | "중" | "하";

/** AI가 이미지/컨텍스트를 바탕으로 생성한 "상품 상세 정보" */
export interface AiGeneratedProductDetail {
  category: AiCategorySuggestion;
  title: string;
  summary: string;
  condition: AiProductCondition;
  features: string[];
  specs: string[];
  includedItems: string[];
  defects: string[];
  recommendedFor: string[];
  searchKeywords: string[];
}

/** AI가 추정한 카테고리(사용자가 최종 선택할 수 있음) */
export interface AiCategorySuggestion {
  code: string; // 예: "CAT001"
  name?: string; // 필요 없으면 optional
  confidence: number; // 0~1
  alternatives: AiCategoryAlternative[];
  evidence: string[];
}

export interface AiCategoryAlternative {
  code: string;
  name?: string;
  confidence: number; // 0~1
}

export interface AiProductCondition {
  overall: AiConditionOverall;
  details: string[];
}
