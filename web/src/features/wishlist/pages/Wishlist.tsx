import type { Product } from "@moreauction/types";
import CloseIcon from "@mui/icons-material/Close";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { productApi } from "@/apis/productApi";
import { wishlistApi, type WishlistEntry } from "@/apis/wishlistApi";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/queries/queryKeys";
import { getErrorMessage } from "@/utils/getErrorMessage";

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
            products: prev.products.filter((product) => product.id !== productId),
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

  const products = wishlistQuery.data?.products ?? [];
  const entries = wishlistQuery.data?.entries ?? [];

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          찜 목록 (Wishlist)
        </Typography>
        <Box sx={{ mb: 3 }}>
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
                sx={{ height: "100%", display: "flex", flexDirection: "column" }}
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
        <Paper sx={{ p: 2 }}>
          {wishlistQuery.isLoading &&
            products.length === 0 &&
            !errorMessage && (
              <List>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <ListItem key={idx} divider>
                    <ListItemText
                      primary={<Skeleton width="60%" />}
                      secondary={<Skeleton width="30%" />}
                    />
                  </ListItem>
                ))}
              </List>
            )}

          {!wishlistQuery.isLoading && errorMessage && (
            <Alert severity="error">{errorMessage}</Alert>
          )}
          {!wishlistQuery.isLoading &&
            !errorMessage &&
            entries.length === 0 && (
              <Alert severity="info">
                찜한 상품이 없습니다. 마음에 드는 상품을 찜해보세요.
              </Alert>
            )}
          {!wishlistQuery.isLoading && !errorMessage && products.length > 0 && (
            <List>
              {products.map((product) => (
                <ListItem
                  key={product.id}
                  divider
                  secondaryAction={
                    <Tooltip title="찜 삭제">
                      <span>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleRemoveWishlist(product.id)}
                          disabled={removingId === product.id}
                          size="small"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={
                      <Typography
                        fontWeight={600}
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
                    }
                    secondary={
                      product.createdAt
                        ? `등록일: ${new Date(
                            product.createdAt
                          ).toLocaleDateString()}`
                        : undefined
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Wishlist;
