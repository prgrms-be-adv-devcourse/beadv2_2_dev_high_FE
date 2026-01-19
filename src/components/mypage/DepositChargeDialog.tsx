import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import React from "react";
import { MoneyInput } from "../inputs/MoneyInput";

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
        <MoneyInput
          autoFocus
          margin="dense"
          id="amount"
          label="충전 금액 (원)"
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
