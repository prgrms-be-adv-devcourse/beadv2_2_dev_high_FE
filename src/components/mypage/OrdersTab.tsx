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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import { getOrderStatusLabel, type OrderResponse } from "../../types/order";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { formatWon } from "../../utils/money";

export type OrderFilter = "BOUGHT" | "SOLD";

interface OrdersTabProps {
  loading: boolean;
  error: string | null;
  sold: OrderResponse[];
  bought: OrderResponse[];
  initialFilter?: OrderFilter;
  onFilterChange?: (filter: OrderFilter) => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  loading,
  error,
  sold,
  bought,
  initialFilter,
  onFilterChange,
}) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<OrderFilter>(initialFilter ?? "BOUGHT");

  const { label, list } = useMemo(() => {
    if (filter === "SOLD") {
      return { label: "판매 내역", list: sold };
    }
    return { label: "구매 내역", list: bought };
  }, [filter, bought, sold]);

  const showSkeleton = loading && !error && list.length === 0;

  // 에러가 있는 경우에는 목록 대신 에러만 표시
  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          주문 내역
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        주문 내역
      </Typography>

      <ToggleButtonGroup
        size="small"
        color="primary"
        value={filter}
        exclusive
        onChange={(_, v: OrderFilter | null) => {
          if (!v) return;
          setFilter(v);
          onFilterChange?.(v);
        }}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="BOUGHT">구매 내역</ToggleButton>
        {user?.role !== "USER" && (
          <ToggleButton value="SOLD">판매 내역</ToggleButton>
        )}
      </ToggleButtonGroup>

      {showSkeleton ? (
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
      ) : list.length === 0 ? (
        <Alert severity="info">
          {filter === "BOUGHT"
            ? "구매한 주문이 없습니다."
            : "판매한 주문이 없습니다."}
        </Alert>
      ) : (
        <List sx={{ maxHeight: "60vh", overflowY: "auto" }}>
          {list.map((order) => {
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
                          {filter === "BOUGHT" && additionalPaymentAmount != null
                            ? ` · 추가 결제금액: ${formatWon(additionalPaymentAmount)}`
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
