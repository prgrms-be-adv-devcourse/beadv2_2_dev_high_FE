import {
  Alert,
  Box,
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
import React, { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { wishlistApi } from "../apis/wishlistApi";
import { productApi } from "../apis/productApi";
import type { Product } from "../types/product";
import { useAuth } from "../contexts/AuthContext";
import CloseIcon from "@mui/icons-material/Close";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const Wishlist: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const wishlistQuery = useQuery({
    queryKey: ["wishlist", user?.userId],
    queryFn: async () => {
      const data = await wishlistApi.getMyWishlist({
        page: 0,
        size: 20,
      });
      const page = data.data;
      const entries = page?.content ?? [];

      if (entries.length === 0) return [];

      const uniqueProductIds = Array.from(
        new Set(entries.map((e) => e.productId))
      );

      const productResults = await Promise.all(
        uniqueProductIds.map(async (productId) => {
          try {
            const res = await productApi.getProductById(productId);
            return res.data;
          } catch (err) {
            console.error("상품 조회 실패:", productId, err);
            return null;
          }
        })
      );

      return productResults
        .map((result) => {
          if (!result?.product) return null;
          const latestAuction = result.auctions?.[0];
          const mergedProduct: Product = {
            ...result.product,
            startBid: result.product.startBid ?? latestAuction?.startBid,
            currentBid:
              result.product.currentBid ??
              latestAuction?.currentBid ??
              result.product.startBid ??
              latestAuction?.startBid,
          };
          return mergedProduct;
        })
        .filter((p): p is Product => p !== null);
    },
    enabled: isAuthenticated && !!user?.userId,
    staleTime: 30_000,
  });

  const errorMessage = useMemo(() => {
    if (!wishlistQuery.isError) return null;
    const err: any = wishlistQuery.error;
    return err?.data?.message ?? err?.message ?? "찜 목록을 불러오는데 실패했습니다.";
  }, [wishlistQuery.error, wishlistQuery.isError]);

  const removeMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.remove(productId),
    onSuccess: (_, productId) => {
      queryClient.setQueryData(
        ["wishlist", user?.userId],
        (prev: Product[] | undefined) =>
          (prev ?? []).filter((product) => product.id !== productId)
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

  const products = wishlistQuery.data ?? [];

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          찜 목록 (Wishlist)
        </Typography>
        <Paper sx={{ p: 2 }}>
          {wishlistQuery.isLoading && products.length === 0 && !errorMessage && (
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
          {!wishlistQuery.isLoading && !errorMessage && products.length === 0 && (
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
                    secondary={`등록일: ${
                      product.createdAt
                        ? new Date(product.createdAt).toLocaleDateString()
                        : "-"
                    }`}
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
