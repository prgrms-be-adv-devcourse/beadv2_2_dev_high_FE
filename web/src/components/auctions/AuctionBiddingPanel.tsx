import { People, Timer } from "@mui/icons-material";
import { Box, Paper, Stack, Typography } from "@mui/material";
import RemainingTime from "../RemainingTime";
import { AuctionStatus } from "@moreauction/types";
import { formatWon } from "@moreauction/utils";

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
  highestBidderInfo: { id?: string; username?: string } | null;
  currentUserCount: number;
  auctionEndAt: string;
  auctionStartAt: string;
}

const AuctionBiddingPanel: React.FC<AuctionBiddingPanelProps> = ({
  status,
  startBid,
  currentBidPrice,
  hasAnyBid,
  highestBidderInfo,
  currentUserCount,
  auctionEndAt,
  auctionStartAt,
}) => {
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
              {hasAnyBid ? formatWon(currentBidPrice) : "-"}
            </Typography>
            {!hasAnyBid && (
              <Typography variant="caption" color="text.secondary">
                아직 입찰이 없습니다. 첫 입찰은 시작가 이상 부터 가능합니다.
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              최고 입찰자:{" "}
              {highestBidderInfo?.id
                ? `${highestBidderInfo.username} (${highestBidderInfo.id.slice(
                    0,
                    4
                  )}****)`
                : "없음"}
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
