import {
  Alert,
  Chip,
  Skeleton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import React, { useMemo } from "react";
import {
  getOrderStatusLabel,
  OrderStatus,
  type OrderResponse,
} from "@moreauction/types";
import { Link as RouterLink } from "react-router-dom";
import { formatWon } from "@moreauction/utils";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "@/apis/orderApi";
import { useAuth } from "@moreauction/auth";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

interface OrdersTabProps {
  title: string;
  status: "bought" | "sold";
  emptyText: string;
  showAdditionalPayment?: boolean;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  title,
  status,
  emptyText,
  showAdditionalPayment = false,
}) => {
  const { user } = useAuth();
  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.history(status, user?.userId),
    queryFn: async () => {
      if (!user?.userId) return [];
      const response = await orderApi.getOrderByStatus(status, undefined, {
        page: 0,
        size: 50,
        sort: "updatedAt,desc",
      });
      const payload: any = response.data;
      if (payload?.content && Array.isArray(payload.content)) {
        return payload.content as OrderResponse[];
      }
      if (payload?.data?.content && Array.isArray(payload.data.content)) {
        return payload.data.content as OrderResponse[];
      }
      return [];
    },
    staleTime: 30_000,
  });

  const orders = ordersQuery.data ?? [];
  const errorMessage = useMemo(() => {
    if (!ordersQuery.isError) return null;
    return getErrorMessage(
      ordersQuery.error,
      "주문 내역을 불러오지 못했습니다."
    );
  }, [ordersQuery.error, ordersQuery.isError]);
  const showSkeleton =
    ordersQuery.isLoading && !errorMessage && orders.length === 0;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>

      {errorMessage ? (
        <Alert severity="error">{errorMessage}</Alert>
      ) : showSkeleton ? (
        <List sx={{ maxHeight: "60vh", overflowY: "auto" }}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <React.Fragment key={idx}>
              <ListItem>
                <ListItemText
                  primary={<Skeleton width="60%" />}
                  secondary={<Skeleton width="80%" />}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      ) : orders.length === 0 ? (
        <Alert severity="info">{emptyText}</Alert>
      ) : (
        <List sx={{ maxHeight: "60vh", overflowY: "auto" }}>
          {orders.map((order) => {
            const depositAmount =
              typeof order.depositAmount === "number" ? order.depositAmount : 0;
            const additionalPaymentAmount =
              typeof order.depositAmount === "number"
                ? Math.max(order.winningAmount - order.depositAmount, 0)
                : null;
            const confirmDateLabel = order.confirmDate
              ? new Date(order.confirmDate).toLocaleString()
              : null;
            const payCompleteDateLabel = order.payCompleteDate
              ? new Date(order.payCompleteDate).toLocaleString()
              : null;
            const needsConfirm =
              status === "bought" &&
              order.status === OrderStatus.SHIP_COMPLETED;

            return (
              <React.Fragment key={order.id}>
                <ListItem
                  component={RouterLink}
                  to={`/orders/${order.id}`}
                  sx={{ cursor: "pointer" }}
                >
                  <ListItemText
                    primary={order.productName ?? "주문"}
                    secondary={
                      <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          총 낙찰가: {formatWon(order.winningAmount)}
                          {typeof order.depositAmount === "number"
                            ? ` · 보증금(기납부): ${formatWon(depositAmount)}`
                            : ""}
                          {showAdditionalPayment &&
                          additionalPaymentAmount != null
                            ? ` · 추가 결제금액: ${formatWon(
                                additionalPaymentAmount
                              )}`
                            : ""}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          주문 ID: {order.id}
                        </Typography>

                        {confirmDateLabel && (
                          <Typography variant="caption" color="text.secondary">
                            주문일(낙찰확정): {confirmDateLabel}
                          </Typography>
                        )}
                        {payCompleteDateLabel && (
                          <Typography variant="caption" color="text.secondary">
                            구매완료일: {payCompleteDateLabel}
                          </Typography>
                        )}
                      </Stack>
                    }
                    secondaryTypographyProps={{ component: "div" }}
                  />
                  <Stack direction="row" spacing={1} alignItems="center">
                    {needsConfirm && (
                      <Chip
                        label="구매확정 필요"
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    )}
                    <Chip
                      label={getOrderStatusLabel(order.status)}
                      size="small"
                      color="default"
                    />
                  </Stack>
                </ListItem>
                <Divider />
              </React.Fragment>
            );
          })}
        </List>
      )}
    </Paper>
  );
};
