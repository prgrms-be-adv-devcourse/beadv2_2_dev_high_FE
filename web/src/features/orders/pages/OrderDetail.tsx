import {
  Alert,
  Box,
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
} from "@mui/material";
import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "@/apis/orderApi";
import { depositApi } from "@/apis/depositApi";
import { DepositChargeDialog } from "@/features/mypage/components/DepositChargeDialog";
import { requestTossPayment } from "@/shared/utils/requestTossPayment";
import { useAuth } from "@moreauction/auth";
import {
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = React.useState(false);
  const [paidOverrideUntil, setPaidOverrideUntil] = React.useState<
    number | null
  >(null);
  const [insufficientOpen, setInsufficientOpen] = React.useState(false);
  const [insufficientInfo, setInsufficientInfo] = React.useState<{
    balance: number;
    needed: number;
    shortage: number;
    recommendedCharge: number;
  } | null>(null);
  const [chargeOpen, setChargeOpen] = React.useState(false);
  const [chargeLoading, setChargeLoading] = React.useState(false);
  const [chargeAmount, setChargeAmount] = React.useState("");
  const [chargeError, setChargeError] = React.useState<string | null>(null);
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
  const payableAmount =
    orderDisplay && typeof orderDisplay.depositAmount === "number"
      ? Math.max(orderDisplay.winningAmount - orderDisplay.depositAmount, 0)
      : orderDisplay?.winningAmount ?? 0;

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
    if (!window.confirm("예치금으로 결제하시겠습니까?")) return;
    try {
      setActionLoading(true);
      const info = await depositApi.createDeposit({
        depositOrderId: order.id,
        amount: payableAmount,
        type: "USAGE",
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.pendings() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.histories() }),
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
      if (err?.status === 400) {
        try {
          const account = await depositApi.getAccount();
          const balance = account?.data?.balance ?? 0;
          const shortage = Math.max(0, payableAmount - balance);
          const recommendedCharge = Math.ceil(shortage / 1000) * 1000;
          setInsufficientInfo({
            balance,
            needed: payableAmount,
            shortage,
            recommendedCharge,
          });
          setInsufficientOpen(true);
        } catch (accountErr) {
          console.error("예치금 잔액 조회 실패:", accountErr);
          alert(
            "예치금 잔액이 부족합니다. 예치금을 충전한 뒤 다시 결제해 주세요."
          );
        }
      } else {
        alert(err?.data?.message ?? "결제 처리 중 오류가 발생했습니다.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!order || !order.id || actionLoading) return;
    if (!window.confirm("즉시 결제를 진행하시겠습니까?")) return;
    setActionLoading(true);
    setChargeError(null);
    try {
      sessionStorage.setItem(
        "autoPurchaseAfterCharge",
        JSON.stringify({
          orderId: order.id,
          amount: payableAmount,
          createdAt: Date.now(),
        })
      );
      const depositOrder = await depositApi.createDepositOrder(payableAmount);
      if (depositOrder?.data?.id) {
        requestTossPayment(depositOrder.data.id, depositOrder.data.amount);
      } else {
        throw new Error("주문 생성에 실패했습니다.");
      }
    } catch (chargeErr) {
      console.error("즉시 결제 요청 실패:", chargeErr);
      setChargeError("즉시 결제 요청 중 오류가 발생했습니다.");
      alert("즉시 결제 요청 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const renderInfo = (label: string, value?: React.ReactNode) => (
    <Box sx={{ py: 1 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value ?? "-"}</Typography>
    </Box>
  );

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h4">주문 상세</Typography>
        <Button onClick={() => navigate(-1)}>목록으로</Button>
      </Stack>
      <Paper sx={{ mt: 3, p: { xs: 2, md: 3 } }}>
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
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  {orderDisplay.productName ?? "주문"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  주문 ID · {orderDisplay.id}
                </Typography>
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  borderColor: "rgba(148, 163, 184, 0.35)",
                  backgroundColor: "rgba(59, 130, 246, 0.06)",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  spacing={1.5}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      추가 결제금액
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>
                      {formatWon(payableAmount)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      결제 기한
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {orderDisplay.payLimitDate
                        ? new Date(orderDisplay.payLimitDate).toLocaleString()
                        : "-"}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {isUnpaid && (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="flex-end"
                >
                  <Button
                    variant="outlined"
                    onClick={handlePayWithDeposit}
                    disabled={actionLoading}
                  >
                    예치금으로 결제
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handlePayNow}
                    disabled={actionLoading}
                  >
                    즉시 결제
                  </Button>
                </Stack>
              )}

              <Divider />
              {renderInfo("총 낙찰가", formatWon(orderDisplay.winningAmount))}
              <Divider />
              {renderInfo(
                "보증금(기납부)",
                typeof orderDisplay.depositAmount === "number"
                  ? formatWon(orderDisplay.depositAmount)
                  : "-"
              )}
              <Divider />
              {renderInfo(
                "주문 상태",
                getOrderStatusLabel(orderDisplay.status)
              )}
              <Divider />
              {renderInfo(
                "주문일(낙찰확정)",
                orderDisplay.confirmDate
                  ? new Date(orderDisplay.confirmDate).toLocaleString()
                  : "미확인"
              )}
              <Divider />
              {renderInfo(
                "구매 완료일",
                orderDisplay.payCompleteDate
                  ? new Date(orderDisplay.payCompleteDate).toLocaleString()
                  : "구매 대기"
              )}
              <Divider />
              {renderInfo(
                "주문 생성일",
                new Date(orderDisplay.createdAt).toLocaleString()
              )}
              <Divider />
              {renderInfo(
                "최근 업데이트",
                new Date(orderDisplay.updatedAt).toLocaleString()
              )}
            </Stack>
          </>
        ) : (
          <Alert severity="info">주문 정보를 찾을 수 없습니다.</Alert>
        )}
      </Paper>

      <Dialog
        open={insufficientOpen}
        onClose={() => setInsufficientOpen(false)}
      >
        <DialogTitle>예치금 잔액이 부족합니다</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            현재 잔액: {formatWon(insufficientInfo?.balance ?? 0)}
          </Typography>
          <Typography variant="body2">
            필요 금액: {formatWon(insufficientInfo?.needed ?? 0)}
          </Typography>
          <Typography variant="body2">
            부족 금액: {formatWon(insufficientInfo?.shortage ?? 0)}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            예치금을 충전한 뒤 결제를 완료할 수 있어요.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInsufficientOpen(false)}>닫기</Button>
          <Button
            variant="contained"
            onClick={() => {
              const amount = insufficientInfo?.recommendedCharge ?? 0;
              setChargeAmount(amount > 0 ? String(amount) : "");
              setChargeError(null);
              setInsufficientOpen(false);
              setChargeOpen(true);
            }}
          >
            충전하기
          </Button>
        </DialogActions>
      </Dialog>

      <DepositChargeDialog
        open={chargeOpen}
        loading={chargeLoading}
        amount={chargeAmount}
        errorText={chargeError}
        onChangeAmount={setChargeAmount}
        onClose={() => {
          if (chargeLoading) return;
          setChargeOpen(false);
          setChargeAmount("");
          setChargeError(null);
        }}
        onSubmit={async () => {
          if (chargeLoading) return;
          const amount = parseInt(chargeAmount, 10);
          if (isNaN(amount) || amount < 1000 || amount % 100 !== 0) {
            setChargeError("충전은 100원 단위로 최소 1,000원부터 가능합니다.");
            return;
          }

          setChargeLoading(true);
          setChargeError(null);
          try {
            if (!order?.id) {
              setChargeError("주문 정보를 확인할 수 없습니다.");
              return;
            }
            sessionStorage.setItem(
              "autoPurchaseAfterCharge",
              JSON.stringify({
                orderId: order.id,
                amount: payableAmount,
                createdAt: Date.now(),
              })
            );
            const depositOrder = await depositApi.createDepositOrder(amount);
            if (depositOrder?.data?.id) {
              requestTossPayment(
                depositOrder.data.id,
                depositOrder.data.amount
              );
              setChargeOpen(false);
            } else {
              setChargeError("주문 생성에 실패했습니다.");
            }
          } catch (chargeErr) {
            console.error("예치금 충전 주문 생성 실패:", chargeErr);
            setChargeError("예치금 충전 주문 생성 중 오류가 발생했습니다.");
          } finally {
            setChargeLoading(false);
          }
        }}
      />
    </Container>
  );
};

export default OrderDetail;
