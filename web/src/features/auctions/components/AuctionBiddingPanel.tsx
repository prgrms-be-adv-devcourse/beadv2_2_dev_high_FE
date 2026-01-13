import { People, Timer } from "@mui/icons-material";
import { Box, Paper, Skeleton, Stack, Typography } from "@mui/material";
import RemainingTime from "@/shared/components/RemainingTime";
import { AuctionStatus } from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import { useEffect, useRef, useState } from "react";

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

interface AuctionBiddingPanelProps {
  status: AuctionStatus;
  startBid: number;
  currentBidPrice: number;
  hasAnyBid: boolean;
  highestBidderId?: string;
  highestBidderLabel?: string | null;
  isBidderLoading?: boolean;
  currentUserCount: number;
  auctionEndAt: string;
  auctionStartAt: string;
}

const useAnimatedNumber = (value: number, enabled: boolean, duration = 700) => {
  const [displayValue, setDisplayValue] = useState(value);
  const displayRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    displayRef.current = displayValue;
  }, [displayValue]);

  useEffect(() => {
    if (!enabled) {
      setDisplayValue(value);
      displayRef.current = value;
      return;
    }

    const from = displayRef.current;
    const to = value;
    if (from === to) {
      setDisplayValue(to);
      return;
    }

    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);
      const next = Math.round(from + (to - from) * eased);
      setDisplayValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [duration, enabled, value]);

  return displayValue;
};

const AuctionBiddingPanel: React.FC<AuctionBiddingPanelProps> = ({
  status,
  startBid,
  currentBidPrice,
  hasAnyBid,
  highestBidderId,
  highestBidderLabel,
  isBidderLoading = false,
  currentUserCount,
  auctionEndAt,
  auctionStartAt,
}) => {
  const animatedCurrentBid = useAnimatedNumber(currentBidPrice, hasAnyBid);

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="text.secondary">
          시작 가격
        </Typography>
        <Typography variant="h5" fontWeight="bold" color="primary.main">
          {formatWon(startBid)}
        </Typography>
        {status !== AuctionStatus.READY && (
          <>
            <Typography variant="overline" color="text.secondary">
              최고 입찰가
            </Typography>
            <Typography variant="h3" fontWeight="bold" color="primary.main">
              {hasAnyBid ? formatWon(animatedCurrentBid) : "-"}
            </Typography>
            {!hasAnyBid && (
              <Typography variant="caption" color="text.secondary">
                아직 입찰이 없습니다. 첫 입찰은 시작가 이상 부터 가능합니다.
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              최고 입찰자:{" "}
              {highestBidderId ? (
                highestBidderLabel ? (
                  highestBidderLabel
                ) : isBidderLoading ? (
                  <Skeleton width={120} sx={{ display: "inline-block" }} />
                ) : (
                  "-"
                )
              ) : (
                "없음"
              )}
            </Typography>
          </>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          backgroundColor: "action.hover",
          borderRadius: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Timer color="action" />
          <Box minWidth="220px">
            {status === AuctionStatus.READY ? (
              <Stack spacing={0.25}>
                <Typography
                  variant="caption"
                  sx={{ color: "primary.main", fontWeight: 700 }}
                >
                  시작시간: {formatDateTime(auctionStartAt)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  종료예정: {formatDateTime(auctionEndAt)}
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  <RemainingTime
                    auctionEndAt={auctionEndAt}
                    auctionStartAt={auctionStartAt}
                    status={status}
                  />
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={0.25}>
                <Typography variant="caption" color="text.secondary">
                  종료예정: {formatDateTime(auctionEndAt)}
                </Typography>
                <Typography variant="h6" fontWeight="medium">
                  <RemainingTime
                    auctionEndAt={auctionEndAt}
                    auctionStartAt={auctionStartAt}
                    status={status}
                  />
                </Typography>
              </Stack>
            )}
          </Box>
        </Stack>
        <Box display="flex" alignItems="center" gap={1}>
          <People color="action" />
          <Typography variant="body1">{currentUserCount}명</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default AuctionBiddingPanel;
