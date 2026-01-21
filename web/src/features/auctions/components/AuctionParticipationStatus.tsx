import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  Divider,
} from "@mui/material";
import {
  AuctionStatus,
  type AuctionParticipationResponse,
} from "@moreauction/types";
import { formatWon } from "@moreauction/utils";

// 보증금 및 참여 상태를 표시하는 컴포넌트
const AuctionParticipationStatus: React.FC<{
  participationStatus: AuctionParticipationResponse;
  depositAmount: number;
  auctionStatus: AuctionStatus;
  highestUserId?: string | null;
  currentUserId?: string | null;
  setOpenPopup: () => void;
  refundRequest: () => void;
}> = ({
  participationStatus,
  depositAmount,
  auctionStatus,
  highestUserId,
  currentUserId,
  setOpenPopup,
  refundRequest,
}) => {
  const { isParticipated, isWithdrawn, isRefund, lastBidPrice } =
    participationStatus;

  const isAuctionEnded =
    auctionStatus === AuctionStatus.COMPLETED ||
    auctionStatus === AuctionStatus.FAILED ||
    auctionStatus === AuctionStatus.CANCELLED;
  let statusChip;
  if (isWithdrawn && isRefund) {
    statusChip = <Chip label="참여 포기 + 환급 완료" color="success" />;
  } else if (isWithdrawn) {
    statusChip = <Chip label="참여 포기" color="warning" />;
  } else if (isRefund) {
    statusChip = <Chip label="보증금 환급 완료" color="success" />;
  } else if (isAuctionEnded) {
    if (highestUserId && currentUserId && highestUserId === currentUserId) {
      statusChip = <Chip label="낙찰" color="success" />;
    } else if (isParticipated) {
      statusChip = <Chip label="마감" color="default" />;
    } else {
      statusChip = <Chip label="마감" color="default" />;
    }
  } else if (isParticipated) {
    if (lastBidPrice && lastBidPrice > 0) {
      statusChip = <Chip label="참여중" color="secondary" />;
    } else {
      statusChip = <Chip label="보증금 납부 완료" color="primary" />;
    }
  } else {
    statusChip = <Chip label="미참여" color="default" />;
  }

  const statusMessage = (() => {
    if (isWithdrawn) {
      return {
        severity: "warning" as const,
        text: "경매 참여를 포기하여 더 이상 입찰할 수 없습니다.",
      };
    }
    if (isRefund) {
      return {
        severity: "success" as const,
        text: "보증금 환급이 완료되었습니다.",
      };
    }
    if (!isParticipated && isAuctionEnded) {
      return {
        severity: "info" as const,
        text: "참여하지 않은 상태로 경매가 마감되었습니다.",
      };
    }
    if (!isParticipated) {
      return {
        severity: "info" as const,
        text: "보증금을 납부하면 입찰할 수 있어요.",
      };
    }
    return null;
  })();

  return (
    <Paper sx={{ p: 2, backgroundColor: "background.paper" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.25 }}
      >
        {statusChip}
        <Stack direction="row" spacing={1} alignItems="center">
          {isParticipated && !isWithdrawn && !isRefund && !isAuctionEnded && (
            <Button
              variant="contained"
              color="error"
              onClick={setOpenPopup}
              size="medium"
            >
              경매 포기하기
            </Button>
          )}
          {isWithdrawn && !isRefund && (
            <Button variant="contained" loading={false} onClick={refundRequest}>
              환불요청
            </Button>
          )}
        </Stack>
      </Stack>

      {statusMessage ? (
        <>
          <Divider sx={{ mb: 1.5 }} />
          <Alert
            severity={statusMessage.severity}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            {statusMessage.text}
          </Alert>
        </>
      ) : (
        <Divider sx={{ mb: 2 }} />
      )}

      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          borderRadius: 2,
          backgroundColor: "action.hover",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              마지막 입찰가
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {lastBidPrice && lastBidPrice > 0
                ? formatWon(lastBidPrice)
                : "-"}
            </Typography>
            {isParticipated && (!lastBidPrice || lastBidPrice <= 0) && (
              <Typography variant="caption" color="text.secondary">
                아직 입찰 전
              </Typography>
            )}
          </Box>
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary">
              {isParticipated || isRefund ? "보증금" : "필요 보증금"}
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {formatWon(depositAmount)}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};
export default AuctionParticipationStatus;
