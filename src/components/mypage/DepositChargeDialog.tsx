import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import React from "react";

interface DepositChargeDialogProps {
  open: boolean;
  loading: boolean;
  amount: string;
  errorText: string | null;
  onChangeAmount: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const DepositChargeDialog: React.FC<DepositChargeDialogProps> = ({
  open,
  loading,
  amount,
  errorText,
  onChangeAmount,
  onClose,
  onSubmit,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>예치금 충전</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="amount"
          label="충전 금액 (원)"
          type="number"
          fullWidth
          variant="standard"
          value={amount}
          onChange={(e) => onChangeAmount(e.target.value)}
          error={!!errorText}
          helperText={errorText}
          slotProps={{
            input: {
              inputProps: {
                min: 0,
                step: 1000,
              },
            },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={onSubmit} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "충전하기"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

