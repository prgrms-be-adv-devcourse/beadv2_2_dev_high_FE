import {
  AuctionStatus,
  type AuctionDetailResponse,
  type FileGroup,
  type Product,
} from "@moreauction/types";
import {
  formatWon,
  getAuctionStatusText,
  getProductImageUrls,
} from "@moreauction/utils";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { auctionApi } from "@/apis/auctionApi";
import { fileApi } from "@/apis/fileApi";
import { productApi } from "@/apis/productApi";
import { wishlistApi, type WishlistEntry } from "@/apis/wishlistApi";
import RemainingTime from "@/shared/components/RemainingTime";
import { useAuth } from "@moreauction/auth";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const ProductDetail: React.FC = () => {
  const formatDateTime = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };
  const { id: productId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [auctions, setAuctions] = useState<AuctionDetailResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isWish, setIsWish] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const wishActionSeqRef = useRef(0);
  const wishInFlightRef = useRef(false);
  const wishDesiredRef = useRef(false);
  const wishServerRef = useRef(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletingAuctionId, setDeletingAuctionId] = useState<string | null>(
    null
  );
  const [fileGroup, setFileGroup] = useState<FileGroup | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isDeleted, setIsDeleted] = useState(false);

  const deletableAuctionStatuses: AuctionStatus[] = [AuctionStatus.READY];
  const productQuery = useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: async () => {
      if (!productId) {
        throw new Error("Product ID is missing.");
      }
      const productResponse = await productApi.getProductById(productId);
      return productResponse.data;
    },
    enabled: !!productId && !isDeleted,
    staleTime: 30_000,
  });

  const product = productQuery.data ?? null;
  const productFileGroupId = productQuery.data?.fileGroupId;
  const fileGroupQuery = useQuery({
    queryKey: queryKeys.files.group(productFileGroupId),
    queryFn: () => fileApi.getFiles(String(productFileGroupId)),
    enabled: !!productFileGroupId && !isDeleted,
    staleTime: 30_000,
  });
  const isFileLoading =
    !!productFileGroupId &&
    (fileGroupQuery.isLoading || fileGroupQuery.isFetching);

  const auctionsQuery = useQuery({
    queryKey: queryKeys.auctions.byProduct(productId),
    queryFn: () => auctionApi.getAuctionsByProductId(productId as string),
    enabled: !!productId && !isDeleted,
    staleTime: 30_000,
  });

  const latestAuctionId = product?.latestAuctionId;

  const latestAuctionQuery = useQuery({
    queryKey: queryKeys.auctions.detail(latestAuctionId),
    queryFn: async () => {
      const response = await auctionApi.getAuctionDetail(
        latestAuctionId as string
      );
      return response.data;
    },
    enabled: !!latestAuctionId && !isDeleted,
    staleTime: 30_000,
  });

  useEffect(() => {
    const group = fileGroupQuery.data?.data ?? null;
    setFileGroup(group);
  }, [fileGroupQuery.data]);

  useEffect(() => {
    if (!auctionsQuery.data) return;
    const payload = auctionsQuery.data?.data;
    const list = payload ? payload : [];
    setAuctions(list);
  }, [auctionsQuery.data]);

  useEffect(() => {
    if (!productId) {
      setError("Product ID is missing.");
      return;
    }
    if (productQuery.isError) {
      setError(
        getErrorMessage(productQuery.error, "상품 정보를 불러오지 못했습니다.")
      );
    } else {
      setError(null);
    }
  }, [productId, productQuery.error, productQuery.isError]);

  interface GalleryItem {
    key: string;
    url: string;
    label: string;
    isPlaceholder?: boolean;
  }

  const galleryItems = useMemo<GalleryItem[]>(() => {
    if (isFileLoading) {
      return [];
    }
    if (fileGroupQuery.isError) {
      return [
        {
          key: "fallback",
          url: "/images/fallback.png",
          label: "이미지 로딩 실패",
          isPlaceholder: true,
        },
      ];
    }
    const fileItems =
      fileGroup?.files
        ?.map((file, idx) => {
          if (!file.filePath) return null;
          return {
            key: file.id ?? `file-${idx}`,
            url: file.filePath,
            label: file.fileName ?? `이미지 ${idx + 1}`,
          };
        })
        .filter((item): item is GalleryItem => !!item) ?? [];

    if (fileItems.length > 0) {
      return fileItems;
    }

    const fallback = getProductImageUrls(fileGroup).map((url, idx) => ({
      key: `image-${idx}`,
      url,
      label: `이미지 ${idx + 1}`,
    }));

    if (fallback.length > 0) {
      return fallback;
    }

    return [
      {
        key: "placeholder",
        url: "/images/no_image.png",
        label: "이미지 없음",
        isPlaceholder: true,
      },
    ];
  }, [fileGroup, fileGroupQuery.isError, isFileLoading]);

  const auctionErrorMessage = useMemo(() => {
    if (!productId) {
      return "경매 정보를 불러오지 못했습니다.";
    }
    if (!auctionsQuery.isError && !latestAuctionQuery.isError) return null;
    const err: any = auctionsQuery.error ?? latestAuctionQuery.error;
    return getErrorMessage(err, "경매 정보를 불러오지 못했습니다.");
  }, [
    auctionsQuery.error,
    auctionsQuery.isError,
    latestAuctionQuery.error,
    latestAuctionQuery.isError,
    productId,
  ]);
  const isAuctionLoading =
    auctionsQuery.isLoading || latestAuctionQuery.isLoading;

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  const latestAuction = latestAuctionQuery.data ?? null;
  const activeAuction = useMemo(
    () =>
      latestAuction ??
      (auctions.find((a) => a.status === AuctionStatus.IN_PROGRESS) ||
        auctions.find((a) => a.status === AuctionStatus.READY)),
    [auctions, latestAuction]
  );

  // 이전 경매 이력(종료/유찰/취소 등)만 별도로 보여줌
  const getAuctionKey = (auction: AuctionDetailResponse) =>
    auction.auctionId ?? auction.id ?? "";

  const activeAuctionKey = activeAuction ? getAuctionKey(activeAuction) : null;
  const otherAuctions = useMemo(
    () =>
      auctions.filter(
        (a) =>
          getAuctionKey(a) !== activeAuctionKey &&
          a.status !== AuctionStatus.IN_PROGRESS &&
          a.status !== AuctionStatus.READY
      ),
    [auctions, activeAuctionKey]
  );

  const isOwner =
    !!user?.userId && !!product?.sellerId && user.userId === product.sellerId;

  const hasPendingAuction =
    auctions.some((auction) => auction.status === AuctionStatus.READY) ||
    activeAuction?.status === AuctionStatus.READY;
  const hasInProgressAuction =
    auctions.some((auction) => auction.status === AuctionStatus.IN_PROGRESS) ||
    activeAuction?.status === AuctionStatus.IN_PROGRESS;

  const hasBlockingAuction =
    auctions.some(
      (auction) =>
        auction.status === AuctionStatus.IN_PROGRESS ||
        auction.status === AuctionStatus.READY
    ) ||
    activeAuction?.status === AuctionStatus.IN_PROGRESS ||
    activeAuction?.status === AuctionStatus.READY;

  const canEditProduct =
    isOwner && (!activeAuction || activeAuction.status === AuctionStatus.READY);

  const canReregisterAuction =
    ((!activeAuction && auctions.length > 0) || auctions.length === 0) &&
    isOwner;
  const canReregisterFromActiveAuction =
    isOwner &&
    !!product?.id &&
    !!activeAuction &&
    (activeAuction.status === AuctionStatus.FAILED ||
      activeAuction.status === AuctionStatus.CANCELLED);
  const canRegisterAuction =
    isOwner && !!product?.id && !latestAuctionId && !hasBlockingAuction;

  const canDeleteProduct = !!(isOwner && product && !hasBlockingAuction);
  const showAuctionActions =
    !auctionsQuery.isLoading &&
    !latestAuctionQuery.isLoading &&
    !auctionsQuery.isError &&
    !latestAuctionQuery.isError;

  const heroImage =
    galleryItems[activeImageIndex]?.url ?? "/images/no_image.png";

  const isAuctionDeletable = (auction?: AuctionDetailResponse | null) =>
    !!(auction && isOwner && deletableAuctionStatuses.includes(auction.status));

  const categoryLabels = useMemo(() => {
    const categories = product?.categories ?? [];
    return categories
      .map((item: any) => {
        if (item) return item?.name;
      })
      .filter((label) => label.trim().length > 0);
  }, [product?.categories]);

  const handleDeleteProduct = async () => {
    if (!product) {
      alert("상품 정보를 찾을 수 없습니다.");
      return;
    }
    if (hasPendingAuction) {
      alert("대기 중인 경매를 먼저 삭제한 뒤 상품을 삭제할 수 있습니다.");
      return;
    }
    const sellerIdForDeletion = product.sellerId ?? user?.userId;
    if (!sellerIdForDeletion) {
      alert("상품 삭제 권한이 없습니다.");
      return;
    }
    if (
      !window.confirm(
        "상품을 삭제하시겠습니까? 해당 작업은 되돌릴 수 없습니다."
      )
    ) {
      return;
    }
    let deleted = false;
    try {
      setDeleteLoading(true);
      await productApi.deleteProduct(product.id);
      setIsDeleted(true);
      queryClient.removeQueries({
        queryKey: queryKeys.products.detail(product.id),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.auctions.byProduct(product.id),
      });
      if (product.latestAuctionId) {
        queryClient.removeQueries({
          queryKey: queryKeys.auctions.detail(product.latestAuctionId),
        });
      }
      if (user?.userId) {
        queryClient.setQueryData(
          queryKeys.products.mine(user.userId),
          (prev?: Product[]) =>
            prev ? prev.filter((item) => item.id !== product.id) : prev
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.lists(),
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.mine(user?.userId),
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.auctions.lists(),
          refetchType: "none",
        }),
      ]);
      deleted = true;
      alert("상품이 삭제되었습니다.");
    } catch (err: any) {
      console.error("상품 삭제 실패:", err);
      alert(err?.response?.data?.message ?? "상품 삭제에 실패했습니다.");
    } finally {
      setDeleteLoading(false);
      if (deleted) {
        navigate("/mypage?tab=5");
      }
    }
  };

  const handleDeleteAuction = async (auction: AuctionDetailResponse) => {
    const auctionKey = getAuctionKey(auction);
    if (!auctionKey) return;
    if (!isAuctionDeletable(auction)) {
      alert("해당 경매를 삭제할 권한이 없습니다.");
      return;
    }
    if (
      !window.confirm(
        "경매를 삭제하시겠습니까? 삭제된 경매는 복구할 수 없습니다."
      )
    ) {
      return;
    }
    try {
      setDeletingAuctionId(auctionKey);
      setAuctions((prev) =>
        prev.filter((item) => getAuctionKey(item) !== auctionKey)
      );
      queryClient.setQueryData(
        queryKeys.auctions.byProduct(productId),
        (
          prev?: { data?: AuctionDetailResponse[] } | AuctionDetailResponse[]
        ) => {
          const list = Array.isArray(prev) ? prev : prev?.data ?? [];
          const next = list.filter(
            (item) => getAuctionKey(item) !== auctionKey
          );
          return Array.isArray(prev) ? next : { ...prev, data: next };
        }
      );
      await auctionApi.removeAuction(auctionKey);
      if (product?.latestAuctionId === auctionKey) {
        await productApi.updateLatestAuctionId(product.id, null);
      }
      queryClient.removeQueries({
        queryKey: queryKeys.auctions.detail(auctionKey),
      });
      if (product?.id) {
        queryClient.setQueryData(
          queryKeys.products.detail(product.id),
          (prev?: Product | null) => {
            if (!prev) return prev;
            if (prev.latestAuctionId !== auctionKey) return prev;
            return { ...prev, latestAuctionId: null };
          }
        );
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.auctions.lists(),
        refetchType: "none",
      });
      alert("경매가 삭제되었습니다.");
    } catch (err: any) {
      console.error("경매 삭제 실패:", err);
      alert(err?.response?.data?.message ?? "경매 삭제에 실패했습니다.");
      await auctionsQuery.refetch();
    } finally {
      setDeletingAuctionId(null);
    }
  };

  const wishlistQuery = useQuery({
    queryKey: queryKeys.wishlist.detail(user?.userId, productId),
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
    enabled: !!productId && !!user?.userId,
    staleTime: 30_000,
    retry: false,
  });

  const updateWishlistCaches = useCallback(
    (nextDesired: boolean) => {
      if (!user?.userId || !product) return;
      const userId = user.userId;
      const productId = product.id;
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
            const nextProducts = prev.products.some(
              (existing) => existing.id === productId
            )
              ? prev.products
              : [product, ...prev.products];
            return { entries: nextEntries, products: nextProducts };
          }
          return {
            entries: prev.entries.filter(
              (entry) => entry.productId !== productId
            ),
            products: prev.products.filter(
              (existing) => existing.id !== productId
            ),
          };
        }
      );
    },
    [product, queryClient, user?.userId]
  );

  useEffect(() => {
    if (!productId) return;
    if (!user) {
      setIsWish(false);
      wishDesiredRef.current = false;
      wishServerRef.current = false;
      return;
    }
    const exists = !!wishlistQuery.data && wishlistQuery.data.deletedYn !== "Y";
    setIsWish(exists);
    wishDesiredRef.current = exists;
    wishServerRef.current = exists;
  }, [productId, user, wishlistQuery.data]);

  const showProductSkeleton = productQuery.isLoading;
  const showProductError = !!error;
  const showProductEmpty = !productQuery.isLoading && !error && !product;
  const hasProduct = !!product;

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
          mb={3}
        >
          <Typography variant="h4">상품 상세</Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: { xs: "flex-start", md: "flex-end" },
              gap: 1,
              maxWidth: { xs: "100%", md: "auto" },
            }}
          >
            {showAuctionActions && hasProduct && (
              <Stack direction="row" spacing={1} alignItems="center">
                {isOwner && !hasInProgressAuction && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDeleteProduct}
                    disabled={deleteLoading || !canDeleteProduct}
                  >
                    {deleteLoading ? "삭제 중..." : "상품 삭제"}
                  </Button>
                )}
                {canEditProduct && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    component={RouterLink}
                    to={`/products/${product.id}/edit`}
                  >
                    상품 수정
                  </Button>
                )}
              </Stack>
            )}
            {showAuctionActions &&
              hasProduct &&
              hasPendingAuction &&
              isOwner && (
                <Typography
                  variant="body2"
                  color="warning.main"
                  sx={{ textAlign: { xs: "left", md: "right" } }}
                >
                  대기 중인 경매를 먼저 삭제해야 상품을 삭제할 수 있습니다.
                </Typography>
              )}
          </Box>
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={4}
          alignItems="flex-start"
        >
          {/* 상품 기본 정보 */}
          <Box flex={{ xs: "1 1 auto", md: "0 0 40%" }}>
            {showProductSkeleton ? (
              <Card>
                <Skeleton variant="rectangular" height={260} />
                <CardContent>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="90%" />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            ) : showProductError ? (
              <Card>
                <CardContent>
                  <Alert severity="error">
                    {getErrorMessage(error, "상품 정보를 불러오지 못했습니다.")}
                  </Alert>
                </CardContent>
              </Card>
            ) : showProductEmpty ? (
              <Card>
                <CardContent>
                  <Alert severity="info">상품을 찾을 수 없습니다.</Alert>
                </CardContent>
              </Card>
            ) : (
              <Card>
                {fileGroupQuery.isError && (
                  <Alert severity="warning" sx={{ m: 2 }}>
                    이미지 로드에 실패했습니다.
                  </Alert>
                )}
                {isFileLoading ? (
                  <Skeleton variant="rectangular" height={260} />
                ) : (
                  <CardMedia
                    component="img"
                    height="260"
                    image={heroImage}
                    alt={product?.name}
                    sx={{
                      objectFit: "contain",
                      backgroundColor: "grey.50",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                )}
                {isFileLoading ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ px: 2, py: 1 }}
                  >
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <Skeleton
                        key={`gallery-skeleton-${idx}`}
                        variant="rectangular"
                        width={64}
                        height={64}
                        sx={{ borderRadius: 1 }}
                      />
                    ))}
                  </Stack>
                ) : (
                  galleryItems.length > 1 && (
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ px: 2, py: 1 }}
                    >
                      {galleryItems.map((item, idx) => {
                        const isActive = idx === activeImageIndex;
                        return (
                          <ButtonBase
                            key={item.key}
                            onClick={() => setActiveImageIndex(idx)}
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: 1,
                              overflow: "hidden",
                              border: "2px solid",
                              borderColor: isActive
                                ? "primary.main"
                                : "transparent",
                              boxShadow: isActive ? 2 : 0,
                            }}
                          >
                            <Box
                              component="img"
                              src={item.url}
                              alt={item.label}
                              sx={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </ButtonBase>
                        );
                      })}
                    </Stack>
                  )
                )}

                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="h5" gutterBottom noWrap>
                        {product?.name}
                      </Typography>
                      {categoryLabels.length > 0 && (
                        <Stack
                          direction="row"
                          spacing={0.75}
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mb: 1 }}
                        >
                          {categoryLabels.map((label) => (
                            <Chip
                              key={label}
                              label={label}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={async () => {
                        if (!user) {
                          alert("로그인 후 찜하기를 사용할 수 있습니다.");
                          navigate("/login");
                          return;
                        }
                        if (!product) return;

                        // Optimistic: disable 없이 즉시 UI 반영 + 연타 시 마지막 의도만 서버에 반영
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
                          while (
                            wishServerRef.current !== wishDesiredRef.current
                          ) {
                            const target = wishDesiredRef.current;
                            if (target) {
                              await wishlistApi.add(product.id);
                            } else {
                              await wishlistApi.remove(product.id);
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
                            err?.response?.data?.message ??
                              "찜하기 처리 중 오류가 발생했습니다."
                          );
                        } finally {
                          wishInFlightRef.current = false;
                          if (wishActionSeqRef.current === seqAtClick) {
                            setWishLoading(false);
                          }
                        }
                      }}
                    >
                      {isWish ? (
                        <FavoriteIcon color="error" fontSize="small" />
                      ) : (
                        <FavoriteBorderIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                  <Box sx={{ mb: 2.5, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      상품 설명
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        whiteSpace: "pre-line",
                        minHeight: 180,
                        maxHeight: 280,
                        overflow: "auto",
                        pr: 0.5,
                      }}
                    >
                      {product?.description || "설명 없음"}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>

          {/* 경매 영역 */}
          <Box flex={1}>
            <Stack spacing={3}>
              <Card>
                <CardContent>
                  <Stack spacing={1.5} mb={2}>
                    <Typography variant="caption" color="text.secondary">
                      경매 정보
                    </Typography>
                    {activeAuction && (
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="space-between"
                        flexWrap="wrap"
                      >
                        <Chip
                          label={getAuctionStatusText(activeAuction.status)}
                          color={
                            activeAuction.status === AuctionStatus.IN_PROGRESS
                              ? "success"
                              : "default"
                          }
                          size="small"
                        />
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          justifyContent="flex-end"
                          flexWrap="wrap"
                        >
                          {showAuctionActions &&
                            isAuctionDeletable(activeAuction) && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() =>
                                  handleDeleteAuction(activeAuction)
                                }
                                disabled={
                                  deletingAuctionId ===
                                  getAuctionKey(activeAuction)
                                }
                                sx={{
                                  borderLeft: "1px solid",
                                  borderColor: "error.main",
                                  pl: 1.25,
                                }}
                              >
                                {deletingAuctionId ===
                                getAuctionKey(activeAuction)
                                  ? "삭제 중..."
                                  : "경매 삭제"}
                              </Button>
                            )}
                          {showAuctionActions &&
                            activeAuction.status === AuctionStatus.READY &&
                            isOwner && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                component={RouterLink}
                                to={`/auctions/${
                                  activeAuction.auctionId ?? activeAuction.id
                                }/edit`}
                              >
                                경매 수정
                              </Button>
                            )}
                        </Stack>
                      </Stack>
                    )}
                  </Stack>

                  {auctionErrorMessage ? (
                    <Alert severity="error">{auctionErrorMessage}</Alert>
                  ) : isAuctionLoading ? (
                    <Stack spacing={1}>
                      <Skeleton variant="text" width="45%" />
                      <Skeleton variant="text" width="60%" />
                      <Skeleton variant="text" width="40%" />
                      <Skeleton variant="rounded" height={36} width="35%" />
                    </Stack>
                  ) : activeAuction ? (
                    <>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        시작가: {formatWon(activeAuction.startBid)}
                      </Typography>
                      {activeAuction.status === AuctionStatus.READY ? null : (
                        <>
                          <Typography
                            variant="h4"
                            fontWeight="bold"
                            sx={{ mb: 1 }}
                          >
                            최고입찰가:{" "}
                            {(activeAuction.currentBid ?? 0) > 0
                              ? formatWon(activeAuction.currentBid)
                              : "-"}
                          </Typography>
                          {(activeAuction.currentBid ?? 0) <= 0 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              아직 입찰이 없습니다. 첫 입찰은 시작가 이상 부터
                              가능합니다.
                            </Typography>
                          )}
                        </>
                      )}
                      {activeAuction.status === AuctionStatus.READY && (
                        <Typography variant="body2" color="text.secondary">
                          시작 예정:{" "}
                          {formatDateTime(activeAuction.auctionStartAt)}
                        </Typography>
                      )}
                      {activeAuction.status !== AuctionStatus.READY && (
                        <Typography variant="body2" color="text.secondary">
                          남은 시간:{" "}
                          <RemainingTime
                            auctionStartAt={activeAuction.auctionStartAt}
                            auctionEndAt={activeAuction.auctionEndAt}
                            status={activeAuction.status}
                          />
                        </Typography>
                      )}
                      <Box
                        sx={{
                          mt: 2,
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <Button
                          variant="contained"
                          color="primary"
                          component={RouterLink}
                          to={`/auctions/${
                            activeAuction.auctionId ?? activeAuction.id
                          }`}
                        >
                          {activeAuction.status === AuctionStatus.IN_PROGRESS
                            ? "경매 참여하기"
                            : activeAuction.status === AuctionStatus.READY
                            ? "경매 상세보기"
                            : "경매 결과 보기"}
                        </Button>
                        {canReregisterFromActiveAuction && (
                          <Button
                            variant="outlined"
                            color="primary"
                            component={RouterLink}
                            to={`/auctions/new/${product?.id}`}
                          >
                            경매 재등록
                          </Button>
                        )}
                      </Box>
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        이 상품에 진행 중인 경매가 없습니다.
                      </Typography>
                      {showAuctionActions &&
                        (canRegisterAuction || canReregisterAuction) && (
                          <Box sx={{ mt: 2, textAlign: "right" }}>
                            <Button
                              variant="contained"
                              color="primary"
                              component={RouterLink}
                              to={`/auctions/new/${product?.id}`}
                            >
                              {auctions.length === 0
                                ? "경매 등록"
                                : "경매 재등록"}
                            </Button>
                          </Box>
                        )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  다른 경매 이력
                </Typography>
                {auctionErrorMessage ? (
                  <Alert severity="error">{auctionErrorMessage}</Alert>
                ) : isAuctionLoading ? (
                  <Stack spacing={1.5}>
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <Card key={`auction-skeleton-${idx}`} variant="outlined">
                        <CardContent>
                          <Stack spacing={1}>
                            <Skeleton variant="text" width="35%" />
                            <Skeleton variant="text" width="55%" />
                            <Skeleton variant="text" width="45%" />
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : auctions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    연관된 경매가 없습니다.
                  </Typography>
                ) : otherAuctions.length === 0 && activeAuction ? (
                  <Typography variant="body2" color="text.secondary">
                    이외의 경매 이력이 없습니다.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {otherAuctions.map((auction) => (
                      <Card
                        key={auction.auctionId ?? auction.id}
                        variant="outlined"
                      >
                        <CardContent>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            mb={1}
                          >
                            <Chip
                              label={getAuctionStatusText(
                                auction.status as AuctionStatus
                              )}
                              size="small"
                              color={
                                auction.status === AuctionStatus.IN_PROGRESS
                                  ? "success"
                                  : "default"
                              }
                            />
                            <Stack
                              spacing={1}
                              alignItems="flex-end"
                              textAlign="right"
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {formatWon(
                                  Math.max(
                                    auction.currentBid ?? 0,
                                    auction.startBid
                                  )
                                )}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                종료: {formatDateTime(auction.auctionEndAt)}
                              </Typography>
                            </Stack>
                          </Stack>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            mt={1}
                          >
                            <Box>
                              {showAuctionActions &&
                                isAuctionDeletable(auction) && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={() => handleDeleteAuction(auction)}
                                    disabled={
                                      deletingAuctionId ===
                                      getAuctionKey(auction)
                                    }
                                  >
                                    {deletingAuctionId ===
                                    getAuctionKey(auction)
                                      ? "삭제 중..."
                                      : "삭제"}
                                  </Button>
                                )}
                            </Box>
                            <Button
                              size="small"
                              variant="outlined"
                              component={RouterLink}
                              to={`/auctions/${
                                auction.auctionId ?? auction.id
                              }`}
                            >
                              상세 보기
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Container>
  );
};

export default ProductDetail;
