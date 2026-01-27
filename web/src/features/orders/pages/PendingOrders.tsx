import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { format } from "date-fns";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { depositApi } from "@/apis/depositApi";
import { orderApi } from "@/apis/orderApi";
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
  const [now, setNow] = useState(0);

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
  useEffect(() => {
    setNow(Date.now());
  }, [pendingQuery.dataUpdatedAt]);

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
              <Box sx={{ maxHeight: "60vh", overflowY: "auto", pr: 1 }}>
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
                    const payLimitAt = order.payLimitDate
                      ? new Date(order.payLimitDate)
                      : null;
                    const isPayExpired =
                      payLimitAt != null && now > payLimitAt.getTime();

                    return (
                      <Paper
                        key={order.id}
                        variant="outlined"
                        role="button"
                        tabIndex={0}
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
                          "&:focus-visible": {
                            outline: "2px solid rgba(59, 130, 246, 0.5)",
                            outlineOffset: 2,
                          },
                        }}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigate(`/orders/${order.id}`);
                          }
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
                            <Button
                              variant="contained"
                              size="small"
                              disabled={isPayExpired}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                navigate(`/orders/${order.id}?pay=1`);
                              }}
                            >
                              결제하기
                            </Button>
                          </Box>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, 1fr)",
                                md: "repeat(4, 1fr)",
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
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                결제 기한
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color={isPayExpired ? "error" : "text.primary"}
                              >
                                {payLimitAt
                                  ? format(payLimitAt, "yyyy-MM-dd HH:mm")
                                  : "-"}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {isPayExpired
                              ? "결제 기한이 만료되었습니다."
                              : "결제 버튼을 눌러 바로 진행할 수 있습니다."}
                          </Typography>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
};

export default PendingOrders;
