import {
  Alert,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { DepositOrderInfo, OrderResponse } from "@moreauction/types";
import { formatWon } from "@moreauction/utils";

interface PaymentSummaryCardProps {
  order: OrderResponse;
  purchaseOrder?: DepositOrderInfo | null;
  payableAmount: number;
  isPayExpired: boolean;
  isUnpaid: boolean;
  actionLoading: boolean;
  onOpenPaymentDialog: () => void;
  canCancelPurchase: boolean;
  canRequestRefund: boolean;
  onCancelPurchase: () => void;
  onRequestRefund: () => void;
  isRequestRefundDisabled: boolean;
}

const PaymentSummaryCard: React.FC<PaymentSummaryCardProps> = ({
  order,
  purchaseOrder,
  payableAmount,
  isPayExpired,
  isUnpaid,
  actionLoading,
  onOpenPaymentDialog,
  canCancelPurchase,
  canRequestRefund,
  onCancelPurchase,
  onRequestRefund,
  isRequestRefundDisabled,
}) => {
  const renderRow = (label: string, value?: React.ReactNode) => (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight={700}>
        {value ?? "-"}
      </Typography>
    </Stack>
  );
  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };
  const purchaseStatusLabel = (status?: string | null) => {
    if (!status) return "-";
    switch (status) {
      case "PENDING":
        return "대기";
      case "COMPLETED":
        return "완료";
      case "FAILED":
        return "실패";
      case "CANCELLED":
        return "취소";
      default:
        return status;
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 2,
        backgroundColor: "background.paper",
      }}
    >
      <Typography variant="subtitle1" fontWeight={700}>
        결제 요약
      </Typography>
      <Divider sx={{ my: 1.5 }} />
      <Stack spacing={1}>
        {renderRow("추가 결제금액", formatWon(payableAmount))}
        {renderRow(
          "예치금 사용",
          typeof purchaseOrder?.deposit === "number"
            ? formatWon(purchaseOrder.deposit)
            : "-",
        )}
        {renderRow(
          "실결제 금액",
          typeof purchaseOrder?.paidAmount === "number"
            ? formatWon(purchaseOrder.paidAmount)
            : "-",
        )}
        {renderRow("결제 기한", formatDateTime(order.payLimitDate))}
        {renderRow(
          "구매 완료일",
          order.payCompleteDate
            ? formatDateTime(order.payCompleteDate)
            : "구매 대기",
        )}
      </Stack>
      {purchaseOrder && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1}>
            {renderRow("결제 주문 ID", purchaseOrder.id)}
            {renderRow("결제 상태", purchaseStatusLabel(purchaseOrder.status))}
            {renderRow(
              "총 결제금액",
              typeof purchaseOrder.amount === "number"
                ? formatWon(purchaseOrder.amount)
                : "-",
            )}
            {renderRow(
              "예치금 사용",
              typeof purchaseOrder.deposit === "number"
                ? formatWon(purchaseOrder.deposit)
                : "-",
            )}
            {renderRow(
              "실결제 금액",
              typeof purchaseOrder.paidAmount === "number"
                ? formatWon(purchaseOrder.paidAmount)
                : "-",
            )}
            {renderRow("결제 생성일", formatDateTime(purchaseOrder.createdAt))}
          </Stack>
        </>
      )}
      {isPayExpired && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          결제 기한이 만료되어 구매를 진행할 수 없습니다.
        </Alert>
      )}
      {isUnpaid && (
        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
          onClick={onOpenPaymentDialog}
          disabled={actionLoading || isPayExpired}
        >
          결제하기
        </Button>
      )}
      {(canCancelPurchase || canRequestRefund) && (
        <>
          <Alert severity="info" sx={{ mt: 2 }}>
            보증금 납부금은 제외하고 환불됩니다.
          </Alert>
          {canCancelPurchase && (
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 1.5 }}
              onClick={onCancelPurchase}
              disabled={actionLoading}
            >
              구매취소
            </Button>
          )}
          {canRequestRefund && (
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 1.5 }}
              onClick={onRequestRefund}
              disabled={actionLoading || isRequestRefundDisabled}
            >
              환불요청
            </Button>
          )}
        </>
      )}
    </Paper>
  );
};

export default PaymentSummaryCard;
