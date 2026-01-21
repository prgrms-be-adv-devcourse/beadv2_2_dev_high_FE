import {
  Alert,
  Box,
  Chip,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Switch,
  FormControlLabel,
} from "@mui/material";
import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "@/apis/orderApi";
import { depositApi } from "@/apis/depositApi";
import { requestTossPayment } from "@/shared/utils/requestTossPayment";
import { useAuth } from "@moreauction/auth";
import {
  DepositType,
  getOrderStatusLabel,
  OrderStatus,
  type OrderResponse,
} from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = React.useState(false);
  const [paidOverrideUntil, setPaidOverrideUntil] = React.useState<
    number | null
  >(null);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [useDepositEnabled, setUseDepositEnabled] = React.useState(true);
  const [useDepositAll, setUseDepositAll] = React.useState(true);
  const [useDepositAmount, setUseDepositAmount] = React.useState("");
  const orderQuery = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: async () => {
      if (!orderId) throw new Error("주문 ID가 올바르지 않습니다.");
      const res = await orderApi.getOrderDetail(orderId);
      return res.data as OrderResponse;
    },
    enabled: !!orderId,
    staleTime: 30_000,
  });
  const depositAccountQuery = useQuery({
    queryKey: queryKeys.deposit.account(),
    queryFn: () => depositApi.getAccount(user?.userId),
    enabled: Boolean(user?.userId),
    staleTime: 30_000,
  });

  const errorMessage = useMemo(() => {
    if (!orderId) return "주문 ID가 올바르지 않습니다.";
    if (!orderQuery.isError) return null;
    return getErrorMessage(
      orderQuery.error,
      "주문 정보를 불러오지 못했습니다."
    );
  }, [orderId, orderQuery.error, orderQuery.isError]);

  const order = orderQuery.data ?? null;
  const orderDisplay = React.useMemo(() => {
    if (!order) return order;
    if (order.status !== OrderStatus.UNPAID) return order;
    if (!paidOverrideUntil) return order;
    if (Date.now() > paidOverrideUntil) return order;
    return {
      ...order,
      status: OrderStatus.PAID,
      payCompleteDate: order.payCompleteDate ?? new Date().toISOString(),
    };
  }, [order, paidOverrideUntil]);
  const isUnpaid = orderDisplay?.status === OrderStatus.UNPAID;
  const isPayExpired = React.useMemo(() => {
    if (!orderDisplay?.payLimitDate) return false;
    const limitTime = new Date(orderDisplay.payLimitDate).getTime();
    return Number.isFinite(limitTime) && Date.now() > limitTime;
  }, [orderDisplay?.payLimitDate]);
  const payableAmount =
    orderDisplay && typeof orderDisplay.depositAmount === "number"
      ? Math.max(orderDisplay.winningAmount - orderDisplay.depositAmount, 0)
      : orderDisplay?.winningAmount ?? 0;
  const depositBalance = depositAccountQuery.data?.data?.balance ?? 0;

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("pay") !== "1") return;
    setPaymentDialogOpen(true);
    setUseDepositEnabled(depositBalance > 0);
    setUseDepositAll(true);
    setUseDepositAmount("");
    setPaymentError(null);
  }, [location.search, depositBalance]);

  const setDepositBalanceCache = (next: number) => {
    queryClient.setQueryData(queryKeys.deposit.balance(), next);
    localStorage.setItem("depositBalance", String(next));
  };

  const decrementDepositBalance = (amount: number) => {
    queryClient.setQueryData(
      queryKeys.deposit.balance(),
      (prev: number | undefined) => {
        const base = typeof prev === "number" ? prev : 0;
        const next = Math.max(base - amount, 0);
        localStorage.setItem("depositBalance", String(next));
        return next;
      }
    );
  };

  const handlePayWithDeposit = async () => {
    if (!order || !order.id || actionLoading) return;
    if (isPayExpired) {
      alert("결제 기한이 만료되었습니다.");
      return;
    }
    try {
      setActionLoading(true);
      const info = await depositApi.createDeposit({
        depositOrderId: order.id,
        amount: payableAmount,
        type: DepositType.PAYMENT,
        userId: user?.userId,
      });
      if (typeof info?.data?.balance === "number") {
        setDepositBalanceCache(info.data.balance);
      } else {
        decrementDepositBalance(payableAmount);
      }
      setPaidOverrideUntil(Date.now() + 60_000);
      queryClient.setQueryData(
        queryKeys.orders.detail(order.id),
        (prev?: OrderResponse) =>
          prev
            ? {
                ...prev,
                status: OrderStatus.PAID,
                payCompleteDate: new Date().toISOString(),
              }
            : prev
      );
      queryClient.setQueryData(
        queryKeys.orders.pendingCount(),
        (prev: number | undefined) =>
          Math.max((typeof prev === "number" ? prev : 0) - 1, 0)
      );
      queryClient.setQueryData(
        queryKeys.orders.pending(user?.userId),
        (prev: OrderResponse[] | undefined) =>
          (prev ?? []).filter((item) => item.id !== order.id)
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.pendings(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.pending(user?.userId),
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.histories(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.detail(order.id),
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.account(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.historyAll(),
        }),
      ]);
      alert("결제가 완료되었습니다.");
    } catch (err: any) {
      console.error("예치금 결제 실패:", err);
      alert(err?.data?.message ?? "결제 처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const getDepositUsageAmount = () => {
    if (!useDepositEnabled) return 0;
    if (useDepositAll) {
      return Math.min(depositBalance, payableAmount);
    }
    const parsed = parseInt(useDepositAmount.replace(/,/g, ""), 10);
    if (Number.isNaN(parsed) || parsed <= 0) return 0;
    return Math.min(parsed, depositBalance, payableAmount);
  };

  const handleConfirmPayment = async () => {
    if (!order || !order.id || actionLoading) return;
    if (isPayExpired) {
      alert("결제 기한이 만료되었습니다.");
      return;
    }
    const depositUsage = getDepositUsageAmount();
    const pgAmount = Math.max(payableAmount - depositUsage, 0);
    setPaymentError(null);
    try {
      if (pgAmount <= 0) {
        await handlePayWithDeposit();
        setPaymentDialogOpen(false);
        return;
      }
      setActionLoading(true);
      sessionStorage.setItem(
        "autoPurchaseAfterCharge",
        JSON.stringify({
          orderId: order.id,
          amount: payableAmount,
          depositUsage,
          createdAt: Date.now(),
        })
      );
      const depositOrder = await depositApi.createDepositOrder(pgAmount);
      if (depositOrder?.data?.id) {
        requestTossPayment(
          depositOrder.data.id,
          depositOrder.data.amount,
          "주문 결제"
        );
        setPaymentDialogOpen(false);
      } else {
        throw new Error("주문 생성에 실패했습니다.");
      }
    } catch (chargeErr) {
      console.error("즉시 결제 요청 실패:", chargeErr);
      setPaymentError("즉시 결제 요청 중 오류가 발생했습니다.");
      alert("즉시 결제 요청 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPaymentDialog = () => {
    setPaymentDialogOpen(true);
    setUseDepositEnabled(depositBalance > 0);
    setUseDepositAll(true);
    setUseDepositAmount("");
    setPaymentError(null);
  };

  const handleClosePaymentDialog = () => {
    if (actionLoading) return;
    setPaymentDialogOpen(false);
  };

  const depositUsageAmount = getDepositUsageAmount();
  const pgAmount = Math.max(payableAmount - depositUsageAmount, 0);

  const renderRow = (
    label: string,
    value?: React.ReactNode,
    emphasis?: boolean
  ) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        py: 0.75,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant={emphasis ? "subtitle1" : "body1"}
        fontWeight={emphasis ? 700 : 600}
      >
        {value ?? "-"}
      </Typography>
    </Box>
  );

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
      >
        <Typography variant="h4">주문서</Typography>
        <Button onClick={() => navigate(-1)}>목록으로</Button>
      </Stack>
      <Paper
        sx={{
          mt: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          backgroundColor: "rgba(148, 163, 184, 0.08)",
        }}
      >
        {orderQuery.isLoading ? (
          <Stack spacing={1}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rectangular" height={200} />
          </Stack>
        ) : errorMessage ? (
          <Alert severity="error">{errorMessage}</Alert>
        ) : orderDisplay ? (
          <>
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={1}
              >
                <Box>
                  <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700 }}>
                    {orderDisplay.productName ?? "주문"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    주문 ID · {orderDisplay.id}
                  </Typography>
                </Box>
                <Chip
                  label={getOrderStatusLabel(orderDisplay.status)}
                  color={
                    orderDisplay.status === OrderStatus.PAID
                      ? "success"
                      : orderDisplay.status === OrderStatus.UNPAID
                      ? "warning"
                      : "default"
                  }
                  variant="outlined"
                />
              </Stack>
              <Divider />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
                  gap: 2,
                }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    backgroundColor: "background.paper",
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    주문 정보
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack>
                    {renderRow("주문 번호", orderDisplay.id)}
                    {renderRow("상품명", orderDisplay.productName ?? "주문")}
                    {renderRow("총 낙찰가", formatWon(orderDisplay.winningAmount))}
                    {renderRow(
                      "보증금(기납부)",
                      typeof orderDisplay.depositAmount === "number"
                        ? formatWon(orderDisplay.depositAmount)
                        : "-"
                    )}
                    {renderRow(
                      "주문일(낙찰확정)",
                      orderDisplay.confirmDate
                        ? new Date(orderDisplay.confirmDate).toLocaleString()
                        : "미확인"
                    )}
                    {renderRow(
                      "주문 생성일",
                      new Date(orderDisplay.createdAt).toLocaleString()
                    )}
                    {renderRow(
                      "최근 업데이트",
                      new Date(orderDisplay.updatedAt).toLocaleString()
                    )}
                  </Stack>
                </Paper>

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
                  <Stack>
                    {renderRow(
                      "추가 결제금액",
                      formatWon(payableAmount),
                      true
                    )}
                    {renderRow(
                      "결제 기한",
                      orderDisplay.payLimitDate
                        ? new Date(orderDisplay.payLimitDate).toLocaleString()
                        : "-"
                    )}
                    {renderRow(
                      "구매 완료일",
                      orderDisplay.payCompleteDate
                        ? new Date(orderDisplay.payCompleteDate).toLocaleString()
                        : "구매 대기"
                    )}
                  </Stack>
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
                      onClick={handleOpenPaymentDialog}
                      disabled={actionLoading || isPayExpired}
                    >
                      결제하기
                    </Button>
                  )}
                </Paper>
              </Box>
            </Stack>
          </>
        ) : (
          <Alert severity="info">주문 정보를 찾을 수 없습니다.</Alert>
        )}
      </Paper>

      <Dialog
        open={paymentDialogOpen}
        onClose={handleClosePaymentDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>결제하기</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper
              variant="outlined"
              sx={{ p: 2, borderRadius: 2, backgroundColor: "rgba(15, 23, 42, 0.02)" }}
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
                  {orderDisplay?.payLimitDate
                    ? new Date(orderDisplay.payLimitDate).toLocaleString()
                    : "-"}
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
                    onChange={(event) => {
                      const next = event.target.checked;
                      setUseDepositEnabled(next);
                      if (!next) {
                        setUseDepositAll(false);
                        setUseDepositAmount("");
                      }
                    }}
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
                          onChange={(event) => {
                            setUseDepositAll(event.target.checked);
                            if (event.target.checked) {
                              setUseDepositAmount("");
                            }
                          }}
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
                          const next = event.target.value.replace(/[^\d]/g, "");
                          setUseDepositAmount(next);
                        }}
                        helperText={`최대 ${formatWon(
                          Math.min(depositBalance, payableAmount)
                        )}`}
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
                    결제 모듈 결제금액
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
          <Button onClick={handleClosePaymentDialog}>닫기</Button>
          <Button
            variant="contained"
            onClick={handleConfirmPayment}
            disabled={actionLoading}
          >
            결제 진행
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OrderDetail;
