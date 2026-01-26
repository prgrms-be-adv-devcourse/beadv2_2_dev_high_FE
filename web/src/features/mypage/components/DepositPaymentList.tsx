import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  DepositOrderInfo,
  DepositOrderStatus,
  DepositPaymentFailureHistoryDetail,
  PagedApiResponse,
} from "@moreauction/types";
import { formatNumber } from "@moreauction/utils";
import { depositApi } from "@/apis/depositApi";
import { useAuth } from "@moreauction/auth";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const statusMap: Record<string, string> = {
  PENDING: "결제 대기",
  COMPLETED: "결제 완료",
  FAILED: "결제 실패",
  CANCEL_PENDING: "환불 대기중",
  CANCELLED: "취소",
};

const statusColorMap: Record<
  string,
  "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
> = {
  PENDING: "default",
  COMPLETED: "success",
  FAILED: "error",
  CANCEL_PENDING: "warning",
  CANCELLED: "warning",
};

const normalizeStatus = (status?: DepositOrderStatus | null) =>
  status ? String(status).trim().toUpperCase() : "";

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const renderSkeletonList = () => (
  <List>
    {Array.from({ length: 3 }).map((_, idx) => (
      <React.Fragment key={idx}>
        <ListItem>
          <ListItemText
            primary={<Skeleton width="60%" />}
            secondary={<Skeleton width="40%" />}
          />
        </ListItem>
        <Divider />
      </React.Fragment>
    ))}
  </List>
);

