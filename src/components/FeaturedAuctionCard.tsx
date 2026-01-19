import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { auctionApi } from "../apis/auctionApi";
import { AuctionStatus, type PagedAuctionResponse } from "../types/auction";
import { getAuctionStatusText } from "../utils/statusText";
import RemainingTime from "./RemainingTime";
import { formatWon } from "../utils/money";

/**
 * 홈 히어로에 들어갈 "오늘의 인기 경매" 카드
 * - 진행 중(IN_PROGRESS) 경매 중 최고입찰가가 가장 높은 1개를 보여줍니다.
 */
const FeaturedAuctionCard: React.FC = () => {
  const [data, setData] = useState<PagedAuctionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopAuction = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await auctionApi.getAuctions({
          page: 0,
          size: 1,
          status: [AuctionStatus.IN_PROGRESS],
          sort: ["currentBid,DESC"],
        });
        setData(res.data);
      } catch (err) {
        console.error("인기 경매 조회 실패:", err);
        setError("인기 경매를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchTopAuction();
  }, []);

  const auction = data?.content?.[0];
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
      {loading ? (
        <Skeleton variant="rectangular" height={220} />
      ) : (
        <CardMedia
          component="img"
          height="220"
          image={auction?.imageUrl ?? "/images/no_image.png"}
          alt={auction?.productName ?? "오늘의 인기 경매"}
          sx={{ objectFit: "cover" }}
        />
      )}
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {!error && (
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
              {loading
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
                  {highestBidPrice != null
                    ? formatWon(highestBidPrice)
                    : "-"}
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
              !loading && (
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
