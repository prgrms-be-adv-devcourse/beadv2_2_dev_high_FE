import { adminProductApi } from "@/apis/adminProductApi";
import type { Product } from "@moreauction/types";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";

const ProductDeleteDialog = ({
  deleteTarget,
  setDeleteTarget,
  deleteMutation,
}: any) => {
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <Dialog
      open={!!deleteTarget}
      onClose={() => {
        if (deleteMutation.isPending) return;
        setDeleteTarget(null);
        setDeleteError(null);
      }}
    >
      <DialogTitle>상품 삭제</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          선택한 상품을 삭제하시겠습니까? 삭제된 상품은 복구할 수 없습니다.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
          대상: {deleteTarget?.name ?? "-"}
        </Typography>
        {deleteError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {deleteError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            if (deleteMutation.isPending) return;
            setDeleteTarget(null);
            setDeleteError(null);
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

export default ProductDeleteDialog;
