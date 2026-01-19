import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { formatWon } from "@moreauction/utils";

interface AuctionDialogsProps {
  openLoginPrompt: boolean;
  setOpenLoginPrompt: (open: boolean) => void;
  handleCloseLoginPrompt: () => void;

  openDepositPrompt: boolean;
  setOpenDepositPrompt: (open: boolean) => void;
  handleCloseDepositPrompt: () => void;
  depositAmount: number;
  isDepositLoading?: boolean;

  openWithdrawnPopup: boolean;
  setOpenWithdrawnPopup: (open: boolean) => void;
  handleWithdraw: () => void;
  isCurrentUserHighestBidder: boolean;
  isWithdrawLoading?: boolean;
}

const AuctionDialogs: React.FC<AuctionDialogsProps> = ({
  openLoginPrompt,
  setOpenLoginPrompt,
  handleCloseLoginPrompt,
  openDepositPrompt,
  setOpenDepositPrompt,
  handleCloseDepositPrompt,
  depositAmount,
  isDepositLoading = false,
  openWithdrawnPopup,
  setOpenWithdrawnPopup,
  handleWithdraw,
  isCurrentUserHighestBidder,
  isWithdrawLoading = false,
}) => {
  return (
    <>
      {/* 로그인 프롬프트 */}
      <Dialog open={openLoginPrompt} onClose={() => setOpenLoginPrompt(false)}>
        <DialogTitle>로그인 필요</DialogTitle>
        <DialogContent>
          <Typography>입찰에 참여하려면 먼저 로그인해야 합니다.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLoginPrompt(false)}>취소</Button>
          <Button onClick={handleCloseLoginPrompt} autoFocus>
            로그인
          </Button>
        </DialogActions>
      </Dialog>

      {/* 보증금 프롬프트 */}
      <Dialog
        open={openDepositPrompt}
        onClose={() => {
          if (!isDepositLoading) {
            setOpenDepositPrompt(false);
          }
        }}
      >
        <DialogTitle>보증금 필요</DialogTitle>
        <DialogContent>
          <Typography>
            경매에 처음 입찰하시려면 보증금{" "}
            <Typography component="span" fontWeight="bold">
              {formatWon(depositAmount)}
            </Typography>
            이 필요합니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDepositPrompt(false)}
            disabled={isDepositLoading}
          >
            취소
          </Button>
          <Button
            onClick={handleCloseDepositPrompt}
            autoFocus
            disabled={isDepositLoading}
          >
            {isDepositLoading ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                처리중...
              </>
            ) : (
              "보증금 결제"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 경매 포기 확인 */}
      <Dialog
        open={openWithdrawnPopup}
        onClose={() => {
          if (!isWithdrawLoading) {
            setOpenWithdrawnPopup(false);
          }
        }}
      >
        <DialogTitle>경매 포기</DialogTitle>
        <DialogContent>
          {isCurrentUserHighestBidder ? (
            <Typography color="error">
              현재 최고 입찰자이므로 경매를 포기할 수 없습니다.
            </Typography>
          ) : (
            <Typography>
              포기하면 보증금이 즉시 환불되며, 해당 경매에는 다시 참여할 수
              없습니다.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenWithdrawnPopup(false)}
            disabled={isWithdrawLoading}
          >
            취소
          </Button>
          <Button
            onClick={handleWithdraw}
            autoFocus
            disabled={isCurrentUserHighestBidder || isWithdrawLoading}
          >
            {isWithdrawLoading ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                처리중...
              </>
            ) : (
              "포기"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AuctionDialogs;
