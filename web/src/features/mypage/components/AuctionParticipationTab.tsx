import React, { useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import { auctionApi } from "@/apis/auctionApi";
import { useAuth } from "@moreauction/auth";
import { queryKeys } from "@/shared/queries/queryKeys";
import { formatWon, getAuctionStatusText } from "@moreauction/utils";
import type {
  AuctionParticipationResponse,
  PagedAuctionParticipationResponse,
} from "@moreauction/types";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";
import { Link as RouterLink } from "react-router-dom";

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const AuctionParticipationTab: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const pageSize = 10;

  const historyQuery = useInfiniteQuery<
    PagedAuctionParticipationResponse,
    Error
  >({
    queryKey: queryKeys.auctions.participationHistory(user?.userId, pageSize),
    queryFn: async ({ pageParam = 0 }) => {
      const res = await auctionApi.getParticipationHistory({
        page: pageParam as number,
        size: pageSize,
        sort: "createdAt,desc",
      });
      return res.data;
    },
    enabled: isAuthenticated && !!user?.userId,
    initialPageParam: 0,
    staleTime: 30_000,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : (lastPage.number ?? 0) + 1,
  });

  const errorMessage = useMemo(() => {
    if (!historyQuery.isError) return null;
    return getErrorMessage(
      historyQuery.error,
      "경매 참여 내역을 불러오는데 실패했습니다."
    );
  }, [historyQuery.error, historyQuery.isError]);

  const items: AuctionParticipationResponse[] =
    historyQuery.data?.pages.flatMap((page) => page.content ?? []) ?? [];
  const loadingMore = historyQuery.isFetchingNextPage;
  const hasMore = !!historyQuery.hasNextPage;
  const canLoadMore = hasMore && !loadingMore;
  const getStatusLabel = (item: AuctionParticipationResponse) => {
    if (item.isWithdrawn) return "포기";
    if (!item.status) return null;
    switch (item.status) {
      case "IN_PROGRESS":
        return "참여중";
      case "COMPLETED":
      case "FAILED":
      case "CANCELLED":
        return "마감";
      case "READY":
      default:
        return null;
    }
  };

  return (
    <Box>
      {historyQuery.isLoading && items.length === 0 && (
        <Stack spacing={2}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={`participation-skeleton-${idx}`}>
              <CardContent>
                <Skeleton width="40%" />
                <Skeleton width="60%" />
                <Skeleton width="30%" />
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {!historyQuery.isLoading && errorMessage && (
        <Alert severity="error">{errorMessage}</Alert>
      )}

      {!historyQuery.isLoading && !errorMessage && items.length === 0 && (
        <Alert severity="info">경매 참여 내역이 없습니다.</Alert>
      )}

      {!historyQuery.isLoading && !errorMessage && items.length > 0 && (
        <>
          <Stack spacing={2}>
            {items.map((item, idx) => (
              <Card key={`participation-${idx}`}>
                <CardActionArea
                  component={item.auctionId ? RouterLink : "div"}
                  to={
                    item.auctionId ? `/auctions/${item.auctionId}` : undefined
                  }
                  disabled={!item.auctionId}
                  sx={{ display: "block" }}
                >
                  <CardContent>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      justifyContent="space-between"
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="subtitle1" fontWeight={700}>
                        {item?.productName || "알 수 없는 상품"}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="flex-end"
                      >
                        {getStatusLabel(item) && (
                          <Chip
                            size="small"
                            label={getStatusLabel(item)}
                            color="default"
                          />
                        )}
                      </Stack>
                    </Stack>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          참여 일시
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDateTime(item.createdAt)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          마지막 입찰가
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {item.lastBidPrice && item.lastBidPrice > 0
                            ? formatWon(item.lastBidPrice)
                            : "-"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          보증금
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {item.depositAmount != null
                            ? formatWon(item.depositAmount)
                            : "-"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          포기 일시
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDateTime(item.withdrawnAt)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          환급 일시
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDateTime(item.refundAt)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
          <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
            <Button
              variant="outlined"
              onClick={() => historyQuery.fetchNextPage()}
              disabled={!canLoadMore}
            >
              {loadingMore
                ? "불러오는 중..."
                : hasMore
                ? "더 보기"
                : "모든 내역을 불러왔습니다"}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};
