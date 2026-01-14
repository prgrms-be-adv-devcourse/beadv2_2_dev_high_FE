import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuctionRankingResponse, Product } from "@moreauction/types";
import { auctionApi } from "@/apis/auctionApi";
import { productApi } from "@/apis/productApi";
import { queryKeys } from "@/shared/queries/queryKeys";

export const useTopAuctions = (limit = 3) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.auctions.topToday(limit),
    queryFn: async () => {
      const res = await auctionApi.getTopAuctions(limit);
      const items = res.data as AuctionRankingResponse[];
      if (!items.length) return items;

      const productIds = Array.from(
        new Set(items.map((item) => item.auction.productId).filter(Boolean))
      );
      const cachedProducts = productIds
        .map((productId) =>
          queryClient.getQueryData<Product>(queryKeys.products.detail(productId))
        )
        .filter((product): product is Product => !!product);
      const cachedMap = new Map(
        cachedProducts.map((product) => [product.id, product])
      );
      const missingProductIds = productIds.filter(
        (productId) => !cachedMap.has(productId)
      );

      const fetchedProducts = missingProductIds.length
        ? await Promise.all(
            missingProductIds.map(async (productId) => {
              try {
                const detail = await productApi.getProductById(productId);
                queryClient.setQueryData(
                  queryKeys.products.detail(productId),
                  detail.data
                );
                return detail.data as Product;
              } catch (err) {
                console.error("상품명 조회 실패:", productId, err);
                return null;
              }
            })
          )
        : [];
      fetchedProducts
        .filter((product): product is Product => !!product)
        .forEach((product) => cachedMap.set(product.id, product));

      return items.map((item) => {
        const product = cachedMap.get(item.auction.productId);
        if (!product?.name) return item;
        return {
          ...item,
          auction: {
            ...item.auction,
            productName: product.name,
          },
        };
      });
    },
    staleTime: 10_000,
    refetchInterval: () =>
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
        ? 10_000
        : false,
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
  });
};
