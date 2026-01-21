import qs from "qs";
import type { ApiResponseDto } from "@moreauction/types";
import type {
  PagedProductAndAuctionResponse,
  Product,
  ProductAndAuction,
  ProductCreationRequest,
  ProductQueryParams,
  ProductUpdateRequest,
} from "@moreauction/types";
import { client } from "./client";

// 상품 목록 조회 시 사용될 쿼리 파라미터 인터페이스 (필요에 따라 확장)

/**
 * 상품 및 경매 관련 API 함수들
 */
export const productApi = {
  /**
   * 전체 상품 목록을 조회합니다.
   * @param params - 페이지네이션, 필터링 등을 위한 쿼리 파라미터
   */
  getProducts: async (
    params?: ProductQueryParams
  ): Promise<ApiResponseDto<PagedProductAndAuctionResponse>> => {
    console.log("상품 목록 조회 API 호출:", params);
    const finalParams: ProductQueryParams = {
      ...params,
    };
    // 정렬 정보가 없는 경우 기본값: createdAt 내림차순
    if (!finalParams.sort) {
      finalParams.sort = ["createdAt,DESC"];
    }

    const response = await client.get("/products", {
      params: finalParams,
      paramsSerializer: (params) =>
        qs.stringify(params, { arrayFormat: "repeat" }),
    });
    return response.data;
  },

  /**
   * 특정 ID의 상품 상세 정보를 조회합니다.
   * @param productId - 조회할 상품의 ID
   */
  getProductById: async (
    productId: string
  ): Promise<ApiResponseDto<ProductAndAuction>> => {
    console.log(`상품 상세 조회 API 호출 (ID: ${productId})`);
    const response = await client.get(`/products/${productId}`);
    return response.data;
  },

  // /**
  //  * 특정 ID의 상품 상세 정보를 조회합니다.
  //  * @param productId - 조회할 상품의 ID
  //  */
  // getProductByIdWithCategories: async (
  //   productId: string
  // ): Promise<ApiResponseDto<ProductAndAuction>> => {
  //   console.log(`상품 상세 조회 API 호출 (ID: ${productId})`);
  //   const response = await client.get(`/products/${productId}/categories`);
  //   return response.data;
  // },
  /**
   * 새로운 상품을 등록합니다.
   * @param productData - 생성할 상품의 데이터
   */
  createProduct: async (
    productData: ProductCreationRequest
  ): Promise<ApiResponseDto<ProductAndAuction>> => {
    console.log("상품 생성 API 호출:", productData);
    const response = await client.post("/products", productData);
    return response.data;
  },

  /**
   * 상품을 수정합니다.
   * @param productId - 수정할 상품의 ID
   * @param productData - 수정할 상품의 데이터
   */
  updateProduct: async (
    productId: string,
    productData: ProductUpdateRequest
  ): Promise<ApiResponseDto<ProductAndAuction>> => {
    console.log(`상품 수정 API 호출 (ID: ${productId}):`, productData);
    const response = await client.put(`/products/${productId}`, productData);
    return response.data;
  },

  /**
   * 인증된 사용자의 상품 목록을 조회합니다.
   * @param params - 필터링 등을 위한 쿼리 파라미터
   */
  getMyProducts: async (
    sellerId?: string
  ): Promise<ApiResponseDto<ProductAndAuction[]>> => {
    console.log("내 상품 목록 조회 API 호출:", sellerId);
    const response = await client.get(`/products/users/${sellerId}`);
    return response.data;
  },

  /**
   * 상품을 삭제합니다.
   * @param productId - 삭제할 상품의 ID
   * @param sellerId - 판매자 ID (검증용)
   */
  deleteProduct: async (
    productId: string,
    sellerId: string
  ): Promise<ApiResponseDto<void>> => {
    console.log(`상품 삭제 API 호출 (ID: ${productId})`);
    const response = await client.delete(`/products/${productId}`, {
      params: { sellerId },
    });
    return response.data;
  },
};
