import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  DialogActions,
  Button,
} from "@mui/material";
import React from "react";

const AuctionDeleteDialog = ({
  deleteTarget,
  deleteMutation,
  setDeleteTarget,
}: any) => {
  return (
    <Dialog
      open={!!deleteTarget}
      onClose={() => {
        if (deleteMutation.isPending) return;
        setDeleteTarget(null);
      }}
    >
      <DialogTitle>경매 삭제</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          선택한 경매를 삭제하시겠습니까? 삭제된 경매는 복구할 수 없습니다.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
          대상: {deleteTarget?.productName ?? "-"}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            if (deleteMutation.isPending) return;
            setDeleteTarget(null);
          }}
        >
          취소
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!deleteTarget || deleteMutation.isPending}
          onClick={() => {
            if (!deleteTarget) return;
            deleteMutation.mutate(deleteTarget.id);
          }}
        >
          삭제
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuctionDeleteDialog;
