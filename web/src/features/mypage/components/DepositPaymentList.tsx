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
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type {
  DepositPaymentDetail,
  DepositPaymentFailureHistoryDetail,
  PagedDepositPaymentResponse,
} from "@moreauction/types";
import { formatNumber } from "@moreauction/utils";
import { depositApi } from "@/apis/depositApi";
import { useAuth } from "@moreauction/auth";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const statusMap: Record<string, string> = {
  READY: "준비",
  IN_PROGRESS: "진행",
  CONFIRMED: "승인",
  CANCELED: "취소",
  FAILED: "실패",
};

const statusColorMap: Record<
  string,
  "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
> = {
  READY: "default",
  IN_PROGRESS: "info",
  CONFIRMED: "success",
  CANCELED: "warning",
  FAILED: "error",
};

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
  const [failureOrderId, setFailureOrderId] = useState<string | null>(null);
  const paymentQuery = useInfiniteQuery<PagedDepositPaymentResponse, Error>({
    queryKey: queryKeys.deposit.payments(),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await depositApi.getDepositPayments({
        page: pageParam as number,
        size: 20,
        sort: "updatedAt,DESC",
      });
      return response.data;
    },
    initialPageParam: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : (lastPage.number ?? 0) + 1,
  });

  const payments: DepositPaymentDetail[] =
    paymentQuery.data?.pages.flatMap((page) => page.content ?? []) ?? [];
  const errorMessage = useMemo(() => {
    if (!paymentQuery.isError) return null;
    return getErrorMessage(
      paymentQuery.error,
      "결제 내역을 불러오지 못했습니다."
    );
  }, [paymentQuery.error, paymentQuery.isError]);

  const failureQuery = useQuery({
    queryKey: queryKeys.deposit.paymentFailuresByOrder(failureOrderId),
    queryFn: async () => {
      const response = await depositApi.getDepositPaymentFailuresByOrderId(
        { orderId: failureOrderId ?? undefined, userId: user?.userId },
        { page: 0, size: 20, sort: "updatedAt,DESC" }
      );
      return response.data;
    },
    enabled: !!failureOrderId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const failureItems: DepositPaymentFailureHistoryDetail[] =
    failureQuery.data?.content ?? [];
  const failureErrorMessage = useMemo(() => {
    if (!failureQuery.isError) return null;
    return getErrorMessage(
      failureQuery.error,
      "결제 실패 내역을 불러오지 못했습니다."
    );
  }, [failureQuery.error, failureQuery.isError]);

  const handleOpenFailureDetail = (orderId: string) => {
    setFailureOrderId(orderId);
  };

  const handleCloseFailureDetail = () => {
    setFailureOrderId(null);
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
          <React.Fragment key={`${item.orderId}-${item.createdAt ?? ""}`}>
            <ListItem alignItems="flex-start">
              <ListItemText
                primary={`${formatNumber(item.amount)}원`}
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
                      label={statusMap[item.status] ?? item.status}
                      size="small"
                      color={statusColorMap[item.status] ?? "default"}
                      variant="outlined"
                      onClick={
                        item.status === "FAILED"
                          ? () => handleOpenFailureDetail(item.orderId)
                          : undefined
                      }
                      clickable={item.status === "FAILED"}
                    />
                    <Typography variant="caption" color="text.secondary">
                      주문번호: {item.orderId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      요청: {formatDateTime(item.requestedAt)} · 승인:{" "}
                      {formatDateTime(item.approvedAt)}
                    </Typography>
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
    </>
  );
};
