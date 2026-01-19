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
import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { wishlistApi } from "../apis/wishlistApi";
import { productApi } from "../apis/productApi";
import type { Product } from "../types/product";
import { useAuth } from "../contexts/AuthContext";
import CloseIcon from "@mui/icons-material/Close";

const Wishlist: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || !user?.userId) {
        setProducts([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // 기본 첫 페이지만 조회 (필요 시 페이징 확장)
        const data = await wishlistApi.getMyWishlist({
          page: 0,
          size: 20,
        });
        const page = data.data;
        const entries = page?.content ?? [];

        if (entries.length === 0) {
          setProducts([]);
          return;
        }

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

        const hydratedProducts = productResults
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

        setProducts(hydratedProducts);
      } catch (err) {
        console.error("찜 목록 조회 실패:", err);
        setError("찜 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, user]);

  const handleRemoveWishlist = async (productId: string) => {
    if (removingId) return;
    try {
      setRemovingId(productId);
      await wishlistApi.remove(productId);
      setProducts((prev) => prev.filter((product) => product.id !== productId));
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

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          찜 목록 (Wishlist)
        </Typography>
        <Paper sx={{ p: 2 }}>
          {loading && products.length === 0 && !error && (
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

          {!loading && error && <Alert severity="error">{error}</Alert>}
          {!loading && !error && products.length === 0 && (
            <Alert severity="info">
              찜한 상품이 없습니다. 마음에 드는 상품을 찜해보세요.
            </Alert>
          )}
          {!loading && !error && products.length > 0 && (
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
