import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { format } from "date-fns";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { depositApi } from "@/apis/depositApi";
import { orderApi } from "@/apis/orderApi";
import { DepositChargeDialog } from "@/features/mypage/components/DepositChargeDialog";
import { requestTossPayment } from "@/shared/utils/requestTossPayment";
import { useAuth } from "@moreauction/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DepositType,
  OrderStatus,
  type OrderResponse,
} from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const PendingOrders: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [insufficientInfo, setInsufficientInfo] = useState<{
    balance: number;
    needed: number;
    shortage: number;
    recommendedCharge: number;
  } | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeLoading, setChargeLoading] = useState(false);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [autoPurchaseTarget, setAutoPurchaseTarget] = useState<{
    orderId: string;
    amount: number;
  } | null>(null);

  const updateUrlState = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.delete("view");
    navigate(`/orders?${params.toString()}`, { replace: true });
  }, [location.search, navigate]);

  const pendingQuery = useQuery({
    queryKey: queryKeys.orders.pending(user?.userId),
    queryFn: async () => {
      const res = await orderApi.getOrderByStatus(
        "bought",
        OrderStatus.UNPAID,
        { page: 0, size: 50, sort: "updatedAt,desc" }
      );
      const payload: any = res.data;
      if (payload?.content && Array.isArray(payload.content)) {
        return payload.content as OrderResponse[];
      }
      if (payload?.data?.content && Array.isArray(payload.data.content)) {
        return payload.data.content as OrderResponse[];
      }
      return [];
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const pendingErrorMessage = useMemo(() => {
    if (!pendingQuery.isError) return null;
    return getErrorMessage(
      pendingQuery.error,
      "구매 대기 주문을 불러오는 데 실패했습니다."
    );
  }, [pendingQuery.error, pendingQuery.isError]);

  const orders = pendingQuery.data ?? [];
  useEffect(() => {
    updateUrlState();
  }, [updateUrlState]);

  const setDepositBalanceCache = useCallback(
    (next: number) => {
      queryClient.setQueryData(queryKeys.deposit.balance(), next);
      localStorage.setItem("depositBalance", String(next));
    },
    [queryClient]
  );

  const decrementDepositBalance = useCallback(
    (amount: number) => {
      queryClient.setQueryData(
        queryKeys.deposit.balance(),
        (prev: number | undefined) => {
          const base = typeof prev === "number" ? prev : 0;
          const next = Math.max(base - amount, 0);
          localStorage.setItem("depositBalance", String(next));
          return next;
        }
      );
    },
    [queryClient]
  );

  const handleCompleteByDeposit = async (orderId: string) => {
    if (actionLoadingId) return;
    if (!window.confirm("예치금으로 구매하시겠습니까?")) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return;
    }
    const payableAmount =
      Number(order.winningAmount) -
      (typeof order.depositAmount === "number" ? order.depositAmount : 0);
    try {
      setActionLoadingId(orderId);
      const info = await depositApi.createDeposit({
        depositOrderId: orderId,
        amount: payableAmount,
        type: DepositType.PAYMENT,
        userId: user?.userId,
      });
      alert("구매가 완료되었습니다.");
      if (typeof info?.data?.balance === "number") {
        setDepositBalanceCache(info.data.balance);
      } else {
        decrementDepositBalance(payableAmount);
      }
      queryClient.setQueryData(
        queryKeys.orders.pendingCount(),
        (prev: number | undefined) =>
          Math.max((typeof prev === "number" ? prev : 0) - 1, 0)
      );
      queryClient.setQueryData(
        queryKeys.orders.pending(user?.userId),
        (prev: OrderResponse[] | undefined) =>
          (prev ?? []).filter((item) => item.id !== orderId)
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.pendings(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.histories(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.pendingCount(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.account(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.historyAll(),
        }),
      ]);
    } catch (err: any) {
      console.error("구매 실패:", err);
      if (err.status === 400) {
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
          setAutoPurchaseTarget({ orderId, amount: payableAmount });
          setInsufficientOpen(true);
        } catch (accountErr) {
          console.error("예치금 잔액 조회 실패:", accountErr);
          alert(
            "예치금 잔액이 부족합니다. 예치금을 충전한 뒤 다시 구매해 주세요."
          );
        }
      } else {
        alert(err?.data?.message ?? "구매 처리 중 오류가 발생했습니다.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          주문서
        </Typography>

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                구매 대기 주문
              </Typography>
              <Typography variant="body2" color="text.secondary">
                기한 내 결제를 완료하고 상품을 안전하게 배송받으세요.
              </Typography>
            </Box>
            <Divider />
            {pendingQuery.isLoading ? (
              <Stack spacing={1.5}>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <Paper
                    key={`pending-skeleton-${idx}`}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2 }}
                  >
                    <Skeleton width="55%" />
                    <Skeleton width="35%" />
                    <Skeleton width="70%" />
                  </Paper>
                ))}
              </Stack>
            ) : pendingErrorMessage ? (
              <Alert severity="error">{pendingErrorMessage}</Alert>
            ) : orders.length === 0 ? (
              <Alert severity="info">구매 대기 중인 주문이 없습니다.</Alert>
            ) : (
              <Stack spacing={2}>
                {orders.map((order) => {
                  const payableAmount =
                    typeof order.depositAmount === "number"
                      ? order.winningAmount - order.depositAmount
                      : order.winningAmount;
                  const createdAt = format(
                    new Date(order.createdAt),
                    "yyyy-MM-dd HH:mm"
                  );

                  return (
                    <Paper
                      key={order.id}
                      variant="outlined"
                      component={RouterLink}
                      to={`/orders/${order.id}`}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderColor: "rgba(148, 163, 184, 0.4)",
                        backgroundColor: "rgba(148, 163, 184, 0.04)",
                        textDecoration: "none",
                        color: "inherit",
                        cursor: "pointer",
                        transition:
                          "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
                          borderColor: "rgba(59, 130, 246, 0.4)",
                        },
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 2,
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {order.productName ?? "주문"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              주문일시 · {createdAt}
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "1fr",
                              sm: "repeat(3, 1fr)",
                            },
                            gap: 1.5,
                          }}
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              낙찰가
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatWon(order.winningAmount)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              보증금 납부
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatWon(order.depositAmount ?? 0)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              추가 결제금액
                            </Typography>
                            <Typography variant="body2" fontWeight={700}>
                              {formatWon(payableAmount)}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          자세한 결제는 주문 상세에서 진행할 수 있습니다.
                        </Typography>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Box>

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
            예치금을 충전한 뒤 구매할 수 있어요.
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
            const depositOrder = await depositApi.createDepositOrder(amount);
            if (depositOrder?.data?.id) {
              if (autoPurchaseTarget) {
                sessionStorage.setItem(
                  "autoPurchaseAfterCharge",
                  JSON.stringify({
                    orderId: autoPurchaseTarget.orderId,
                    amount: autoPurchaseTarget.amount,
                    createdAt: Date.now(),
                  })
                );
              }
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

export default PendingOrders;
