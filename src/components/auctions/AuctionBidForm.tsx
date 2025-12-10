import { Gavel } from "@mui/icons-material";
import { Alert, Box, TextField, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";

interface AuctionBidFormProps {
  isAuctionInProgress: boolean;
  currentBidPrice: number;
  newBidAmount: string;
  setNewBidAmount: (value: string) => void;
  handleBidSubmit: (event: React.FormEvent) => Promise<void>;
  bidLoading: boolean;
  isConnected: boolean;
  isWithdrawn: boolean;
  isAuthenticated: boolean;
}

const AuctionBidForm: React.FC<AuctionBidFormProps> = ({
  isAuctionInProgress,
  currentBidPrice,
  newBidAmount,
  setNewBidAmount,
  handleBidSubmit,
  bidLoading,
  isConnected,
  isWithdrawn,
  isAuthenticated,
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
          {isAuthenticated && !isConnected && (
            <Alert severity="warning">
              실시간 서버와 연결이 끊어졌습니다. 입찰을 시도할 수 없습니다.
            </Alert>
          )}
        </Box>

        <TextField
          type="number"
          label={`입찰 금액 (현재가 ${currentBidPrice.toLocaleString()}원 이상)`}
          value={newBidAmount}
          onChange={(e) => setNewBidAmount(e.target.value)}
          fullWidth
          onFocus={() =>
            !newBidAmount && setNewBidAmount(String(currentBidPrice + 100))
          }
          disabled={!isConnected || isWithdrawn}
          inputProps={{ min: currentBidPrice + 100, step: 100 }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={
            !isConnected || isWithdrawn || bidLoading || !isAuctionInProgress
          }
          fullWidth
        >
          {!isAuctionInProgress
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
