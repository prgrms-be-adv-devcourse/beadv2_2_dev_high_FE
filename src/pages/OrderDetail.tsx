import {
  Alert,
  Box,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { orderApi } from "../apis/orderApi";
import { getOrderStatusLabel, type OrderResponse } from "../types/order";
import { formatWon } from "../utils/money";

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError("주문 ID가 올바르지 않습니다.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await orderApi.getOrderDetail(orderId);
        setOrder(res.data);
      } catch (err) {
        console.error("주문 상세 조회 실패:", err);
        setError("주문 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const renderInfo = (label: string, value?: React.ReactNode) => (
    <Box sx={{ py: 1 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value ?? "-"}</Typography>
    </Box>
  );

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h4">주문 상세</Typography>
        <Button onClick={() => navigate(-1)}>목록으로</Button>
      </Stack>
      <Paper sx={{ mt: 3, p: 3 }}>
        {loading ? (
          <Stack spacing={1}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rectangular" height={200} />
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : order ? (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {order.productName ?? "주문"}
            </Typography>
            {renderInfo("주문 ID", order.id)}
            <Divider />
            {renderInfo(
              "총 낙찰가",
              formatWon(order.winningAmount)
            )}
            <Divider />
            {renderInfo(
              "보증금(기납부)",
              typeof order.depositAmount === "number"
                ? formatWon(order.depositAmount)
                : "-"
            )}
            <Divider />
            {renderInfo(
              "추가 결제금액(예치금 차감)",
              typeof order.depositAmount === "number"
                ? formatWon(Math.max(order.winningAmount - order.depositAmount, 0))
                : "-"
            )}
            <Divider />
            {renderInfo("주문 상태", getOrderStatusLabel(order.status))}
            <Divider />
            {renderInfo(
              "주문일(낙찰확정)",
              order.confirmDate
                ? new Date(order.confirmDate).toLocaleString()
                : "미확인"
            )}
            <Divider />
            {renderInfo(
              "구매 완료일",
              order.payCompleteDate
                ? new Date(order.payCompleteDate).toLocaleString()
                : "구매 대기"
            )}
            <Divider />
            {renderInfo(
              "주문 생성일",
              new Date(order.createdAt).toLocaleString()
            )}
            <Divider />
            {renderInfo(
              "최근 업데이트",
              new Date(order.updatedAt).toLocaleString()
            )}
          </>
        ) : (
          <Alert severity="info">주문 정보를 찾을 수 없습니다.</Alert>
        )}
      </Paper>
    </Container>
  );
};

export default OrderDetail;
