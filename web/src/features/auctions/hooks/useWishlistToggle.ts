import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wishlistApi, type WishlistEntry } from "@/apis/wishlistApi";
import { queryKeys } from "@/shared/queries/queryKeys";
import type { Product, User } from "@moreauction/types";

type UseWishlistToggleParams = {
  user?: User | null;
  productId?: string;
  wishlistEntry?: WishlistEntry | null;
  productDetail?: Product | null;
  onRequireLogin?: () => void;
};

export const useWishlistToggle = ({
  user,
  productId,
  wishlistEntry,
  productDetail,
  onRequireLogin,
}: UseWishlistToggleParams) => {
  const queryClient = useQueryClient();
  const [isWish, setIsWish] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const wishActionSeqRef = useRef(0);
  const wishInFlightRef = useRef(false);
  const wishDesiredRef = useRef(false);
  const wishServerRef = useRef(false);

  const updateWishlistCaches = useCallback(
    (nextDesired: boolean) => {
      if (!user?.userId || !productId) return;
      const userId = user.userId;
      const now = new Date().toISOString();
      const buildEntry = (
        overrides?: Partial<WishlistEntry>
      ): WishlistEntry => ({
        id: overrides?.id ?? `optimistic-${userId}-${productId}`,
        userId,
        productId,
        deletedYn: overrides?.deletedYn ?? "N",
        deletedAt: overrides?.deletedAt ?? null,
        createdBy: overrides?.createdBy ?? userId,
        createdAt: overrides?.createdAt ?? now,
        updatedBy: overrides?.updatedBy ?? userId,
        updatedAt: overrides?.updatedAt ?? now,
      });

      queryClient.setQueryData(
        queryKeys.wishlist.detail(userId, productId),
        (prev?: WishlistEntry | null) => {
          if (!nextDesired) return null;
          const base = prev ?? buildEntry();
          return {
            ...base,
            deletedYn: "N",
            deletedAt: null,
            updatedAt: now,
            updatedBy: userId,
          };
        }
      );

      queryClient.setQueryData(
        queryKeys.wishlist.list(userId),
        (
          prev:
            | {
                entries: WishlistEntry[];
                products: Product[];
              }
            | undefined
        ) => {
          if (!prev) return prev;
          if (nextDesired) {
            const exists = prev.entries.some(
              (entry) => entry.productId === productId
            );
            const nextEntries = exists
              ? prev.entries
              : [buildEntry(), ...prev.entries];
            const nextProducts =
              productDetail &&
              !prev.products.some((product) => product.id === productId)
                ? [productDetail, ...prev.products]
                : prev.products;
            return { entries: nextEntries, products: nextProducts };
          }
          return {
            entries: prev.entries.filter(
              (entry) => entry.productId !== productId
            ),
            products: prev.products.filter(
              (product) => product.id !== productId
            ),
          };
        }
      );
    },
    [productDetail, productId, queryClient, user?.userId]
  );

  useEffect(() => {
    if (!productId) return;
    if (!user) {
      setIsWish(false);
      wishDesiredRef.current = false;
      wishServerRef.current = false;
      return;
    }
    const exists = !!wishlistEntry && wishlistEntry.deletedYn !== "Y";
    setIsWish(exists);
    wishDesiredRef.current = exists;
    wishServerRef.current = exists;
  }, [productId, user, wishlistEntry]);

  const handleToggleWish = useCallback(async () => {
    if (!user) {
      onRequireLogin?.();
      return;
    }
    if (!productId) return;

    wishActionSeqRef.current += 1;
    const seqAtClick = wishActionSeqRef.current;

    const nextDesired = !wishDesiredRef.current;
    wishDesiredRef.current = nextDesired;
    setIsWish(nextDesired);
    updateWishlistCaches(nextDesired);

    if (wishInFlightRef.current) return;
    wishInFlightRef.current = true;
    setWishLoading(true);

    try {
      while (wishServerRef.current !== wishDesiredRef.current) {
        const target = wishDesiredRef.current;
        if (target) {
          await wishlistApi.add(productId);
        } else {
          await wishlistApi.remove(productId);
        }
        wishServerRef.current = target;
        updateWishlistCaches(target);
      }
    } catch (err: any) {
      console.error("찜 토글 실패:", err);
      if (wishActionSeqRef.current === seqAtClick) {
        wishDesiredRef.current = wishServerRef.current;
        setIsWish(wishServerRef.current);
        updateWishlistCaches(wishServerRef.current);
      }
      alert(
        err?.response?.data?.message ?? "찜하기 처리 중 오류가 발생했습니다."
      );
    } finally {
      wishInFlightRef.current = false;
      if (wishActionSeqRef.current === seqAtClick) {
        setWishLoading(false);
      }
    }
  }, [onRequireLogin, productId, updateWishlistCaches, user]);

  return {
    isWish,
    wishLoading,
    handleToggleWish,
  };
};
