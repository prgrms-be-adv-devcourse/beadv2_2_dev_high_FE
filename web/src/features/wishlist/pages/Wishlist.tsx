import type { ApiResponseDto, FileGroup, Product } from "@moreauction/types";
import { getProductImageUrls } from "@moreauction/utils";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  CircularProgress,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { fileApi } from "@/apis/fileApi";
import { productApi } from "@/apis/productApi";
import { wishlistApi, type WishlistEntry } from "@/apis/wishlistApi";
import { useAuth } from "@moreauction/auth";
import { ImageWithFallback } from "@/shared/components/common/ImageWithFallback";
import { queryKeys } from "@/shared/queries/queryKeys";
import { seedFileGroupCache } from "@/shared/queries/seedFileGroupCache";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const Wishlist: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const wishlistQuery = useQuery({
    queryKey: queryKeys.wishlist.list(user?.userId),
    queryFn: async () => {
      const data = await wishlistApi.getMyWishlist({
        page: 0,
        size: 20,
      });
      const page = data.data;
      const entries = page?.content ?? [];

      if (entries.length === 0) {
        return { entries, products: [] as Product[] };
      }

      const uniqueProductIds = Array.from(
        new Set(entries.map((e) => e.productId))
      );

      const cachedProducts = uniqueProductIds
        .map((productId) =>
          queryClient.getQueryData<Product>(
            queryKeys.products.detail(productId)
          )
        )
        .filter((product): product is Product => !!product);

      const cachedProductIds = new Set(
        cachedProducts.map((product) => product.id)
      );
      const missingProductIds = uniqueProductIds.filter(
        (productId) => !cachedProductIds.has(productId)
      );

      const fetchedProducts = missingProductIds.length
        ? await Promise.all(
            missingProductIds.map(async (productId) => {
              try {
                const res = await productApi.getProductById(productId);
                queryClient.setQueryData(
                  queryKeys.products.detail(productId),
                  res.data
                );
                return res.data;
              } catch (err) {
                console.error("상품 조회 실패:", productId, err);
                return null;
              }
            })
          )
        : [];

      // const auctionList = await Promise.all(
      //   uniqueProductIds.map(async (productId) => {
      //     try {
      //       const res = await auctionApi.getAuctionsByProductId(productId);
      //       return res.data;
      //     } catch (err) {
      //       console.error("상품 조회 실패:", productId, err);
      //       return null;
      //     }
      //   })
      // );

      const productMap = new Map(
        [...cachedProducts, ...fetchedProducts]
          .filter((result): result is Product => result !== null)
          .map((product) => [product.id, product])
      );

      const products = entries.map((entry) => {
        const product = productMap.get(entry.productId);
        if (product) return product;
        return {
          id: entry.productId,
          name: "상품 정보를 불러오지 못했습니다.",
          createdAt: undefined,
        } as Product;
      });
      return { entries, products };
    },
    enabled: isAuthenticated && !!user?.userId,
    staleTime: 30_000,
  });

  const errorMessage = useMemo(() => {
    if (!wishlistQuery.isError) return null;
    return getErrorMessage(
      wishlistQuery.error,
      "찜 목록을 불러오는데 실패했습니다."
    );
  }, [wishlistQuery.error, wishlistQuery.isError]);

  const removeMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.remove(productId),
    onSuccess: (_, productId) => {
      queryClient.setQueryData(
        queryKeys.wishlist.list(user?.userId),
        (
          prev:
            | {
                entries: WishlistEntry[];
                products: Product[];
              }
            | undefined
        ) => {
          if (!prev) return prev;
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
  });

  const handleRemoveWishlist = async (productId: string) => {
    if (removingId) return;
    try {
      setRemovingId(productId);
      await removeMutation.mutateAsync(productId);
    } catch (err) {
      console.error("찜 삭제 실패:", err);
      alert("찜 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setRemovingId(null);
    }
  };

  const products = wishlistQuery.data?.products ?? [];
  const entries = wishlistQuery.data?.entries ?? [];
  const entryMap = useMemo(
    () => new Map(entries.map((entry) => [entry.productId, entry])),
    [entries]
  );

  const fileGroupIds = useMemo(() => {
    const ids = products
      .map((product) => product.fileGroupId)
      .filter((id): id is string => id != null && id !== "")
      .map((id) => String(id));
    return Array.from(new Set(ids));
  }, [products]);

  const cachedFileGroups = useMemo(
    () =>
      fileGroupIds
        .map(
          (id) =>
            queryClient.getQueryData<ApiResponseDto<FileGroup>>(
              queryKeys.files.group(id)
            )?.data
        )
        .filter((group): group is FileGroup => !!group),
    [fileGroupIds, queryClient]
  );
  const cachedFileGroupIds = useMemo(
    () => new Set(cachedFileGroups.map((group) => String(group.fileGroupId))),
    [cachedFileGroups]
  );
  const missingFileGroupIds = useMemo(
    () => fileGroupIds.filter((id) => !cachedFileGroupIds.has(id)),
    [cachedFileGroupIds, fileGroupIds]
  );
  const fileGroupsQuery = useQuery({
    queryKey: queryKeys.files.groups(missingFileGroupIds),
    queryFn: async () => {
      const response = await fileApi.getFileGroupsByIds(missingFileGroupIds);
      seedFileGroupCache(queryClient, response);
      return response.data ?? [];
    },
    enabled: missingFileGroupIds.length > 0,
    staleTime: 30_000,
  });
  const fileGroupMap = useMemo(() => {
    const list = [...cachedFileGroups, ...(fileGroupsQuery.data ?? [])];
    return new Map(list.map((group) => [String(group.fileGroupId), group]));
  }, [cachedFileGroups, fileGroupsQuery.data]);
  const isImageLoading = wishlistQuery.isLoading || fileGroupsQuery.isLoading;

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
            찜 목록 (Wishlist)
          </Typography>
          <Paper sx={{ p: 2 }}>
            <Alert severity="info">
              로그인 후 찜한 상품을 확인할 수 있습니다.
            </Alert>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1.5 }}
        >
          <Typography variant="h4" component="h1">
            찜 목록 (Wishlist)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            총 {entries.length}개
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          찜한 상품을 모아보고, 관심 경매 시작 알림을 받아보세요.
        </Typography>
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          {wishlistQuery.isLoading &&
            products.length === 0 &&
            !errorMessage && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                  },
                  gap: 3,
                }}
              >
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Card
                    key={`wishlist-skeleton-${idx}`}
                    sx={{ overflow: "hidden", borderRadius: 3 }}
                  >
                    <Skeleton variant="rectangular" height={180} />
                    <CardContent
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      <Skeleton width="70%" />
                      <Skeleton width="45%" />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

          {!wishlistQuery.isLoading && errorMessage && (
            <Alert severity="error">{errorMessage}</Alert>
          )}
          {!wishlistQuery.isLoading &&
            !errorMessage &&
            entries.length === 0 && (
              <Box
                sx={{
                  textAlign: "center",
                  py: 6,
                  px: 2,
                  borderRadius: 3,
                  border: "1px dashed",
                  borderColor: "divider",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  아직 찜한 상품이 없습니다
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  마음에 드는 상품을 찜해두면 빠르게 확인할 수 있어요.
                </Typography>
                <Button component={RouterLink} to="/search" variant="contained">
                  상품 둘러보기
                </Button>
              </Box>
            )}
          {!wishlistQuery.isLoading && !errorMessage && products.length > 0 && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                },
                gap: 3,
              }}
            >
              {products.map((product) => {
                const entry = entryMap.get(product.id);
                const fileGroupId = product.fileGroupId
                  ? String(product.fileGroupId)
                  : null;
                const imageUrls = fileGroupId
                  ? getProductImageUrls(fileGroupMap.get(fileGroupId) ?? null)
                  : [];
                const coverImage = imageUrls[0];
                const wishDate = entry?.createdAt
                  ? new Date(entry.createdAt).toLocaleDateString()
                  : null;
                const categoryLabel = (() => {
                  if (!product.categories?.length) return null;
                  const first = product.categories[0];
                  if (typeof first === "string") return first;
                  return first.categoryName || null;
                })();

                return (
                  <Card
                    key={product.id}
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: "divider",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <ImageWithFallback
                      src={coverImage}
                      alt={product.name}
                      height={180}
                      loading={isImageLoading}
                      sx={{ objectFit: "cover" }}
                    />
                    <Tooltip title="찜 해제">
                      <span>
                        <IconButton
                          aria-label="remove"
                          onClick={() => handleRemoveWishlist(product.id)}
                          disabled={removingId === product.id}
                          size="small"
                          sx={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            bgcolor: "error.main",
                            color: "common.white",
                            boxShadow: 2,
                            "&:hover": {
                              bgcolor: "error.dark",
                            },
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {removingId === product.id && (
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          bgcolor: "rgba(255, 255, 255, 0.7)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          zIndex: 1,
                        }}
                      >
                        <CircularProgress size={28} />
                        <Typography variant="caption" color="text.secondary">
                          찜 해제 중...
                        </Typography>
                      </Box>
                    )}
                    <CardContent
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        flexGrow: 1,
                      }}
                    >
                      {categoryLabel && (
                        <Chip
                          label={categoryLabel}
                          size="small"
                          variant="outlined"
                          sx={{ alignSelf: "flex-start" }}
                        />
                      )}
                      <Typography
                        fontWeight={700}
                        component={RouterLink}
                        to={`/products/${product.id}`}
                        sx={{
                          textDecoration: "none",
                          color: "inherit",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {product.name}
                      </Typography>
                      {wishDate && (
                        <Typography variant="body2" color="text.secondary">
                          찜한 날짜: {wishDate}
                        </Typography>
                      )}
                      {product.createdAt && (
                        <Typography variant="caption" color="text.secondary">
                          등록일:{" "}
                          {new Date(product.createdAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Paper>
        <Box sx={{ mt: 4 }}>
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              찜 기반 추천
            </Typography>
            <Typography variant="body2" color="text.secondary">
              찜한 상품과 비슷한 경매를 추천할 예정입니다.
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
              },
              gap: 3,
            }}
          >
            {Array.from({ length: 2 }).map((_, idx) => (
              <Card
                key={`wishlist-reco-${idx}`}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Skeleton variant="rectangular" height={180} />
                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    mt: 1,
                  }}
                >
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="50%" />
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Wishlist;