export const DepositPaymentList: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [failureOrderId, setFailureOrderId] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundTargetId, setRefundTargetId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);
  const paymentQuery = useInfiniteQuery<PagedApiResponse<DepositOrderInfo>, Error>(
    {
      queryKey: queryKeys.deposit.payments(),
      queryFn: async ({ pageParam = 0 }) => {
        const response = await depositApi.getDepositPayments({
          page: pageParam as number,
          size: 20,
          sort: "createdAt,DESC",
        });
        return response.data;
      },
      initialPageParam: 0,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      getNextPageParam: (lastPage) =>
        lastPage.last ? undefined : (lastPage.number ?? 0) + 1,
    }
  );

  const payments: DepositOrderInfo[] =
    paymentQuery.data?.pages.flatMap((page) => page.content ?? []) ?? [];
  const errorMessage = useMemo(() => {
    if (!paymentQuery.isError) return null;
    return getErrorMessage(
      paymentQuery.error,
      "결제 내역을 불러오지 못했습니다.",
    );
  }, [paymentQuery.error, paymentQuery.isError]);

  const failureQuery = useQuery({
    queryKey: queryKeys.deposit.paymentFailuresByOrder(failureOrderId),
    queryFn: async () => {
      const response = await depositApi.getDepositPaymentFailuresByOrderId(
        { orderId: failureOrderId ?? undefined, userId: user?.userId },
        { page: 0, size: 20, sort: "updatedAt,DESC" },
      );
      return response.data;
    },
    enabled: !!failureOrderId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const cancelPendingMutation = useMutation({
    mutationFn: (orderId: string) =>
      depositApi.cancelPendingOrder({ id: orderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deposit.payments() });
      setRefundDialogOpen(false);
      setRefundTargetId(null);
      setRefundReason("");
      setRefundError(null);
    },
  });
  const isCancelPending = cancelPendingMutation.isPending;

  const cancelPaymentMutation = useMutation({
    mutationFn: (payload: { orderId: string; reason: string }) =>
      depositApi.canclePaymentOrders({
        id: payload.orderId,
        cancelReason: payload.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deposit.payments() });
      setCancelDialogOpen(false);
      setCancelTargetId(null);
      setCancelReason("");
      setCancelError(null);
    },
    onError: (error: any) => {
      setCancelError(
        error?.response?.data?.message ??
          error?.data?.message ??
          "결제 취소에 실패했습니다."
      );
    },
  });
  const isCancelPayment = cancelPaymentMutation.isPending;

  const normalizeType = (type?: string | null) =>
    type ? String(type).trim().toUpperCase() : "";

  const getTypeLabel = (type?: string | null) => {
    const normalized = normalizeType(type);
    if (normalized === "DEPOSIT_CHARGE") return "예치금 충전";
    if (normalized === "ORDER_PAYMENT") return "상품 구매";
    return type ?? "-";
  };

  const canRequestRefund = (status?: DepositOrderStatus | null) =>
    normalizeStatus(status) === "COMPLETED";

  const isDepositCharge = (type?: string | null) =>
    normalizeType(type) === "DEPOSIT_CHARGE";

  const isWithinOneHour = (value?: string | null) => {
    if (!value) return false;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;
    return Date.now() - parsed.getTime() <= 60 * 60 * 1000;
  };

  const failureItems: DepositPaymentFailureHistoryDetail[] =
    failureQuery.data?.content ?? [];
  const failureErrorMessage = useMemo(() => {
    if (!failureQuery.isError) return null;
    return getErrorMessage(
      failureQuery.error,
      "결제 실패 내역을 불러오지 못했습니다.",
    );
  }, [failureQuery.error, failureQuery.isError]);

  const handleOpenFailureDetail = (orderId: string) => {
    setFailureOrderId(orderId);
  };

  const handleCloseFailureDetail = () => {
    setFailureOrderId(null);
  };

  const openCancelDialog = (orderId: string) => {
    setCancelTargetId(orderId);
    setCancelReason("");
    setCancelError(null);
    setCancelDialogOpen(true);
  };

  const closeCancelDialog = () => {
    if (isCancelPayment) return;
    setCancelDialogOpen(false);
    setCancelTargetId(null);
    setCancelReason("");
    setCancelError(null);
  };

  const handleConfirmCancel = () => {
    if (!cancelTargetId || isCancelPayment) return;
    const trimmed = cancelReason.trim();
    if (!trimmed) {
      setCancelError("취소 사유를 입력해주세요.");
      return;
    }
    cancelPaymentMutation.mutate({
      orderId: cancelTargetId,
      reason: trimmed,
    });
  };

  const openRefundDialog = (orderId: string) => {
    setRefundTargetId(orderId);
    setRefundReason("");
    setRefundError(null);
    setRefundDialogOpen(true);
  };

  const closeRefundDialog = () => {
    if (isCancelPending) return;
    setRefundDialogOpen(false);
    setRefundTargetId(null);
    setRefundReason("");
    setRefundError(null);
  };

  const handleConfirmRefund = () => {
    if (!refundTargetId || isCancelPending) return;
    const trimmed = refundReason.trim();
    if (!trimmed) {
      setRefundError("요청 사유를 입력해주세요.");
      return;
    }
    cancelPendingMutation.mutate(refundTargetId);
  };

  if (paymentQuery.isLoading && payments.length === 0) {
    return renderSkeletonList();
  }
  if (errorMessage) {
    return <Alert severity="error">{errorMessage}</Alert>;
  }
  if (payments.length === 0) {
    return <Alert severity="info">결제 내역이 없습니다.</Alert>;
  }

  return (
    <>
      <List>
        {payments.map((item) => (
          <React.Fragment key={`${item.id}-${item.createdAt ?? ""}`}>
            <ListItem alignItems="flex-start">
              <ListItemText
                primary={`총 ${formatNumber(item.amount)}원`}
                primaryTypographyProps={{ fontWeight: 600 }}
                secondaryTypographyProps={{
                  variant: "body2",
                  color: "text.secondary",
                  component: "div",
                }}
                secondary={
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      alignItems: "center",
                      mt: 0.5,
                    }}
                  >
                    <Chip
                      label={
                        statusMap[normalizeStatus(item.status)] ?? item.status
                      }
                      size="small"
                      color={
                        statusColorMap[normalizeStatus(item.status)] ??
                        "default"
                      }
                      variant="outlined"
                      onClick={
                        normalizeStatus(item.status) === "FAILED"
                          ? () => handleOpenFailureDetail(item.id)
                          : undefined
                      }
                      clickable={normalizeStatus(item.status) === "FAILED"}
                    />
                    <Typography variant="caption" color="text.secondary">
                      주문번호: {item.id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      유형: {getTypeLabel(item.type)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isDepositCharge(item.type)
                        ? `PG 결제 ${formatNumber(item.paidAmount ?? 0)}원`
                        : `PG 결제 ${formatNumber(
                            item.paidAmount ?? 0
                          )}원 · 예치금 사용 ${formatNumber(
                            item.deposit ?? 0
                          )}원`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      처리: {formatDateTime(item.updatedAt)}
                    </Typography>
                    {isDepositCharge(item.type) && (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={
                          !canRequestRefund(item.status) ||
                          isCancelPending ||
                          isCancelPayment
                        }
                      onClick={() => {
                        const orderId = String(item.id);
                        if (isWithinOneHour(item.updatedAt)) {
                          openCancelDialog(orderId);
                        } else {
                          openRefundDialog(orderId);
                        }
                      }}
                    >
                      {isWithinOneHour(item.updatedAt)
                        ? "결제 취소"
                        : "환불 요청"}
                      </Button>
                    )}
                  </Box>
                }
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
      {paymentQuery.hasNextPage && (
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Button
            onClick={() => paymentQuery.fetchNextPage()}
            disabled={paymentQuery.isFetchingNextPage}
          >
            {paymentQuery.isFetchingNextPage ? "불러오는 중..." : "더 보기"}
          </Button>
        </Box>
      )}

      <Dialog
        open={!!failureOrderId}
        onClose={handleCloseFailureDetail}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>결제 실패 상세</DialogTitle>
        <DialogContent dividers>
          {failureQuery.isLoading ? (
            <List>
              {Array.from({ length: 2 }).map((_, idx) => (
                <React.Fragment key={idx}>
                  <ListItem>
                    <ListItemText
                      primary={<Skeleton width="60%" />}
                      secondary={<Skeleton width="40%" />}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          ) : failureErrorMessage ? (
            <Alert severity="error">{failureErrorMessage}</Alert>
          ) : failureItems.length === 0 ? (
            <Alert severity="info">실패 내역이 없습니다.</Alert>
          ) : (
            <List>
              {failureItems.map((item) => (
                <React.Fragment key={item.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={item.message || "결제 실패"}
                      secondary={`코드: ${item.code ?? "-"} · 주문번호: ${
                        item.orderId
                      }`}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFailureDetail}>닫기</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={cancelDialogOpen}
        onClose={closeCancelDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>결제 취소</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              결제 취소 사유를 입력해주세요.
            </Typography>
            <TextField
              label="취소 사유"
              value={cancelReason}
              onChange={(event) => {
                setCancelReason(event.target.value);
                setCancelError(null);
              }}
              fullWidth
              multiline
              minRows={3}
              error={!!cancelError}
              helperText={cancelError ?? " "}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelDialog}>닫기</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmCancel}
            disabled={isCancelPayment}
          >
            결제 취소
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={refundDialogOpen}
        onClose={closeRefundDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>환불 요청</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              환불 요청 사유를 입력해주세요.
            </Typography>
            <TextField
              label="요청 사유"
              value={refundReason}
              onChange={(event) => {
                setRefundReason(event.target.value);
                setRefundError(null);
              }}
              fullWidth
              multiline
              minRows={3}
              error={!!refundError}
              helperText={refundError ?? " "}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRefundDialog}>닫기</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmRefund}
            disabled={isCancelPending}
          >
            환불 요청
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
