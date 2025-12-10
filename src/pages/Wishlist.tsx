import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Container,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { wishlistApi } from "../apis/wishlistApi";
import { productApi } from "../apis/productApi";
import {
  ProductStatus,
  type Product,
} from "../types/product";
import { useAuth } from "../contexts/AuthContext";

const Wishlist: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        setProducts(
          productResults.filter(
            (p): p is Product => p !== null
          )
        );
      } catch (err) {
        console.error("찜 목록 조회 실패:", err);
        setError("찜 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, user]);

  const getProductStatusText = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.IN_PROGESS:
        return "판매중";
      case ProductStatus.READY:
        return "판매대기";
      case ProductStatus.COMPLETE:
        return "판매완료";
      default:
        return "판매대기";
    }
  };

  const formatAuctionPrice = (product: Product) => {
    switch (product.status) {
      case ProductStatus.IN_PROGESS: {
        const amount = product.currentBid ?? product.startBid ?? 0;
        return {
          label: "현재가",
          amount,
          color: "error.main" as const,
        };
      }
      case ProductStatus.READY: {
        const amount = product.startBid ?? 0;
        return {
          label: "시작가",
          amount,
          color: "primary.main" as const,
        };
      }
      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            찜 목록 (Wishlist)
          </Typography>
          <Typography variant="body1">
            로그인 후 찜한 상품을 확인할 수 있습니다.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          찜 목록 (Wishlist)
        </Typography>
        {loading && (
          <Typography variant="body1">찜 목록을 불러오는 중입니다...</Typography>
        )}
        {!loading && error && (
          <Typography variant="body1" color="error">
            {error}
          </Typography>
        )}
        {!loading && !error && products.length === 0 && (
          <Typography variant="body1">
            찜한 상품이 없습니다. 마음에 드는 상품을 찜해보세요.
          </Typography>
        )}
        {!loading && !error && products.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 3,
              mt: 2,
            }}
          >
            {products.map((product) => {
              const price = formatAuctionPrice(product);
              return (
                <Card
                  key={product.id}
                  sx={{
                    height: 320,
                    borderRadius: 2,
                    boxShadow: 1,
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: 4,
                      transform: "translateY(-4px)",
                    },
                  }}
                >
                  <CardActionArea
                    component={RouterLink}
                    to={`/products/${product.id}`}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      alignItems: "stretch",
                      textAlign: "left",
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="180"
                      image={product.imageUrl || "/images/no_image.png"}
                      alt={product.name}
                      sx={{
                        objectFit: "cover",
                        width: "100%",
                      }}
                    />
                    <CardContent
                      sx={{
                        flex: 1,
                        flexDirection: "column",
                        display: "flex",
                      }}
                    >
                      <Typography
                        gutterBottom
                        variant="subtitle1"
                        sx={{
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={product.name}
                      >
                        {product.name}
                      </Typography>
                      {/* 경매 가격 요약 */}
                      {price && (
                        <Typography
                          variant="subtitle2"
                          sx={{
                            mt: 0.5,
                            fontWeight: 600,
                            color: price.color,
                            textAlign: "right",
                          }}
                        >
                          {price.label} {price.amount.toLocaleString()}원
                        </Typography>
                      )}
                      {/* 상품 상태 */}
                      <Box sx={{ mt: "auto", pt: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "success.main",
                            fontWeight: 500,
                            textAlign: "right",
                          }}
                        >
                          {getProductStatusText(product.status)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default Wishlist;
