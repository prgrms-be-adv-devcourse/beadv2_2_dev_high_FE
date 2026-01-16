import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auctionApi } from "@/apis/auctionApi";
import { productApi } from "@/apis/productApi";
import { wishlistApi } from "@/apis/wishlistApi";
import {
  type AuctionDetailResponse,
  type AuctionParticipationResponse,
  type Product,
  type SimilarProductResponse,
} from "@moreauction/types";
import { queryKeys } from "@/shared/queries/queryKeys";

type UseAuctionDetailQueriesParams = {
  auctionId?: string;
  isAuthenticated: boolean;
  userId?: string;
};

export const useAuctionDetailQueries = ({
  auctionId,
  isAuthenticated,
  userId,
}: UseAuctionDetailQueriesParams) => {
  const queryClient = useQueryClient();

  const auctionDetailQuery = useQuery<AuctionDetailResponse, Error>({
    queryKey: queryKeys.auctions.detail(auctionId),
    queryFn: async () => {
      const res = await auctionApi.getAuctionDetail(auctionId as string);
      return res.data as AuctionDetailResponse;
    },
    enabled: !!auctionId,
    staleTime: 30_000,
    placeholderData: () =>
      queryClient.getQueryData<AuctionDetailResponse>(
        queryKeys.auctions.detail(auctionId)
      ),
  });

  const participationQuery = useQuery<AuctionParticipationResponse, Error>({
    queryKey: queryKeys.auctions.participation(auctionId),
    queryFn: async () => {
      const res = await auctionApi.checkParticipationStatus(
        auctionId as string
      );
      return res.data as AuctionParticipationResponse;
    },
    enabled: !!auctionId && isAuthenticated,
    staleTime: 30_000,
  });

  const auctionDetail = auctionDetailQuery.data ?? null;
  const participationStatus = participationQuery.data ?? {
    isParticipated: false,
    isWithdrawn: false,
    isRefund: false,
  };
  const productId = auctionDetail?.productId;

  const similarQuery = useQuery<SimilarProductResponse[], Error>({
    queryKey: queryKeys.search.similar(productId, 4),
    queryFn: async () => {
      if (!productId) return [];
      const res = await auctionApi.getSimilarProducts(productId, 4);
      return res.data ?? [];
    },
    enabled: !!productId,
    staleTime: 60_000,
  });
  const similarProducts = similarQuery.data ?? [];
  const similarLoading = similarQuery.isLoading;
  const similarAuctionIds = useMemo(
    () =>
      similarProducts
        .map((item) => item.auctionId)
        .filter((id): id is string => Boolean(id)),
    [similarProducts]
  );
  const similarProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          similarProducts
            .filter((item) => !item.auctionId)
            .map((item) => item.productId)
            .filter(Boolean)
        )
      ),
    [similarProducts]
  );

  const similarAuctionsQuery = useQuery<AuctionDetailResponse[], Error>({
    queryKey: queryKeys.auctions.many(similarAuctionIds),
    queryFn: async (): Promise<AuctionDetailResponse[]> => {
      if (similarAuctionIds.length === 0) return [];
      const res = await auctionApi.getAuctionsByIds(similarAuctionIds);
      return res.data ?? [];
    },
    enabled: similarAuctionIds.length > 0,
    staleTime: 60_000,
  });
  const similarProductsQuery = useQuery<Product[], Error>({
    queryKey: queryKeys.products.many(similarProductIds),
    queryFn: async () => {
      if (similarProductIds.length === 0) return [];
      const res = await productApi.getProductsByIds(similarProductIds);
      return res.data ?? [];
    },
    enabled: similarProductIds.length > 0,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!similarAuctionsQuery.data) return;
    similarAuctionsQuery.data.forEach((auction) => {
      queryClient.setQueryData(queryKeys.auctions.detail(auction.id), auction);
    });
  }, [queryClient, similarAuctionsQuery.data]);

  const similarAuctionsById = useMemo(() => {
    const entries: Array<[string, AuctionDetailResponse]> = (
      similarAuctionsQuery.data ?? []
    ).map((auction) => [auction.id, auction]);
    return new Map<string, AuctionDetailResponse>(entries);
  }, [similarAuctionsQuery.data]);
  const similarProductsById = useMemo(() => {
    const entries: Array<[string, Product]> = (
      similarProductsQuery.data ?? []
    ).map((product) => [product.id, product]);
    return new Map<string, Product>(entries);
  }, [similarProductsQuery.data]);

  const wishlistQuery = useQuery({
    queryKey: queryKeys.wishlist.detail(userId, productId),
    queryFn: async () => {
      if (!productId) return null;
      try {
        const res = await wishlistApi.getWishlistByProductId(productId);
        return res.data;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!productId && !!userId,
    staleTime: 30_000,
    retry: false,
  });

  const productDetailQuery = useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: async () => {
      const response = await productApi.getProductById(productId as string);
      return response.data;
    },
    enabled: !!productId,
    staleTime: 30_000,
  });

  return {
    auctionDetailQuery,
    auctionDetail,
    participationQuery,
    participationStatus,
    productId,
    similarProducts,
    similarLoading,
    similarAuctionsById,
    similarProductsById,
    wishlistQuery,
    productDetailQuery,
  };
};
