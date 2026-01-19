import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Skeleton,
  Typography,
} from "@mui/material";
import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auctionApi } from "@/apis/auctionApi";
import { fileApi } from "@/apis/fileApi";
import { productApi } from "@/apis/productApi";
import {
  type AuctionQueryParams,
  type PagedAuctionResponse,
  type Product,
  AuctionStatus,
} from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import { getAuctionStatusText } from "@moreauction/utils";
import RemainingTime from "@/shared/components/RemainingTime";
import { queryKeys } from "@/queries/queryKeys";
import { ImageWithFallback } from "@/shared/components/common/ImageWithFallback";
import { getErrorMessage } from "@/utils/getErrorMessage";

type AuctionSortOption =
  | "ENDING_SOON"
  | "START_SOON"
  | "NEWEST"
  | "HIGHEST_BID";

const sortMap: Record<AuctionSortOption, string[]> = {
  ENDING_SOON: ["auctionEndAt,ASC"],
  START_SOON: ["auctionStartAt,ASC"],
  NEWEST: ["createdAt,DESC"],
  HIGHEST_BID: ["currentBid,DESC"],
};

interface AuctionListProps extends AuctionQueryParams {
  sortOption?: AuctionSortOption;
  /** 최대 표시 개수 (예: 홈에서는 4개만) */
  limit?: number;
  /**
   * 카드 클릭 시 이동 목적지
   * - auction: 경매 상세
   * - product: 상품 상세
   */
  linkDestination?: "auction" | "product";
  showEmptyState?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

const AuctionList: React.FC<AuctionListProps> = ({
  status = [],
  sortOption = "ENDING_SOON",
  limit = 4,
  linkDestination = "auction",
  showEmptyState = false,
  emptyTitle = "표시할 경매가 없습니다",
  emptyDescription = "조건에 맞는 경매가 없어요. 다른 조건을 찾아보세요.",
}) => {
  const statusKey = Array.isArray(status) ? status.join(",") : "";

  const auctionQuery = useQuery({
    queryKey: queryKeys.auctions.list(statusKey, sortOption, limit),
    queryFn: async () => {
      const params: AuctionQueryParams = {
        page: 0,
        size: limit,
        status,
        sort: sortMap[sortOption],
      };
      const response = await auctionApi.getAuctions(params);
      return response.data as PagedAuctionResponse;
    },
    staleTime: 30_000,
  });

  const errorMessage = useMemo(() => {
    if (!auctionQuery.isError) return null;
    return getErrorMessage(
      auctionQuery.error,
      "경매 목록을 불러오는데 실패했습니다."
    );
  }, [auctionQuery.error, auctionQuery.isError]);

  const auctionData = auctionQuery.data ?? null;
  const auctions = auctionData?.content ?? [];
  const showEmpty =
    showEmptyState &&
    !auctionQuery.isLoading &&
    !errorMessage &&
    auctions.length === 0;

  const productIds = useMemo(() => {
    const ids = auctions
      .map((auction) => auction.productId)
      .filter((id): id is string => !!id);
    return Array.from(new Set(ids));
  }, [auctions]);

  const productsQuery = useQuery({
    queryKey: queryKeys.products.many(productIds),
    queryFn: async () => {
      const response = await productApi.getProductsByIds(productIds);
      return response.data as Product[];
    },
    enabled: productIds.length > 0,
    staleTime: 30_000,
  });

  const productMap = useMemo(() => {
    const list = productsQuery.data ?? [];
    return new Map(list.map((product) => [product.id, product]));
  }, [productsQuery.data]);

  const fileGroupIds = useMemo(() => {
    const ids = (productsQuery.data ?? [])
      .map((product) => product.fileGroupId)
      .filter((id) => id != null && id !== "" && id !== undefined)
      .map((id) => String(id));
    return Array.from(new Set(ids));
  }, [productsQuery.data]);

  const fileGroupsQuery = useQuery({
    queryKey: queryKeys.files.groups(fileGroupIds),
    queryFn: async () => {
      const response = await fileApi.getFileGroupsByIds(fileGroupIds);
      return response.data ?? [];
    },
    enabled: fileGroupIds.length > 0,
    staleTime: 30_000,
  });

  const fileGroupMap = useMemo(() => {
    const list = fileGroupsQuery.data ?? [];
    return new Map(list.map((group) => [String(group.fileGroupId), group]));
  }, [fileGroupsQuery.data]);
  const isImageLoading = productsQuery.isLoading || fileGroupsQuery.isLoading;

  return (
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
      {errorMessage &&
        !auctionQuery.isLoading &&
        (auctionData?.content?.length ?? 0) === 0 && (
          <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>
            {errorMessage}
          </Alert>
        )}

      {showEmpty && (
        <Card
          sx={{
            gridColumn: "1 / -1",
            borderRadius: 3,
            border: "1px dashed",
            borderColor: "divider",
            p: 3,
            textAlign: "center",
            bgcolor: "background.paper",
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {emptyTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {emptyDescription}
            </Typography>
          </CardContent>
        </Card>
      )}

      {auctionQuery.isLoading && (auctionData?.content?.length ?? 0) === 0
        ? Array.from({ length: limit }).map((_, i) => (
            <Card
              key={i}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Skeleton variant="rectangular" height={200} />
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
          ))
        : auctions.map((auction, i) => {
            const hasBid =
              auction.status === AuctionStatus.IN_PROGRESS &&
              (auction.currentBid ?? 0) > 0;
            const bidText =
              auction.status === AuctionStatus.READY
                ? "시작 전"
                : hasBid
                ? `현재 가격: ${formatWon(auction.currentBid)}`
                : "현재 가격: -";
            const product = auction.productId
              ? productMap.get(auction.productId)
              : undefined;
            const fileGroupId =
              product?.fileGroupId != null
                ? String(product.fileGroupId)
                : undefined;
            const fileGroup = fileGroupId
              ? fileGroupMap.get(fileGroupId)
              : undefined;
            const coverImage = fileGroup?.files?.[0]?.filePath ?? "";
            const hasFileGroupId = !!fileGroupId;
            const emptyImage =
              productsQuery.isError ||
              (fileGroupsQuery.isError && hasFileGroupId)
                ? "/images/fallback.png"
                : "/images/no_image.png";

            return (
              <Card
                key={auction.id || auction.auctionId || i}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <ImageWithFallback
                  src={coverImage}
                  alt={auction?.productName ?? "경매 이미지"}
                  height={220}
                  loading={isImageLoading}
                  emptySrc={emptyImage}
                  sx={{ borderBottom: "1px solid", borderColor: "divider" }}
                  skeletonSx={{
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                />
                <CardContent
                  sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
                >
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
                    title={auction.productName} // 툴팁으로 전체 이름 표시
                  >
                    {auction.productName}
                  </Typography>
                  <Box sx={{ mt: "auto", pt: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "error.main",
                        fontWeight: 600,
                        textAlign: "right",
                        fontSize: "1.1rem",
                        mb: 0.5,
                      }}
                    >
                      {bidText}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        textAlign: "right",
                        display: "block",
                        mb: 0.5,
                      }}
                    >
                      시작가: {formatWon(auction.startBid)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          auction.status === "IN_PROGRESS"
                            ? "warning.main"
                            : auction.status === AuctionStatus.READY
                            ? "primary.main"
                            : "text.secondary",
                        fontWeight:
                          auction.status === AuctionStatus.READY ? 700 : 500,
                        textAlign: "right",
                        display: "block",
                      }}
                    >
                      {auction.status === AuctionStatus.READY ? (
                        `시작시간: ${formatDateTime(auction.auctionStartAt)}`
                      ) : (
                        <RemainingTime
                          auctionStartAt={auction.auctionStartAt}
                          auctionEndAt={auction.auctionEndAt}
                          status={auction.status}
                        />
                      )}
                    </Typography>
                  </Box>
                </CardContent>
                <Button
                  size="small"
                  color="primary"
                  variant={
                    linkDestination === "product"
                      ? "outlined"
                      : auction.status === AuctionStatus.IN_PROGRESS
                      ? "contained"
                      : "outlined"
                  }
                  component={RouterLink}
                  to={
                    linkDestination === "product"
                      ? `/products/${auction?.productId}`
                      : `/auctions/${auction.id || auction.auctionId}`
                  }
                  sx={{ m: 1 }}
                >
                  {linkDestination === "product"
                    ? "상품 보러가기"
                    : auction.status === AuctionStatus.IN_PROGRESS
                    ? "경매 바로 참여하기"
                    : "경매 상세보기"}
                </Button>
              </Card>
            );
          })}
    </Box>
  );
};

export default AuctionList;
const formatDateTime = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};
