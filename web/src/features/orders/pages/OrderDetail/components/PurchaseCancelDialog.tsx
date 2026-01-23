import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export const CANCEL_REASONS = [
  "단순 변심",
  "배송지 변경",
  "상품 정보와 상이",
  "기타(직접 입력)",
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number];

interface PurchaseCancelDialogProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  selectedReason: CancelReason | "";
  customReason: string;
  onChangeReason: (value: CancelReason | "") => void;
  onChangeCustomReason: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const PurchaseCancelDialog: React.FC<PurchaseCancelDialogProps> = ({
  open,
  loading,
  error,
  selectedReason,
  customReason,
  onChangeReason,
  onChangeCustomReason,
  onClose,
  onConfirm,
}) => {
  const isCustomReason = selectedReason === "기타(직접 입력)";

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>구매 취소</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            결제 완료 상태에서만 구매 취소가 가능합니다.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="cancel-reason-label">취소 사유</InputLabel>
            <Select
              labelId="cancel-reason-label"
              label="취소 사유"
              value={selectedReason}
              onChange={(event) => {
                onChangeReason(event.target.value as CancelReason);
              }}
            >
              <MenuItem value="" disabled>
                선택해주세요
              </MenuItem>
              {CANCEL_REASONS.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {isCustomReason && (
            <TextField
              label="직접 입력"
              value={customReason}
              onChange={(event) => onChangeCustomReason(event.target.value)}
              placeholder="취소 사유를 입력해주세요."
              fullWidth
              multiline
              minRows={3}
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          닫기
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
        >
          취소 요청
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PurchaseCancelDialog;
