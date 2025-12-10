export interface ApiResponseDto<T> {
  code: string; // 예: "SUCCESS"
  message: string; // 예: "정상적으로 처리되었습니다."
  data: T; // 실제 페이로드
}

/**
 * Spring Page<T> 응답에 대응하는 제네릭 인터페이스
 */
export interface PagedApiResponse<T> {
  content: T[];
  pageable: {
    sort: {
      sorted: boolean;
      unsorted: boolean;
      empty: boolean;
    };
    offset: number;
    pageNumber: number;
    pageSize: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  sort: {
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
  };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface SortOrder {
  property: string; // 정렬할 필드
  direction?: "ASC" | "DESC";
}
