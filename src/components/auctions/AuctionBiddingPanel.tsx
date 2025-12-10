import { People, Timer } from "@mui/icons-material";
import { Box, Paper, Stack, Typography } from "@mui/material";
import RemainingTime from "../RemainingTime";
import { AuctionStatus } from "../../types/auction";

interface AuctionBiddingPanelProps {
  status: AuctionStatus;
  startBid: number;
  currentBidPrice: number;
  highestBidderInfo: { id?: string; username?: string } | null;
  currentUserCount: number;
  auctionEndAt: string;
  auctionStartAt: string;
}

const AuctionBiddingPanel: React.FC<AuctionBiddingPanelProps> = ({
  status,
  startBid,
  currentBidPrice,
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
          {status === AuctionStatus.READY
            ? "경매 시작 전"
            : `${startBid.toLocaleString()}원`}
        </Typography>
        <Typography variant="overline" color="text.secondary">
          현재 최고 입찰가
        </Typography>
        <Typography variant="h3" fontWeight="bold" color="primary.main">
          {status === AuctionStatus.READY
            ? "경매 시작 전"
            : `${currentBidPrice.toLocaleString()}원`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          최고 입찰자:{" "}
          {highestBidderInfo?.id
            ? `${highestBidderInfo.username} (${highestBidderInfo.id.slice(
                0,
                4
              )}****)`
            : "없음"}
        </Typography>
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
          <Box minWidth="180px">
            <Typography variant="h6" fontWeight="medium">
              <RemainingTime
                auctionEndAt={auctionEndAt}
                auctionStartAt={auctionStartAt}
                status={status}
              />
            </Typography>
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
