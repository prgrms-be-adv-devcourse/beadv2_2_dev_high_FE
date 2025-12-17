import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Container,
  Pagination,
  Typography,
  Chip,
  Stack,
  Skeleton,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { productApi } from "../apis/productApi";
import {
  ProductStatus,
  type Product,
  type ProductAndAuction,
} from "../types/product";
import { getCommonStatusText } from "../utils/statusText";
import { getPrimaryProductImageUrl } from "../utils/images";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

// 경매 목록 API 응답 타입 정의 (페이징 포함)
const Products: React.FC = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "">("");
  const productsQuery = useQuery({
    queryKey: ["products", page, statusFilter],
    queryFn: async () => {
      const response = await productApi.getProducts({
        page: page - 1,
        size: 8,
        status: statusFilter || undefined,
      });
      return response.data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const productData = productsQuery.data ?? null;
  const errorMessage = useMemo(() => {
    if (!productsQuery.isError) return null;
    const err: any = productsQuery.error;
    return (
      err?.data?.message ??
      err?.message ??
      "상품 목록을 불러오는데 실패했습니다."
    );
  }, [productsQuery.error, productsQuery.isError]);

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const handleStatusChange = (value: ProductStatus | "") => {
    setStatusFilter((prev) => (prev === value ? "" : value));
    setPage(1);
  };

  const formatAuctionPrice = (product: Product) => {
    switch (product.status) {
      case ProductStatus.IN_PROGESS: {
        const hasBid = (product.currentBid ?? 0) > 0;
        const highestAmount = hasBid ? (product.currentBid as number) : null;
        const startBid = product.startBid ?? null;
        if (startBid == null && highestAmount == null) return null;
        return {
          highestAmount,
          startBid,
          color: "error.main" as const,
        };
      }
      case ProductStatus.READY: {
        const startBid = product.startBid ?? null;
        if (startBid == null) return null;
        return {
          highestAmount: null,
          startBid,
          color: "primary.main" as const,
        };
      }
      default:
        return null;
    }
  };

  const mapEntryToDisplayProduct = (
    entry: ProductAndAuction
  ): Product | null => {
    if (!entry?.product) return null;
    const latestAuction = entry.auctions?.[0];
    const primaryImageUrl = getPrimaryProductImageUrl(entry.product);
    return {
      ...entry.product,
      startBid: entry.product.startBid ?? latestAuction?.startBid,
      currentBid:
        entry.product.currentBid ??
        latestAuction?.currentBid ??
        entry.product.startBid ??
        latestAuction?.startBid,
      imageUrl:
        primaryImageUrl ?? entry.product.imageUrl ?? latestAuction?.filePath,
    };
  };

  const productsForDisplay =
    productData?.content
      ?.map(mapEntryToDisplayProduct)
      .filter((p): p is Product => p !== null) ?? [];

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          전체 상품
        </Typography>
        <Typography variant="body2" color="text.secondary">
          상품 기준으로 최근 경매 정보(최고입찰가/시작가)와 상태를 함께 볼 수
          있습니다.
        </Typography>
      </Box>

      {/* TODO: 상태 필터 서버측에서  */}
      <Box sx={{ my: 3 }}>
        <Stack direction="row" spacing={1}>
          <Chip
            label="전체"
            clickable
            color={statusFilter === "" ? "primary" : "default"}
            onClick={() => handleStatusChange("")}
          />
          <Chip
            label="진행중"
            clickable
            color={
              statusFilter === ProductStatus.IN_PROGESS ? "primary" : "default"
            }
            onClick={() => handleStatusChange(ProductStatus.IN_PROGESS)}
          />
          <Chip
            label="대기중"
            clickable
            color={statusFilter === ProductStatus.READY ? "primary" : "default"}
            onClick={() => handleStatusChange(ProductStatus.READY)}
          />
          <Chip
            label="종료"
            clickable
            color={
              statusFilter === ProductStatus.COMPLETE ? "primary" : "default"
            }
            onClick={() => handleStatusChange(ProductStatus.COMPLETE)}
          />
        </Stack>
      </Box>

      <Box sx={{ mt: 3 }}>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        {!errorMessage &&
          !productsQuery.isLoading &&
          productsForDisplay.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              조건에 맞는 상품이 없습니다.
            </Alert>
          )}

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
          {productsQuery.isLoading && productsForDisplay.length === 0
            ? // 로딩 중 + 데이터 아직 없을 때 카드 스켈레톤
              Array.from({ length: 8 }).map((_, i) => (
                <Card
                  key={i}
                  sx={{
                    height: 360,
                    borderRadius: 2,
                    boxShadow: 1,
                    overflow: "hidden",
                  }}
                >
                  <Skeleton variant="rectangular" height={200} />
                  <CardContent
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </CardContent>
                </Card>
              ))
            : productsForDisplay.map((product, i) => (
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
                                    typeof cat === "string"
                                      ? cat
                                      : cat.categoryName
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
                          <Box sx={{ mt: 1, textAlign: "right" }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 600,
                                color: price.color,
                              }}
                            >
                              최고입찰가{" "}
                              {price.highestAmount != null
                                ? `${price.highestAmount.toLocaleString()}원`
                                : "-"}
                            </Typography>
                            {price.startBid != null && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                시작가 {price.startBid.toLocaleString()}원
                              </Typography>
                            )}
                          </Box>
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
                          {getCommonStatusText(product.status)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
        </Box>
      </Box>

      {(productData?.totalPages ?? 0) > 1 && (
        <Pagination
          count={productData?.totalPages ?? 0}
          page={page}
          onChange={handlePageChange}
          sx={{ display: "flex", justifyContent: "center", mt: 4 }}
        />
      )}
    </Container>
  );
};

export default Products;
