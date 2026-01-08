import React, { useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { auctionApi } from "@/apis/auctionApi";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/queries/queryKeys";
import { formatWon } from "@moreauction/utils";
import type { AuctionParticipationResponse } from "@moreauction/types";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { Link as RouterLink } from "react-router-dom";

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const AuctionParticipationTab: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const historyQuery = useQuery({
    queryKey: queryKeys.auctions.participationHistory(user?.userId),
    queryFn: async () => {
      const res = await auctionApi.getParticipationHistory();
      return res.data ?? [];
    },
    enabled: isAuthenticated && !!user?.userId,
    staleTime: 30_000,
  });

  const errorMessage = useMemo(() => {
    if (!historyQuery.isError) return null;
    return getErrorMessage(
      historyQuery.error,
      "경매 참여 내역을 불러오는데 실패했습니다."
    );
  }, [historyQuery.error, historyQuery.isError]);

  const items = historyQuery.data ?? [];

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
        <Stack spacing={2}>
          {items.map((item, idx) => (
            <Card key={`participation-${idx}`}>
              <CardContent>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    경매 참여 내역
                  </Typography>
                  {item.auctionId && (
                    <Button
                      size="small"
                      variant="outlined"
                      component={RouterLink}
                      to={`/auctions/${item.auctionId}`}
                    >
                      경매 상세보기
                    </Button>
                  )}
                </Stack>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ flexWrap: "wrap" }}
                >
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
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};
