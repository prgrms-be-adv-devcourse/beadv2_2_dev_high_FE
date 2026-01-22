import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { formatWon } from "@moreauction/utils";

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionLoading: boolean;
  paymentError: string | null;
  payableAmount: number;
  payLimitDate?: string | null;
  depositBalance: number;
  useDepositEnabled: boolean;
  useDepositAll: boolean;
  useDepositAmount: string;
  onToggleUseDepositEnabled: (next: boolean) => void;
  onToggleUseDepositAll: (next: boolean) => void;
  onChangeDepositAmount: (next: string) => void;
  depositUsageAmount: number;
  pgAmount: number;
}

const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onClose,
  onConfirm,
  actionLoading,
  paymentError,
  payableAmount,
  payLimitDate,
  depositBalance,
  useDepositEnabled,
  useDepositAll,
  useDepositAmount,
  onToggleUseDepositEnabled,
  onToggleUseDepositAll,
  onChangeDepositAmount,
  depositUsageAmount,
  pgAmount,
}) => {
  const maxDepositUsage = Math.max(Math.min(depositBalance, payableAmount), 0);
  const handleDialogClose = () => {
    if (actionLoading) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      disableEscapeKeyDown={actionLoading}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>결제하기</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: "rgba(15, 23, 42, 0.02)",
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                주문 금액
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {formatWon(payableAmount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                결제 기한 ·{" "}
                {payLimitDate ? new Date(payLimitDate).toLocaleString() : "-"}
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={1}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="subtitle2">예치금 사용</Typography>
                <Switch
                  checked={useDepositEnabled}
                  onChange={(event) =>
                    onToggleUseDepositEnabled(event.target.checked)
                  }
                  disabled={depositBalance <= 0}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                사용 가능 잔액: {formatWon(depositBalance)}
              </Typography>
              {useDepositEnabled && (
                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={useDepositAll}
                        onChange={(event) =>
                          onToggleUseDepositAll(event.target.checked)
                        }
                      />
                    }
                    label="예치금 전액 사용"
                  />
                  {!useDepositAll && (
                    <TextField
                      label="예치금 사용 금액"
                      size="small"
                      value={useDepositAmount}
                      onChange={(event) => {
                        const raw = event.target.value.replace(/[^\d]/g, "");
                        if (raw === "") {
                          onChangeDepositAmount("");
                          return;
                        }
                        const numeric = Number(raw);
                        const clamped = Number.isNaN(numeric)
                          ? 0
                          : Math.min(numeric, maxDepositUsage);
                        onChangeDepositAmount(String(clamped));
                      }}
                      helperText={`최대 ${formatWon(maxDepositUsage)}`}
                      inputProps={{
                        inputMode: "numeric",
                        max: maxDepositUsage,
                      }}
                      fullWidth
                    />
                  )}
                </Stack>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={0.75}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  예치금 사용액
                </Typography>
                <Typography variant="subtitle1" fontWeight={700}>
                  {formatWon(depositUsageAmount)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  최종 결제금액
                </Typography>
                <Typography variant="subtitle1" fontWeight={700}>
                  {formatWon(pgAmount)}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {paymentError && <Alert severity="error">{paymentError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose} disabled={actionLoading}>
          닫기
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={actionLoading}
        >
          결제 진행
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialog;
