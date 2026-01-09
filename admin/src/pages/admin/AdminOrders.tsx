import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Pagination,
  Stack,
  Alert,
} from "@mui/material";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  OrderStatus,
  getOrderStatusLabel,
  type OrderResponse,
} from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import {
  adminOrderApi,
  type OrderAdminSearchFilter,
} from "@/apis/adminOrderApi";

const PAGE_SIZE = 10;

const statusOptions = [
  { value: "all", label: "전체" },
  ...Object.values(OrderStatus).map((status) => ({
    value: status,
    label: getOrderStatusLabel(status),
  })),
];

const AdminOrders = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [filters, setFilters] = useState<OrderAdminSearchFilter>({});
  const [draftFilters, setDraftFilters] = useState<OrderAdminSearchFilter>({});

  const toOffsetDateTime = (value?: string) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const ordersQuery = useQuery({
    queryKey: ["admin", "orders", page, statusFilter, filters],
    queryFn: () =>
      adminOrderApi.getOrders({
        page: page - 1,
        size: PAGE_SIZE,
        sort: "updatedAt,desc",
        filter: {
          status:
            statusFilter === "all"
              ? undefined
              : (statusFilter as OrderStatus),
          ...filters,
        },
      }),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (params: { orderId: string; status: OrderStatus }) =>
      adminOrderApi.updateOrder(params.orderId, { status: params.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (orderId: string) => adminOrderApi.deleteOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
  });

  const totalPages = ordersQuery.data?.totalPages ?? 1;
  const orders = ordersQuery.data?.content ?? [];

  const showEmpty =
    !ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0;
  const errorMessage = useMemo(() => {
    if (!ordersQuery.isError) return null;
    return "주문 목록을 불러오지 못했습니다.";
  }, [ordersQuery.isError]);

  const handleStatusChange = (order: OrderResponse, next: OrderStatus) => {
    if (order.status === next) return;
    updateStatusMutation.mutate({ orderId: order.id, status: next });
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            주문 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            낙찰 주문 상태를 확인하고 업데이트합니다.
          </Typography>
        </Box>
      </Stack>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Select
              size="small"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              fullWidth
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <TextField
              label="주문 ID"
              size="small"
              value={draftFilters.orderId ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  orderId: event.target.value || undefined,
                }))
              }
              fullWidth
            />
            <TextField
              label="판매자 ID"
              size="small"
              value={draftFilters.sellerId ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  sellerId: event.target.value || undefined,
                }))
              }
              fullWidth
            />
            <TextField
              label="구매자 ID"
              size="small"
              value={draftFilters.buyerId ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  buyerId: event.target.value || undefined,
                }))
              }
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="경매 ID"
              size="small"
              value={draftFilters.auctionId ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  auctionId: event.target.value || undefined,
                }))
              }
              fullWidth
            />
            <Select
              size="small"
              value={draftFilters.payYn ?? "all"}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  payYn:
                    event.target.value === "all"
                      ? undefined
                      : String(event.target.value),
                }))
              }
              fullWidth
            >
              <MenuItem value="all">결제 여부 전체</MenuItem>
              <MenuItem value="Y">결제 완료</MenuItem>
              <MenuItem value="N">미결제</MenuItem>
            </Select>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="등록일 시작"
              type="datetime-local"
              size="small"
              value={draftFilters.createdFrom ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  createdFrom: event.target.value || undefined,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="등록일 종료"
              type="datetime-local"
              size="small"
              value={draftFilters.createdTo ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  createdTo: event.target.value || undefined,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => {
                setDraftFilters({});
                setFilters({});
                setPage(1);
              }}
            >
              초기화
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setFilters({
                  ...draftFilters,
                  createdFrom: toOffsetDateTime(draftFilters.createdFrom),
                  createdTo: toOffsetDateTime(draftFilters.createdTo),
                });
                setPage(1);
              }}
            >
              필터 적용
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">주문 ID</TableCell>
              <TableCell align="center">상품명</TableCell>
              <TableCell align="center">낙찰가</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="center">등록일</TableCell>
              <TableCell align="center">수정일</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell align="center">{order.id}</TableCell>
                <TableCell align="center">{order.productName ?? "-"}</TableCell>
                <TableCell align="center">
                  {formatWon(order.winningAmount)}
                </TableCell>
                <TableCell align="center">
                  <Select
                    size="small"
                    value={order.status}
                    onChange={(event) =>
                      handleStatusChange(order, event.target.value as OrderStatus)
                    }
                    sx={{ minWidth: 140 }}
                    disabled={order.status === OrderStatus.CONFIRM_BUY}
                  >
                    {Object.values(OrderStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {getOrderStatusLabel(status)}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={formatDateTime(order.createdAt)}
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={formatDateTime(order.updatedAt)}
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    color="error"
                    onClick={() => {
                      if (window.confirm("해당 주문을 삭제하시겠습니까?")) {
                        deleteMutation.mutate(order.id);
                      }
                    }}
                  >
                    삭제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {showEmpty && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">
                    조건에 해당하는 주문이 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>
    </Box>
  );
};

export default AdminOrders;
