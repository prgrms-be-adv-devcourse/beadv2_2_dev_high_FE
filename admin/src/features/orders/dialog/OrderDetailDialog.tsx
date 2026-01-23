import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import type { OrderResponse } from "@moreauction/types";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { formatDate, formatWon } from "@moreauction/utils";
import { getOrderStatusLabel } from "@moreauction/types";
import {
  dialogContentSx,
  dialogPaperSx,
  dialogTitleSx,
} from "@/shared/components/dialogStyles";

type OrderDetailDialogProps = {
  open: boolean;
  order: OrderResponse | null;
  onClose: () => void;
  onExited: () => void;
};

const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 110 }}>
      {label}
    </Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

const OrderDetailDialog = ({
  open,
  order,
  onClose,
  onExited,
}: OrderDetailDialogProps) => {
  const [snapshot, setSnapshot] = useState<OrderResponse | null>(null);
  const displayOrder = snapshot ?? order;
  const deletedFlag =
    displayOrder?.deletedYn === true || displayOrder?.deletedYn === "Y";

  useEffect(() => {
    if (open && order) {
      setSnapshot(order);
    }
  }, [open, order]);

  const handleExited = () => {
    setSnapshot(null);
    onExited();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
      TransitionProps={{ onExited: handleExited }}
    >
      <DialogTitle sx={dialogTitleSx}>주문 상세</DialogTitle>
      <DialogContent dividers sx={dialogContentSx}>
        {displayOrder ? (
          <Stack spacing={2}>
            <InfoRow label="주문 ID" value={displayOrder.id} />
            <InfoRow label="상품명" value={displayOrder.productName ?? "-"} />
            <InfoRow label="판매자 ID" value={displayOrder.sellerId ?? "-"} />
            <InfoRow label="구매자 ID" value={displayOrder.buyerId ?? "-"} />
            <InfoRow label="경매 ID" value={displayOrder.auctionId ?? "-"} />
            <InfoRow
              label="낙찰가"
              value={formatWon(displayOrder.winningAmount)}
            />
            <InfoRow
              label="상태"
              value={
                <Chip
                  size="small"
                  label={getOrderStatusLabel(displayOrder.status)}
                />
              }
            />
            <InfoRow
              label="삭제 상태"
              value={
                <Chip
                  size="small"
                  label={deletedFlag ? "Y" : "N"}
                  color={deletedFlag ? "default" : "success"}
                  variant={deletedFlag ? "outlined" : "filled"}
                />
              }
            />
            <InfoRow
              label="결제 기한"
              value={
                displayOrder.payLimitDate
                  ? formatDate(displayOrder.payLimitDate)
                  : "-"
              }
            />
            <InfoRow
              label="결제 완료일"
              value={
                displayOrder.payCompleteDate
                  ? formatDate(displayOrder.payCompleteDate)
                  : "-"
              }
            />
            <InfoRow
              label="낙찰확정일"
              value={
                displayOrder.confirmDate
                  ? formatDate(displayOrder.confirmDate)
                  : "-"
              }
            />
            <InfoRow
              label="등록일"
              value={formatDate(displayOrder.createdAt)}
            />
            <InfoRow
              label="수정일"
              value={formatDate(displayOrder.updatedAt)}
            />
          </Stack>
        ) : (
          <Typography color="text.secondary">
            선택된 주문이 없습니다.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderDetailDialog;
