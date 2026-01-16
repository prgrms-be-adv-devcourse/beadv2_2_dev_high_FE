import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Pagination,
  Stack,
  Alert,
} from "@mui/material";
import { Check } from "@mui/icons-material";
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
  AuctionStatus,
  type OrderResponse,
  type AuctionDetailResponse,
} from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import {
  adminOrderApi,
  type OrderAdminSearchFilter,
} from "@/apis/adminOrderApi";
import { adminAuctionApi } from "@/apis/adminAuctionApi";

const PAGE_SIZE = 10;
const COMPLETED_AUCTION_PAGE_SIZE = 5;

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
  const [completedPage, setCompletedPage] = useState(1);

  const toOffsetDateTime = (value?: string | null) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  };

  const formatDateTime = (value?: string | null) => {
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
  const completedAuctionsQuery = useQuery({
    queryKey: ["admin", "auctions", "completed", completedPage],
    queryFn: () =>
      adminAuctionApi.getAuctions({
        page: completedPage - 1,
        size: COMPLETED_AUCTION_PAGE_SIZE,
        sort: "auctionEndAt,desc",
        status: AuctionStatus.COMPLETED,
      }),
    enabled: createOrderOpen,
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (params: { orderId: string; status: OrderStatus }) =>
      adminOrderApi.updateOrder(params.orderId, { status: params.status }),
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
    onSuccess: (_, variables) => {
      queryClient.setQueryData(ordersQueryKey, (prev: any) => {
        if (!prev) return prev;
        const content = Array.isArray(prev.content) ? prev.content : [];
        const nextContent = content.map((item: OrderResponse) =>
          item.id === variables.orderId
            ? { ...item, payLimitDate: variables.payLimitDate }
            : item
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

  const createOrderMutation = useMutation({
    mutationFn: (payload: {
      sellerId: string;
      buyerId: string;
      productId: string;
      productName: string;
      auctionId: string;
      winningAmount: number;
      depositAmount: number;
      winningDate: string;
    }) => adminOrderApi.createOrder(payload),
    onSuccess: () => {
      alert("주문이 생성되었습니다.");
      setCreateOrderOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "auctions", "completed"],
        refetchType: "none",
      });
    },
    onError: (error: any) => {
      alert(error?.data?.message ?? "주문 생성에 실패했습니다.");
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
    },
  });

  const totalPages = ordersQuery.data?.totalPages ?? 1;
  const orders = ordersQuery.data?.content ?? [];
  const completedTotalPages = completedAuctionsQuery.data?.totalPages ?? 1;
  const completedAuctions = completedAuctionsQuery.data?.content ?? [];

  const showEmpty =
    !ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0;
  const errorMessage = useMemo(() => {
    if (!ordersQuery.isError) return null;
    return "주문 목록을 불러오지 못했습니다.";
  }, [ordersQuery.isError]);
  const completedErrorMessage = useMemo(() => {
    if (!completedAuctionsQuery.isError) return null;
    return "종료된 경매 목록을 불러오지 못했습니다.";
  }, [completedAuctionsQuery.isError]);

  const handleStatusChange = (order: OrderResponse, next: OrderStatus) => {
    if (order.status === next) return;
    if (
      LOCKED_STATUSES.includes(order.status) &&
      BLOCKED_TARGETS.includes(next)
    ) {
      alert("구매 완료 이후 상태에서는 구매 대기로 변경할 수 없습니다.");
      return;
    }
    updateStatusMutation.mutate({ orderId: order.id, status: next });
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
            주문 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            낙찰 주문 상태를 확인하고 업데이트합니다.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
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
                setCompletedPage(1);
                setCreateOrderOpen(true);
              }}
            >
              주문 생성
            </Button>
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
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
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
              <TableCell align="center">구매일</TableCell>
              <TableCell align="center">등록일</TableCell>
              <TableCell align="center">수정일</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} hover sx={{ height: 56 }}>
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
                                    onClick={() => handlePayLimitSave(order)}
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
                  <Chip
                    size="small"
                    label={
                      order.payCompleteDate
                        ? formatDateTime(order.payCompleteDate)
                        : "-"
                    }
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip size="small" label={formatDateTime(order.createdAt)} />
                </TableCell>
                <TableCell align="center">
                  <Chip size="small" label={formatDateTime(order.updatedAt)} />
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
                    onClick={() => {
                      if (
                        order.deletedYn === true ||
                        order.deletedYn === "Y"
                      ) {
                        return;
                      }
                      if (!BLOCKED_TARGETS.includes(order.status)) {
                        alert("구매 대기 상태에서만 삭제할 수 있습니다.");
                        return;
                      }
                      const confirmId = window.prompt(
                        "삭제하려면 주문 ID를 입력해 주세요."
                      );
                      if (confirmId !== order.id) {
                        alert("주문 ID가 일치하지 않습니다.");
                        return;
                      }
                      deleteMutation.mutate(order.id);
                    }}
                  >
                    삭제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {showEmpty && (
              <TableRow>
                <TableCell colSpan={12}>
                  <Typography color="text.secondary">
                    조건에 해당하는 주문이 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>주문 생성</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              종료된 경매(COMPLETED)에서 주문서를 생성합니다.
            </Typography>
            {completedErrorMessage && (
              <Alert severity="error">{completedErrorMessage}</Alert>
            )}
            <Table size="small" sx={{ "& th, & td": { py: 1, px: 1 } }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center">경매 ID</TableCell>
                  <TableCell align="center">상품명</TableCell>
                  <TableCell align="center">판매자</TableCell>
                  <TableCell align="center">최고 입찰자</TableCell>
                  <TableCell align="center">낙찰가</TableCell>
                  <TableCell align="center">종료일</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {completedAuctionsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">
                        불러오는 중입니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : completedAuctions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">
                        종료된 경매가 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  completedAuctions.map((auction) => (
                    <TableRow key={auction.id} hover>
                      <TableCell align="center">{auction.id}</TableCell>
                      <TableCell align="center">
                        {auction.productName ?? "-"}
                      </TableCell>
                      <TableCell align="center">
                        {auction.sellerId ?? "-"}
                      </TableCell>
                      <TableCell align="center">
                        {auction.highestUserId ?? "-"}
                      </TableCell>
                      <TableCell align="center">
                        {formatWon(getDisplayBid(auction))}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={formatDateTime(auction.auctionEndAt)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => {
                            if (!auction.highestUserId) {
                              return;
                            }
                            createOrderMutation.mutate({
                              sellerId: auction.sellerId,
                              buyerId: auction.highestUserId,
                              productId: auction.productId,
                              productName: auction.productName ?? "",
                              auctionId: auction.id,
                              winningAmount: getDisplayBid(auction),
                              depositAmount: auction.depositAmount ?? 0,
                              winningDate: auction.auctionEndAt,
                            });
                          }}
                          disabled={
                            createOrderMutation.isPending ||
                            !auction.highestUserId
                          }
                        >
                          주문 생성
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Pagination
              count={Math.max(completedTotalPages, 1)}
              page={completedPage}
              onChange={(_, value) => setCompletedPage(value)}
              disabled={completedTotalPages === 0}
              size="small"
              sx={{ display: "flex", justifyContent: "center" }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOrderOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

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
