import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auctionApi } from "@/apis/auctionApi";
import {
  AuctionStatus,
  type AuctionDetailResponse,
  type AuctionRankingResponse,
  type PagedAuctionResponse,
} from "@moreauction/types";
import { getAuctionStatusText } from "@moreauction/utils";
import RemainingTime from "@/shared/components/RemainingTime";
import { formatWon } from "@moreauction/utils";
import { queryKeys } from "@/shared/queries/queryKeys";
import { ImageWithFallback } from "@/shared/components/common/ImageWithFallback";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

/**
 * 홈 히어로에 들어갈 "오늘의 인기 경매" 카드
 * - 진행 중(IN_PROGRESS) 경매 중 최고입찰가가 가장 높은 1개를 보여줍니다.
 */
const FeaturedAuctionCard: React.FC = () => {
  const topAuctionQuery = useQuery({
    queryKey: queryKeys.auctions.featured(AuctionStatus.IN_PROGRESS),
    queryFn: async () => {
      const res = await auctionApi.getTopAuctions(1);
      const items = res.data as AuctionRankingResponse[];
      return items[0]?.auction ?? null;
    },
    staleTime: 30_000,
  });

  const errorMessage = useMemo(() => {
    if (!topAuctionQuery.isError) return null;
    return getErrorMessage(
      topAuctionQuery.error,
      "인기 경매를 불러오지 못했습니다."
    );
  }, [topAuctionQuery.error, topAuctionQuery.isError]);

  const auction = topAuctionQuery.data as AuctionDetailResponse | null;
  const hasBid = (auction?.currentBid ?? 0) > 0;
  const highestBidPrice = hasBid ? (auction?.currentBid as number) : null;

  return (
    <Card
      sx={{
        width: "100%",
        maxWidth: 420,
        borderRadius: 3,
        boxShadow: "0 16px 40px rgba(0,0,0,0.15)",
        overflow: "hidden",
      }}
    >
      {topAuctionQuery.isLoading ? (
        <Skeleton variant="rectangular" height={220} />
      ) : (
        <ImageWithFallback
          src={""}
          alt={auction?.productName ?? "오늘의 인기 경매"}
          height={220}
          sx={{ objectFit: "cover" }}
        />
      )}
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {!errorMessage && (
          <>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip label="오늘의 인기" color="secondary" size="small" />
              {auction && (
                <Chip
                  label={getAuctionStatusText(auction.status)}
                  color="primary"
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {topAuctionQuery.isLoading
                ? "인기 경매를 불러오는 중..."
                : auction?.productName ?? "진행 중인 인기 경매가 없습니다."}
            </Typography>
            {auction ? (
              <>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, color: "primary.main" }}
                >
                  최고입찰가{" "}
                  {highestBidPrice != null ? formatWon(highestBidPrice) : "-"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  시작가 {formatWon(auction.startBid ?? 0)} · 남은 시간{" "}
                  <RemainingTime
                    auctionStartAt={auction.auctionStartAt}
                    auctionEndAt={auction.auctionEndAt}
                    status={auction.status}
                  />
                </Typography>
                <Box sx={{ textAlign: "right", mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    component={RouterLink}
                    to={`/auctions/${auction.id || auction.auctionId}`}
                  >
                    경매 참여하기
                  </Button>
                </Box>
              </>
            ) : (
              !topAuctionQuery.isLoading && (
                <Typography variant="body2" color="text.secondary">
                  현재 진행 중인 인기 경매가 없습니다. 곧 새로운 경매가 시작될
                  예정이에요.
                </Typography>
              )
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FeaturedAuctionCard;
