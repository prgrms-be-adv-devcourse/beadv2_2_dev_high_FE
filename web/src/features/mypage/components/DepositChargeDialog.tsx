import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";
import { MoneyInput } from "@/shared/components/inputs/MoneyInput";

interface DepositChargeDialogProps {
  open: boolean;
  loading: boolean;
  amount: string;
  errorText: string | null;
  onChangeAmount: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  showAutoPayOption?: boolean;
  autoPayOptionChecked?: boolean;
  onChangeAutoPayOption?: (checked: boolean) => void;
  autoPayOptionLabel?: string;
  autoPayOptionHelper?: string;
}

export const DepositChargeDialog: React.FC<DepositChargeDialogProps> = ({
  open,
  loading,
  amount,
  errorText,
  onChangeAmount,
  onClose,
  onSubmit,
  showAutoPayOption = false,
  autoPayOptionChecked = false,
  onChangeAutoPayOption,
  autoPayOptionLabel = "충전 후 보증금을 바로 납부",
  autoPayOptionHelper = "충전 완료 시 보증금 결제를 이어서 진행합니다.",
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 0 }}>예치금 충전</DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            충전 금액을 입력해 주세요. 결제 승인 후 예치금이 반영됩니다.
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: "background.paper",
            }}
          >
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" fontWeight={700}>
                충전 금액
              </Typography>
              <MoneyInput
                autoFocus
                margin="dense"
                id="amount"
                label="금액 (원)"
                fullWidth
                variant="standard"
                value={amount.replace(/\D/g, "")}
                onChangeValue={onChangeAmount}
                error={!!errorText}
                helperText={errorText}
                InputProps={{
                  endAdornment: "원",
                }}
              />
            </Stack>
          </Paper>
          {showAutoPayOption && (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                backgroundColor: "background.paper",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoPayOptionChecked}
                    onChange={(event) =>
                      onChangeAutoPayOption?.(event.target.checked)
                    }
                  />
                }
                label={autoPayOptionLabel}
              />
              <Box sx={{ pl: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  {autoPayOptionHelper}
                </Typography>
              </Box>
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          닫기
        </Button>
        <Button
          onClick={onSubmit}
          disabled={loading}
          variant="contained"
        >
          {loading ? <CircularProgress size={22} /> : "충전하기"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
