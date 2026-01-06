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
import React from "react";
import { getOrderStatusLabel, type OrderResponse } from "@moreauction/types";
import { Link as RouterLink } from "react-router-dom";
import { formatWon } from "@moreauction/utils";

interface OrdersTabProps {
  title: string;
  loading: boolean;
  error: string | null;
  orders: OrderResponse[];
  emptyText: string;
  showAdditionalPayment?: boolean;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  title,
  loading,
  error,
  orders,
  emptyText,
  showAdditionalPayment = false,
}) => {
  const showSkeleton = loading && !error && orders.length === 0;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>

      {error ? (
        <Alert severity="error">{error}</Alert>
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
                  <Chip
                    label={getOrderStatusLabel(order.status)}
                    size="small"
                    color="default"
                    sx={{ ml: 2 }}
                  />
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
