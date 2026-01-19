import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Skeleton,
  Typography,
} from "@mui/material";
import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auctionApi } from "../apis/auctionApi";
import {
  type AuctionQueryParams,
  type PagedAuctionResponse,
  AuctionStatus,
} from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import { getAuctionStatusText } from "@moreauction/utils";
import RemainingTime from "./RemainingTime";

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
}

const AuctionList: React.FC<AuctionListProps> = ({
  status = [],
  sortOption = "ENDING_SOON",
  limit = 4,
  linkDestination = "auction",
}) => {
  const statusKey = Array.isArray(status) ? status.join(",") : "";

  const auctionQuery = useQuery({
    queryKey: ["auctions", "list", statusKey, sortOption, limit],
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
    const err: any = auctionQuery.error;
    return err?.data?.message ?? err?.message ?? "경매 목록을 불러오는데 실패했습니다.";
  }, [auctionQuery.error, auctionQuery.isError]);

  const auctionData = auctionQuery.data ?? null;

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
        : auctionData?.content?.map((auction, i) => {
            const hasBid =
              auction.status === AuctionStatus.IN_PROGRESS &&
              (auction.currentBid ?? 0) > 0;

            return (
              <Card
                key={auction.id || auction.auctionId || i}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={auction.filePath ?? "/images/no_image.png"}
                  alt={auction.productName}
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
                      최고입찰가:{" "}
                      {hasBid
                        ? formatWon(auction.currentBid)
                        : "-"}
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
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        textAlign: "right",
                        display: "block",
                        mt: 0.5,
                      }}
                    >
                      상태: {getAuctionStatusText(auction.status)}
                    </Typography>
                  </Box>
                </CardContent>
                <Button
                  size="small"
                  color="primary"
                  component={RouterLink}
                  to={
                    linkDestination === "product"
                      ? `/products/${auction?.productId}`
                      : `/auctions/${auction.id || auction.auctionId}`
                  }
                  sx={{ m: 1 }}
                >
                  {linkDestination === "product"
                    ? "상품 상세보기"
                    : auction.status === AuctionStatus.IN_PROGRESS
                      ? "경매 참여하기"
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
