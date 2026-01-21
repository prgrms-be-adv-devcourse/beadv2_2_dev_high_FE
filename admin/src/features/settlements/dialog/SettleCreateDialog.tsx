import { adminOrderApi } from "@/apis/adminOrderApi";
import { adminSettlementApi } from "@/apis/adminSettlementApi";
import { OrderStatus } from "@moreauction/types";
import { formatDate, formatWon } from "@moreauction/utils";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  Alert,
  TextField,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Button,
  CircularProgress,
  Box,
  Pagination,
  DialogActions,
} from "@mui/material";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import React, { useState } from "react";
const ORDER_PAGE_SIZE = 8;

const SettleCreateDialog = ({ isCreateOpen, setIsCreateOpen }: any) => {
  const queryClient = useQueryClient();

  const [createError, setCreateError] = useState<string | null>(null);
  const [orderPage, setOrderPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState("");

  const createMutation = useMutation({
    mutationFn: (orderId: string) =>
      adminSettlementApi.createSettlement(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settlements"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      setCreateError(null);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ??
        error?.data?.message ??
        "정산 등록에 실패했습니다.";
      setCreateError(message);
    },
  });
  const ordersQuery = useQuery({
    queryKey: ["admin", "orders", "confirm-buy", orderPage, orderSearch],
    queryFn: () =>
      adminOrderApi.getOrders({
        page: orderPage - 1,
        size: ORDER_PAGE_SIZE,
        sort: "createdAt,desc",
        filter: {
          status: OrderStatus.CONFIRM_BUY,
          deletedYn: "N",
          orderId: orderSearch.trim() || undefined,
        },
      }),
    enabled: isCreateOpen,
    placeholderData: keepPreviousData,
  });

  const ordersTotalPages = ordersQuery.data?.totalPages ?? 1;
  const orders = ordersQuery.data?.content ?? [];
  const handleCreateSettlement = (orderId: string) => {
    createMutation.mutate(orderId, {
      onSuccess: () => {
        handleCloseCreate();
      },
    });
  };
  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    setCreateError(null);
  };

  return (
    <Dialog
      open={isCreateOpen}
      onClose={handleCloseCreate}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>정산 등록</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {createError && <Alert severity="error">{createError}</Alert>}
          <TextField
            label="주문 ID 검색"
            size="small"
            value={orderSearch}
            onChange={(event) => {
              setOrderSearch(event.target.value);
              setOrderPage(1);
            }}
            fullWidth
          />
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center">주문 ID</TableCell>
                  <TableCell align="center">판매자 ID</TableCell>
                  <TableCell align="center">구매자 ID</TableCell>
                  <TableCell align="center">낙찰 금액</TableCell>
                  <TableCell align="center">구매확정일</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover sx={{ height: 56 }}>
                    <TableCell align="center">{order.id}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 120,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {order.sellerId}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{order.buyerId}</TableCell>
                    <TableCell align="center">
                      {formatWon(order.winningAmount)}
                    </TableCell>
                    <TableCell align="center">
                      {formatDate(order.confirmDate)}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleCreateSettlement(order.id)}
                        disabled={createMutation.isPending}
                      >
                        정산 등록
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!ordersQuery.isLoading && orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary">
                        구매확정 주문이 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {ordersQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={20} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Pagination
              count={ordersTotalPages}
              page={orderPage}
              onChange={(_, value) => setOrderPage(value)}
              color="primary"
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseCreate}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettleCreateDialog;
