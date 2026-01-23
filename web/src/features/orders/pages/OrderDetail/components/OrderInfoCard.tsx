import { Box, Divider, Paper, Stack, Typography } from "@mui/material";
import type { OrderResponse } from "@moreauction/types";
import { formatWon } from "@moreauction/utils";

interface OrderInfoCardProps {
  order: OrderResponse;
  showBuyerId?: boolean;
}

const OrderInfoCard: React.FC<OrderInfoCardProps> = ({
  order,
  showBuyerId = false,
}) => {
  const renderRow = (
    label: string,
    value?: React.ReactNode,
    emphasis?: boolean
  ) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        py: 0.75,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant={emphasis ? "subtitle1" : "body1"}
        fontWeight={emphasis ? 700 : 600}
      >
        {value ?? "-"}
      </Typography>
    </Box>
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 2,
        backgroundColor: "background.paper",
      }}
    >
      <Typography variant="subtitle1" fontWeight={700}>
        주문 정보
      </Typography>
      <Divider sx={{ my: 1.5 }} />
      <Stack>
        {renderRow("주문 번호", order.id)}
        {showBuyerId && renderRow("구매자 ID", order.buyerId)}
        {renderRow("상품명", order.productName ?? "주문")}
        {renderRow("총 낙찰가", formatWon(order.winningAmount))}
        {renderRow(
          "보증금(기납부)",
          typeof order.depositAmount === "number"
            ? formatWon(order.depositAmount)
            : "-"
        )}
        {renderRow(
          "주문일(낙찰확정)",
          order.confirmDate
            ? new Date(order.confirmDate).toLocaleString()
            : "미확인"
        )}
        {renderRow(
          "주문 생성일",
          new Date(order.createdAt).toLocaleString()
        )}
        {renderRow("최근 업데이트", new Date(order.updatedAt).toLocaleString())}
      </Stack>
    </Paper>
  );
};

export default OrderInfoCard;
