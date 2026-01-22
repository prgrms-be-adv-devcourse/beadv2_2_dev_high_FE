import {
  adminOrderApi,
  type OrderAdminSearchFilter,
} from "@/apis/adminOrderApi";
import {
  OrderStatus,
  getOrderStatusLabel,
  type AuctionDetailResponse,
  type OrderResponse,
} from "@moreauction/types";
import { formatDate, formatWon } from "@moreauction/utils";
import { Check } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import OrderCreateDialog from "../dialog/OrderCreateDialog";
import OrderDetailDialog from "../dialog/OrderDetailDialog";
import { PAGE_SIZE } from "@/shared/constant/const";

const statusOptions = [
  { value: "all", label: "전체" },
  ...Object.values(OrderStatus).map((status) => ({
    value: status,
    label: getOrderStatusLabel(status),
  })),
];
const LOCKED_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.SHIP_STARTED,
  OrderStatus.SHIP_COMPLETED,
  OrderStatus.CONFIRM_BUY,
];
const BLOCKED_TARGETS: OrderStatus[] = [
  OrderStatus.UNPAID,
  OrderStatus.UNPAID_CANCEL,
];

const AdminOrders = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [filters, setFilters] = useState<OrderAdminSearchFilter>({
    deletedYn: "N",
  });
  const [draftFilters, setDraftFilters] = useState<OrderAdminSearchFilter>({
    deletedYn: "N",
  });
  const [payLimitDrafts, setPayLimitDrafts] = useState<Record<string, string>>(
    {}
  );
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrderResponse | null>(null);
  const [detailTarget, setDetailTarget] = useState<OrderResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const toOffsetDateTime = (value?: string | null) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  };

  const toPayLimitDateOnly = (value?: string | null) => {
    if (!value) return "";
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    return "";
  };
  const toPayLimitIso = (value?: string | null) => {
    if (!value) return undefined;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return undefined;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return undefined;
    }
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).toISOString();
  };
  const getDisplayBid = (auction: AuctionDetailResponse) => {
    const currentBid = auction.currentBid ?? 0;
    if (currentBid > 0) return currentBid;
    return auction.startBid ?? 0;
  };
  const ordersQueryKey = [
    "admin",
    "orders",
    page,
    statusFilter,
    filters,
  ] as const;

  const ordersQuery = useQuery({
    queryKey: ordersQueryKey,
    queryFn: () =>
      adminOrderApi.getOrders({
        page: page - 1,
        size: PAGE_SIZE,
        sort: "updatedAt,desc",
        filter: {
          status:
            statusFilter === "all" ? undefined : (statusFilter as OrderStatus),
          ...filters,
        },
      }),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (params: {
      orderId: string;
      status: OrderStatus;
      purchaseOrderId?: string | null;
    }) =>
      adminOrderApi.updateOrder(params.orderId, {
        status: params.status,
        purchaseOrderId: params.purchaseOrderId,
      }),
    onSuccess: (data) => {
      const updated = data?.data;
      if (!updated) return;
      queryClient.setQueryData(ordersQueryKey, (prev: any) => {
        if (!prev) return prev;
        const content = Array.isArray(prev.content) ? prev.content : [];
        const exists = content.some(
          (item: OrderResponse) => item.id === updated.id
        );
        let nextContent = content.map((item: OrderResponse) =>
          item.id === updated.id ? { ...item, ...updated } : item
        );
        if (
          statusFilter !== "all" &&
          updated.status &&
          updated.status !== statusFilter
        ) {
          nextContent = nextContent.filter(
            (item: OrderResponse) => item.id !== updated.id
          );
        } else if (!exists) {
          nextContent = content;
        }
        const totalElements =
          typeof prev.totalElements === "number"
            ? Math.max(
                prev.totalElements -
                  (exists && nextContent.length < content.length ? 1 : 0),
                0
              )
            : prev.totalElements;
        return {
          ...prev,
          content: nextContent,
          numberOfElements: nextContent.length,
          totalElements,
        };
      });
    },
  });

  const updatePayLimitMutation = useMutation({
    mutationFn: (params: { orderId: string; payLimitDate: string }) =>
      adminOrderApi.updatePayLimit({
        id: params.orderId,
        payLimitDate: params.payLimitDate,
      }),
    onSuccess: (response, variables) => {
      const updatedOrder = {
        ...response.data,
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData(ordersQueryKey, (prev: any) => {
        if (!prev) return prev;
        const content = Array.isArray(prev.content) ? prev.content : [];
        const nextContent = content.map((item: OrderResponse) =>
          item.id === variables.orderId ? { ...item, ...updatedOrder } : item
        );
        return {
          ...prev,
          content: nextContent,
        };
      });
      setPayLimitDrafts((prev) => {
        const next = { ...prev };
        delete next[variables.orderId];
        return next;
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (orderId: string) => adminOrderApi.deleteOrder(orderId),
    onSuccess: (_, orderId) => {
      queryClient.setQueryData(ordersQueryKey, (prev: any) => {
        if (!prev) return prev;
        const content = Array.isArray(prev.content) ? prev.content : [];
        const nextContent = content.filter(
          (item: OrderResponse) => item.id !== orderId
        );
        const totalElements =
          typeof prev.totalElements === "number"
            ? Math.max(
                prev.totalElements - (content.length - nextContent.length),
                0
              )
            : prev.totalElements;
        return {
          ...prev,
          content: nextContent,
          numberOfElements: nextContent.length,
          totalElements,
        };
      });
      setDeleteTarget(null);
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
    if (
      LOCKED_STATUSES.includes(order.status) &&
      BLOCKED_TARGETS.includes(next)
    ) {
      alert("구매 완료 이후 상태에서는 구매 대기로 변경할 수 없습니다.");
      return;
    }
    updateStatusMutation.mutate({
      orderId: order.id,
      status: next,
      purchaseOrderId: order.purchaseOrderId ?? null,
    });
  };

  const handlePayLimitChange = (orderId: string, value: string) => {
    setPayLimitDrafts((prev) => ({ ...prev, [orderId]: value }));
  };

  const handlePayLimitSave = (order: OrderResponse) => {
    const draft = payLimitDrafts[order.id];
    const value =
      typeof draft === "string"
        ? draft
        : toPayLimitDateOnly(order.payLimitDate);
    const next = toPayLimitIso(value);
    if (!next) {
      alert("결제기한이 올바르지 않습니다.");
      return;
    }
    updatePayLimitMutation.mutate({ orderId: order.id, payLimitDate: next });
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
            구매 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            낙찰 주문 상태를 확인하고 업데이트합니다.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <Button
            variant="outlined"
            onClick={() => {
              setCreateOrderOpen(true);
            }}
          >
            주문 생성
          </Button>
          <Select
            size="small"
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value);
            }}
            sx={{ minWidth: 140 }}
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            value={draftFilters.deletedYn ?? "all"}
            onChange={(event) => {
              const nextValue =
                event.target.value === "all"
                  ? undefined
                  : (event.target.value as "Y" | "N");
              setDraftFilters((prev) => ({
                ...prev,
                deletedYn: nextValue,
              }));
              setFilters((prev) => ({
                ...prev,
                deletedYn: nextValue,
              }));
              setPage(1);
            }}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">삭제 여부 전체</MenuItem>
            <MenuItem value="N">삭제 안됨</MenuItem>
            <MenuItem value="Y">삭제됨</MenuItem>
          </Select>
          <Select
            size="small"
            value={draftFilters.payYn ?? "all"}
            onChange={(event) => {
              const nextValue =
                event.target.value === "all"
                  ? undefined
                  : String(event.target.value);
              setDraftFilters((prev) => ({
                ...prev,
                payYn: nextValue,
              }));
              setFilters((prev) => ({
                ...prev,
                payYn: nextValue,
              }));
              setPage(1);
            }}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">결제 여부 전체</MenuItem>
            <MenuItem value="Y">결제 완료</MenuItem>
            <MenuItem value="N">미결제</MenuItem>
          </Select>
        </Stack>
      </Stack>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            필터
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
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
                setDraftFilters({ deletedYn: "N" });
                setFilters({ deletedYn: "N" });
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
        <Table size="small" sx={{ "& th, & td": { py: 1.25, px: 1 } }}>
          <TableHead>
            <TableRow>
              <TableCell align="center">주문 ID</TableCell>
              <TableCell align="center">상품명</TableCell>
              <TableCell align="center">구매자</TableCell>
              <TableCell align="center">판매자</TableCell>
              <TableCell align="center">낙찰가</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="center">삭제</TableCell>
              <TableCell align="center">결제기한</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody
            sx={{
              "& tr:last-child td, & tr:last-child th": { borderBottom: 0 },
            }}
          >
            {ordersQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography color="text.secondary">
                    구매 목록을 불러오는 중...
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {errorMessage && (
              <TableRow>
                <TableCell colSpan={9}>
                  <Alert severity="error">{errorMessage}</Alert>
                </TableCell>
              </TableRow>
            )}

            {orders.map((order) => (
              <TableRow
                key={order.id}
                hover
                sx={{ height: 56, cursor: "pointer" }}
                onClick={() => {
                  setDetailTarget(order);
                  setDetailOpen(true);
                }}
              >
                <TableCell align="center">{order.id}</TableCell>
                <TableCell align="center">{order.productName ?? "-"}</TableCell>
                <TableCell align="center">{order.buyerId ?? "-"}</TableCell>
                <TableCell align="center">{order.sellerId ?? "-"}</TableCell>
                <TableCell align="center">
                  {formatWon(order.winningAmount)}
                </TableCell>
                <TableCell align="center">
                  <Select
                    size="small"
                    value={order.status}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      handleStatusChange(
                        order,
                        event.target.value as OrderStatus
                      )
                    }
                    sx={{ minWidth: 140 }}
                    disabled={
                      order.deletedYn === true ||
                      order.deletedYn === "Y" ||
                      order.status === OrderStatus.CONFIRM_BUY
                    }
                  >
                    {Object.values(OrderStatus).map((status) => (
                      <MenuItem
                        key={status}
                        value={status}
                        disabled={
                          LOCKED_STATUSES.includes(order.status) &&
                          BLOCKED_TARGETS.includes(status)
                        }
                      >
                        {getOrderStatusLabel(status)}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell align="center">
                  {(() => {
                    const deletedFlag =
                      order.deletedYn === true || order.deletedYn === "Y";
                    return (
                      <Chip
                        size="small"
                        label={deletedFlag ? "Y" : "N"}
                        color={deletedFlag ? "default" : "success"}
                        variant={deletedFlag ? "outlined" : "filled"}
                      />
                    );
                  })()}
                </TableCell>
                <TableCell align="center">
                  {(() => {
                    const currentValue = toPayLimitDateOnly(order.payLimitDate);
                    const draftValue = payLimitDrafts[order.id] ?? currentValue;
                    const isDirty = draftValue !== currentValue;

                    return (
                      <TextField
                        type="date"
                        size="small"
                        value={draftValue}
                        onChange={(event) =>
                          handlePayLimitChange(order.id, event.target.value)
                        }
                        onClick={(event) => event.stopPropagation()}
                        sx={(theme) => ({
                          minWidth: 150,
                          "& input::-webkit-calendar-picker-indicator": {
                            filter:
                              theme.palette.mode === "dark"
                                ? "invert(1) brightness(1.2)"
                                : "none",
                          },
                        })}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="기한 저장">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handlePayLimitSave(order);
                                    }}
                                    disabled={
                                      order.deletedYn === true ||
                                      order.deletedYn === "Y" ||
                                      LOCKED_STATUSES.includes(order.status) ||
                                      updatePayLimitMutation.isPending ||
                                      !isDirty
                                    }
                                    color={isDirty ? "primary" : "default"}
                                  >
                                    <Check fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </InputAdornment>
                          ),
                        }}
                        disabled={
                          order.deletedYn === true ||
                          order.deletedYn === "Y" ||
                          LOCKED_STATUSES.includes(order.status)
                        }
                      />
                    );
                  })()}
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    color="error"
                    disabled={
                      order.deletedYn === true ||
                      order.deletedYn === "Y" ||
                      deleteMutation.isPending ||
                      !BLOCKED_TARGETS.includes(order.status)
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteTarget(order);
                    }}
                  >
                    삭제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {showEmpty && (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography color="text.secondary">
                    조건에 해당하는 주문이 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <OrderCreateDialog
        createOrderOpen={createOrderOpen}
        setCreateOrderOpen={setCreateOrderOpen}
      />
      <OrderDetailDialog
        open={detailOpen}
        order={detailTarget}
        onClose={() => setDetailOpen(false)}
        onExited={() => setDetailTarget(null)}
      />

      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>

      <Dialog
        open={!!deleteTarget}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setDeleteTarget(null);
        }}
      >
        <DialogTitle>주문 삭제</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            선택한 주문을 삭제하시겠습니까? 삭제된 주문은 복구할 수 없습니다.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
            대상: {deleteTarget?.productName ?? "-"} (주문 ID:{" "}
            {deleteTarget?.id})
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (deleteMutation.isPending) return;
              setDeleteTarget(null);
            }}
          >
            취소
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!deleteTarget || deleteMutation.isPending}
            onClick={() => {
              if (!deleteTarget) return;
              deleteMutation.mutate(deleteTarget.id);
            }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminOrders;
