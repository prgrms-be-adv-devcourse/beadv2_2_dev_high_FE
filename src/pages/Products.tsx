import { Search as SearchIcon } from "@mui/icons-material";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Container,
  InputAdornment,
  Pagination,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { productApi } from "../apis/productApi";
import {
  ProductStatus,
  type PagedProductResponse,
  type Product,
} from "../types/product";

// 경매 목록 API 응답 타입 정의 (페이징 포함)
const Products: React.FC = () => {
  const [productData, setProductData] = useState<PagedProductResponse | null>(
    null
  );

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // 상품 상태를 사용자 친화적인 텍스트로 변환
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

  useEffect(() => {
    fetchProducts();
  }, [page, searchQuery]);

  const fetchProducts = async () => {
    try {
      const response = await productApi.getProducts({
        page: page - 1,
        size: 20,
        search: searchQuery || undefined, // 검색어가 있을 때만 추가
      });

      setProductData(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(1);
  };

  const formatAuctionPrice = (product: Product) => {
    switch (product.status) {
      case ProductStatus.IN_PROGESS: {
        const amount = product.currentBid ?? product.startBid ?? 0;
        if (amount == null) return null;
        return {
          label: "현재가",
          amount,
          color: "error.main" as const,
        };
      }
      case ProductStatus.READY: {
        const amount = product.startBid ?? 0;
        if (amount == null) return null;
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

  return (
    <Container>
      {/* 검색 바 */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="검색..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 4,
          }}
        >
          {productData?.content?.map((product: Product, i) => (
            <Card
              key={product.id || i}
              sx={{
                height: 360,
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
                  height="200"
                  image={product?.imageUrl || "/images/no_image.png"}
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
                  {/* 상품명 */}
                  <Typography
                    gutterBottom
                    variant="h6"
                    component="h2"
                    sx={{
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={product.name} // 툴팁으로 전체 이름 표시
                  >
                    {product.name}
                  </Typography>

                  {/* 카테고리 표시 */}
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: "-webkit-box",
                      WebkitLineClamp: 2, // 최대 2줄
                      WebkitBoxOrient: "vertical",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                  >
                    {
                      product.categories && product.categories.length > 0
                        ? Array.isArray(product.categories)
                          ? product.categories
                              .map((cat) =>
                                typeof cat === "string" ? cat : cat.categoryName
                              )
                              .join(", ")
                          : product.categories
                        : "카테고리 없음" /* 기본 카테고리 */
                    }
                  </Typography>

                  {/* 경매 가격 요약 */}
                  {(() => {
                    const price = formatAuctionPrice(product);
                    if (!price) return null;
                    return (
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mt: 1,
                          fontWeight: 600,
                          color: price.color,
                          textAlign: "right",
                        }}
                      >
                        {price.label} {price.amount.toLocaleString()}원
                      </Typography>
                    );
                  })()}

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
          ))}
        </Box>
      </Box>

      <Pagination
        count={productData?.totalPages ?? 0}
        page={page}
        onChange={handlePageChange}
        sx={{ display: "flex", justifyContent: "center", mt: 4 }}
      />
    </Container>
  );
};

export default Products;
