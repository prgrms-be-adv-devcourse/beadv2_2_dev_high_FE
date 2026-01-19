import type { ApiResponseDto, PagedApiResponse } from "@moreauction/types";
import { client } from "./client";

// 백엔드 Wishlist 엔티티 (id, userId, productId만 포함된다고 가정)
export interface WishlistEntry {
  id: string;
  userId: string;
  productId: string;
}

export type PagedWishlistResponse = PagedApiResponse<WishlistEntry>;

export const wishlistApi = {
  add: async (productId: string): Promise<ApiResponseDto<any>> => {
    const res = await client.post("/users/wishlist", { productId });
    return res.data;
  },
  remove: async (productId: string): Promise<ApiResponseDto<any>> => {
    const res = await client.delete("/users/wishlist", {
      data: { productId },
    });
    return res.data;
  },
  getMyWishlist: async (
    params?: { page?: number; size?: number }
  ): Promise<ApiResponseDto<PagedWishlistResponse>> => {
    const res = await client.get("/users/wishlist", { params });
    return res.data;
  },
};
