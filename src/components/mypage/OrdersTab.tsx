import {
  Alert,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import type { OrderResponse } from "../../types/order";

type OrderFilter = "BOUGHT" | "SOLD";

interface OrdersTabProps {
  loading: boolean;
  error: string | null;
  sold: OrderResponse[];
  bought: OrderResponse[];
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  loading,
  error,
  sold,
  bought,
}) => {
  const [filter, setFilter] = useState<OrderFilter>("BOUGHT");

  const { label, list } = useMemo(() => {
    if (filter === "SOLD") {
      return { label: "판매 내역", list: sold };
    }
    return { label: "구매 내역", list: bought };
  }, [filter, bought, sold]);

  return (
    <Paper sx={{ p: 2 }}>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
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
            }}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="BOUGHT">구매 내역</ToggleButton>
            <ToggleButton value="SOLD">판매 내역</ToggleButton>
          </ToggleButtonGroup>

          {list.length === 0 ? (
            <Typography>
              {filter === "BOUGHT"
                ? "구매한 주문이 없습니다."
                : "판매한 주문이 없습니다."}
            </Typography>
          ) : (
            <List>
              {list.map((order) => {
                const confirmDateLabel = order.confirmDate
                  ? new Date(order.confirmDate).toLocaleString()
                  : null;
                const payCompleteDateLabel = order.payCompleteDate
                  ? new Date(order.payCompleteDate).toLocaleString()
                  : null;

                return (
                  <React.Fragment key={order.id}>
                    <ListItem>
                      <ListItemText
                        primary={`낙찰가: ${order.winningAmount.toLocaleString()}원`}
                        secondary={[
                          `주문 ID: ${order.id} · 경매 ID: ${order.auctionId}`,
                          confirmDateLabel
                            ? `낙찰일: ${confirmDateLabel}`
                            : undefined,
                          payCompleteDateLabel
                            ? `결제완료일: ${payCompleteDateLabel}`
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      />
                      <Chip
                        label={order.status}
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
        </>
      )}
    </Paper>
  );
};
