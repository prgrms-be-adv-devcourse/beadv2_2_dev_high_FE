import { Gavel } from "@mui/icons-material";
import { Alert, Box, TextField, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";
import { formatNumber } from "@moreauction/utils";

interface AuctionBidFormProps {
  isAuctionInReady: boolean;
  isAuctionInProgress: boolean;
  currentBidPrice: number;
  minBidPrice: number;
  hasAnyBid: boolean;
  newBidAmount: string;
  setNewBidAmount: (value: string) => void;
  handleBidSubmit: (event: React.FormEvent) => Promise<void>;
  bidLoading: boolean;
  isConnected: boolean;
  showConnectionStatus: boolean;
  isRetrying: boolean;
  isWithdrawn: boolean;
  isRefund: boolean;
  isAuthenticated: boolean;
  isParticipationUnavailable?: boolean;
  isSeller?: boolean;
}

const AuctionBidForm: React.FC<AuctionBidFormProps> = ({
  isAuctionInReady,
  isAuctionInProgress,
  currentBidPrice,
  minBidPrice,
  hasAnyBid,
  newBidAmount,
  setNewBidAmount,
  handleBidSubmit,
  bidLoading,
  isConnected,
  showConnectionStatus,
  isRetrying,
  isWithdrawn,
  isRefund,
  isAuthenticated,
  isParticipationUnavailable = false,
  isSeller = false,
}) => {
  const navigate = useNavigate();
  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* 제목 */}
      <Typography variant="h6" gutterBottom mb={2}>
        <Gavel sx={{ verticalAlign: "middle", mr: 1 }} />
        입찰하기
      </Typography>

      {/* 나머지 폼 */}
      <Box
        component="form"
        onSubmit={handleBidSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          justifyContent: "flex-end",
          mt: "auto",
        }}
      >
        <Box sx={{ minHeight: "58px", mt: "auto" }}>
          {!isAuthenticated && (
            <Alert severity="info">
              입찰에 참여하려면 로그인해주세요.
              <Button onClick={() => navigate("/login")} sx={{ ml: 1 }}>
                로그인
              </Button>
            </Alert>
          )}
          {isAuthenticated && isParticipationUnavailable && (
            <Alert severity="error">
              참여 현황을 불러오지 못해 입찰을 진행할 수 없습니다.
            </Alert>
          )}
          {isAuthenticated && isRefund && (
            <Alert severity="warning">
              보증금이 환급 완료되어 입찰할 수 없습니다.
            </Alert>
          )}
          {isAuthenticated && isSeller && (
            <Alert severity="warning">
              본인의 상품에는 입찰할 수 없습니다.
            </Alert>
          )}
          {isAuthenticated &&
            showConnectionStatus &&
            !isConnected &&
            !isRetrying && (
            <Alert severity="warning">
              실시간 서버와 연결이 끊어졌습니다. 입찰은 접수되지만
              최고입찰가/내역 갱신이 늦을 수 있습니다.
            </Alert>
          )}
        </Box>

        <TextField
          type="number"
          label={`입찰 금액 (최고입찰가 ${
            hasAnyBid ? `${formatNumber(currentBidPrice)}원` : "-"
          } · 최소 ${formatNumber(minBidPrice)}원)`}
          value={newBidAmount}
          onChange={(e) => setNewBidAmount(e.target.value)}
          fullWidth
          onFocus={() => !newBidAmount && setNewBidAmount(String(minBidPrice))}
          disabled={
            isWithdrawn ||
            isRefund ||
            !isAuctionInProgress ||
            isParticipationUnavailable ||
            isSeller
          }
          inputProps={{ min: minBidPrice, step: 100 }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={
            isWithdrawn ||
            isRefund ||
            bidLoading ||
            !isAuctionInProgress ||
            isParticipationUnavailable ||
            isSeller
          }
          fullWidth
        >
          {isAuctionInReady
            ? "대기중 입니다."
            : !isAuctionInProgress
            ? "종료 되었습니다."
            : bidLoading
            ? "입찰 중..."
            : "입찰"}
        </Button>
      </Box>
    </Box>
  );
};

export default AuctionBidForm;
