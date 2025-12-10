import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { AuctionParticipationResponse } from "../../types/auction";

// 보증금 및 참여 상태를 표시하는 컴포넌트
const AuctionParticipationStatus: React.FC<{
  participationStatus: AuctionParticipationResponse;
  depositAmount: number;
  setOpenPopup: () => void;
  refundRequest: () => void;
}> = ({ participationStatus, depositAmount, setOpenPopup, refundRequest }) => {
  const { isParticipated, isWithdrawn, isRefund, lastBidPrice } =
    participationStatus;

  let statusChip;
  if (isWithdrawn && isRefund) {
    statusChip = <Chip label="참여 포기 + 환급 완료" color="success" />;
  } else if (isWithdrawn) {
    statusChip = <Chip label="참여 포기" color="warning" />;
  } else if (isRefund) {
    statusChip = <Chip label="보증금 환급 완료" color="success" />;
  } else if (isParticipated) {
    if (lastBidPrice && lastBidPrice > 0) {
      statusChip = <Chip label="참여중" color="secondary" />;
    } else {
      statusChip = <Chip label="보증금 납부 완료" color="primary" />;
    }
  } else {
    statusChip = <Chip label="미참여" color="default" />;
  }

  return (
    <Paper sx={{ p: 2, backgroundColor: "background.paper" }}>
      {isWithdrawn ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          경매 참여를 포기하여 더 이상 입찰할 수 없습니다.
        </Alert>
      ) : (
        <Box sx={{ minHeight: "58px", mb: "auto" }}></Box>
      )}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        {isParticipated && !isWithdrawn && !isRefund && (
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
          <Box display="flex" gap={1}>
            <Button variant="contained" loading={false} onClick={refundRequest}>
              환불요청
            </Button>
          </Box>
        )}
      </Box>

      <Stack direction="row" alignItems="center" spacing={2} mt={1}>
        <Grid gap={1} flex={1} display={"flex"}>
          {statusChip}
          {lastBidPrice && lastBidPrice > 0 && (
            <Typography variant="h6">
              마지막 입찰가: {lastBidPrice.toLocaleString()}원
            </Typography>
          )}
        </Grid>
        <Typography variant="body1" textAlign="right">
          {isParticipated || isRefund
            ? `보증금: ${depositAmount.toLocaleString()}원`
            : `필요 보증금: ${depositAmount.toLocaleString()}원`}
        </Typography>
      </Stack>
    </Paper>
  );
};
export default AuctionParticipationStatus;
