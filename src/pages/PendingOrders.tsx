import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { format } from "date-fns";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { depositApi } from "../apis/depositApi";
import { orderApi } from "../apis/orderApi";
import { DepositChargeDialog } from "../components/mypage/DepositChargeDialog";
import { OrdersTab, type OrderFilter } from "../components/mypage/OrdersTab";
import { requestTossPayment } from "../components/tossPay/requestTossPayment";
import { useAuth } from "../contexts/AuthContext";
import { OrderStatus, type OrderResponse } from "../types/order";
import { formatWon } from "../utils/money";

type OrdersViewMode = "PENDING" | "HISTORY";

const PendingOrders: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialViewMode = useMemo<OrdersViewMode>(() => {
    const params = new URLSearchParams(location.search);
    return params.get("view") === "HISTORY" ? "HISTORY" : "PENDING";
  }, [location.search]);

  const initialHistoryFilter = useMemo<OrderFilter>(() => {
    const params = new URLSearchParams(location.search);
    return params.get("filter") === "SOLD" ? "SOLD" : "BOUGHT";
  }, [location.search]);

  const [viewMode, setViewMode] = useState<OrdersViewMode>(initialViewMode);
  const [historyFilter, setHistoryFilter] =
    useState<OrderFilter>(initialHistoryFilter);

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [soldOrders, setSoldOrders] = useState<OrderResponse[]>([]);
  const [boughtOrders, setBoughtOrders] = useState<OrderResponse[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

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

  const updateUrlState = useCallback(
    (next: Partial<{ view: OrdersViewMode; filter: OrderFilter }>) => {
      const params = new URLSearchParams(location.search);
      if (next.view) params.set("view", next.view);
      if (next.filter) params.set("filter", next.filter);
      navigate(`/orders?${params.toString()}`, { replace: true });
    },
    [location.search, navigate]
  );

  const loadPendingOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderApi.getOrderByStatus("bought", OrderStatus.UNPAID);
      const list = Array.isArray(res.data) ? res.data : [];
      // 구매 내역 중 상태가 UNPAID인 주문만 필터링
      setOrders(list);
    } catch (err) {
      console.error("구매 대기 주문 조회 실패:", err);
      setError("구매 대기 주문을 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrderHistory = useCallback(async () => {
    if (historyLoading) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const boughtRes = await orderApi.getOrderByStatus("bought");
      const bought = Array.isArray(boughtRes.data) ? boughtRes.data : [];
      setBoughtOrders(bought);

      if (user?.role !== "USER") {
        const soldRes = await orderApi.getOrderByStatus("sold");
        const sold = Array.isArray(soldRes.data) ? soldRes.data : [];
        setSoldOrders(sold);
      } else {
        setSoldOrders([]);
      }

      setHistoryLoaded(true);
    } catch (err) {
      console.error("주문 내역 조회 실패:", err);
      setHistoryError("주문 내역을 불러오는 데 실패했습니다.");
    } finally {
      setHistoryLoading(false);
    }
  }, [historyLoading, user?.role]);

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
        type: "USAGE",
        userId: user?.userId,
      });
      alert("구매가 완료되었습니다.");
      window.dispatchEvent(new CustomEvent("orders:pending-decrement", { detail: 1 }));
      if (typeof info?.balance === "number") {
        window.dispatchEvent(
          new CustomEvent("deposit:set", { detail: info.balance })
        );
      } else {
        window.dispatchEvent(
          new CustomEvent("deposit:decrement", { detail: payableAmount })
        );
      }
      window.dispatchEvent(new Event("orders:refresh"));
      loadPendingOrders();
      if (historyLoaded) {
        loadOrderHistory();
      }
    } catch (err: any) {
      console.error("구매 실패:", err);
      if (err.status === 400) {
        try {
          const account = await depositApi.getAccount();
          const balance = account?.balance ?? 0;
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

  useEffect(() => {
    loadPendingOrders();
  }, [loadPendingOrders]);

  useEffect(() => {
    if (viewMode === "HISTORY" && !historyLoaded) {
      loadOrderHistory();
    }
  }, [historyLoaded, loadOrderHistory, viewMode]);

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          주문서
        </Typography>

        <ToggleButtonGroup
          size="small"
          color="primary"
          value={viewMode}
          exclusive
          onChange={(_, v: OrdersViewMode | null) => {
            if (!v) return;
            setViewMode(v);
            updateUrlState({ view: v });
            if (v === "HISTORY" && !historyLoaded) {
              loadOrderHistory();
            }
          }}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="PENDING">구매 대기</ToggleButton>
          <ToggleButton value="HISTORY">주문 내역</ToggleButton>
        </ToggleButtonGroup>

        {viewMode === "HISTORY" ? (
          <OrdersTab
            loading={historyLoading}
            error={historyError}
            sold={soldOrders}
            bought={boughtOrders}
            initialFilter={historyFilter}
            onFilterChange={(next) => {
              setHistoryFilter(next);
              updateUrlState({ filter: next });
            }}
          />
        ) : (
        <Paper sx={{ p: 2 }}>
            {loading ? (
              <Typography>로딩 중...</Typography>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : orders.length === 0 ? (
              <Alert severity="info">구매 대기 중인 주문이 없습니다.</Alert>
            ) : (
              <List>
                {orders.map((order) => {
                  const payableAmount =
                    typeof order.depositAmount === "number"
                      ? order.winningAmount - order.depositAmount
                      : order.winningAmount;

                  return (
                    <ListItem
                      key={order.id}
                      secondaryAction={
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            component={RouterLink}
                            to={`/orders/${order.id}`}
                          >
                            상세보기
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            disabled={actionLoadingId === order.id}
                            onClick={() => handleCompleteByDeposit(order.id)}
                          >
                            {actionLoadingId === order.id
                              ? "처리 중..."
                              : "예치금으로 구매"}
                          </Button>
                        </Box>
                      }
                    >
                    <ListItemText
                      primary={`${
                        order.productName ?? "주문"
                      } · 추가 결제금액: ${formatWon(payableAmount)}`}
                      secondary={format(
                        new Date(order.createdAt),
                        "yyyy-MM-dd HH:mm"
                      )}
                    />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        )}
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
            if (depositOrder && depositOrder.orderId) {
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
              requestTossPayment(depositOrder.orderId, depositOrder.amount);
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
