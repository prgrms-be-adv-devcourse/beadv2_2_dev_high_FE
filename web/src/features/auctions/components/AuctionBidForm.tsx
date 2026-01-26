import { Gavel } from "@mui/icons-material";
import { Alert, Box, Link, TextField, Tooltip, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import { formatNumber } from "@moreauction/utils";
import { Link as RouterLink } from "react-router-dom";

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
  isBidBanned?: boolean;
  bidBanMessage?: string | null;
  bidBanCountdown?: number | null;
  bidBanJustEnded?: boolean;
  isParticipated?: boolean;
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
  isBidBanned = false,
  bidBanMessage = null,
  bidBanCountdown = null,
  bidBanJustEnded = false,
  isParticipated = true,
}) => {
  const bidBanTooltip = bidBanMessage ?? "입찰이 제한되어 있습니다.";
  const formatCountdown = (seconds: number) => {
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };
  const bidBanCountdownLabel =
    bidBanCountdown != null ? formatCountdown(bidBanCountdown) : null;
  const bidBanTooltipContent = (
    <Box sx={{ px: 1.25, py: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        입찰 제한 안내
      </Typography>
      <Typography variant="body2">{bidBanTooltip}</Typography>
      {bidBanCountdownLabel && (
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 0.75, opacity: 0.8 }}
        >
          남은 시간 · {bidBanCountdownLabel}
        </Typography>
      )}
    </Box>
  );
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
              <Link component={RouterLink} to="/login" sx={{ ml: 0.5 }}>
                로그인
              </Link>
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
            isSeller ||
            isBidBanned
          }
          inputProps={{ min: minBidPrice, step: 100 }}
        />

        <Tooltip
          title={isBidBanned ? bidBanTooltipContent : ""}
          placement="top"
          arrow
          disableHoverListener={!isBidBanned}
          componentsProps={{
            tooltip: {
              sx: {
                bgcolor: "#1f2933",
                color: "#fff",
                borderRadius: 2,
                boxShadow:
                  "0 12px 28px rgba(0, 0, 0, 0.24), 0 2px 6px rgba(0, 0, 0, 0.2)",
                maxWidth: 260,
                px: 0,
                py: 0,
              },
            },
            arrow: {
              sx: {
                color: "#1f2933",
              },
            },
          }}
        >
          <span>
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
                isSeller ||
                isBidBanned
              }
              fullWidth
            >
              {isAuctionInReady
                ? "대기중 입니다."
                : !isAuctionInProgress
                  ? "종료 되었습니다."
                  : !isAuthenticated
                    ? "로그인 필요"
                    : bidBanJustEnded
                      ? "제한 종료"
                      : !isParticipated
                        ? "보증금 납부"
                        : isBidBanned
                          ? bidBanCountdownLabel
                            ? `입찰 제한 (${bidBanCountdownLabel})`
                            : "입찰 제한"
                          : bidLoading
                            ? "입찰 중..."
                            : "입찰"}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default AuctionBidForm;
