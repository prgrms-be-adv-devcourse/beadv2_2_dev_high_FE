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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { OrderStatus, SettlementStatus } from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import {
  adminSettlementApi,
  type SettlementAdminSearchFilter,
} from "@/apis/adminSettlementApi";
import { adminOrderApi } from "@/apis/adminOrderApi";

const PAGE_SIZE = 10;
const ORDER_PAGE_SIZE = 8;
const GROUP_ITEMS_PAGE_SIZE = 8;

const settlementStatusLabels: Record<string, string> = {
  WAITING: "대기",
  COMPLETED: "완료",
  FAILED: "실패",
};

const AdminSettlements = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SettlementAdminSearchFilter>({});
  const [draftFilters, setDraftFilters] = useState<SettlementAdminSearchFilter>(
    {}
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [orderPage, setOrderPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState("");
  const [groupItemsPage, setGroupItemsPage] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [runBatchMessage, setRunBatchMessage] = useState<string | null>(null);
  const [runBatchCooldownUntil, setRunBatchCooldownUntil] = useState<number | null>(
    null
  );
  const [batchCooldownSeconds, setBatchCooldownSeconds] = useState(0);

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

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toISOString().slice(0, 10);
  };

  const settlementsQuery = useQuery({
    queryKey: ["admin", "settlements", page, filters],
    queryFn: () =>
      adminSettlementApi.getSettlements({
        page: page - 1,
        size: PAGE_SIZE,
        sort: "updateDate,desc",
        filter: filters,
      }),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });

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

  const runBatchMutation = useMutation({
    mutationFn: () => adminSettlementApi.runSettlementBatch(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settlements"] });
      setRunBatchMessage("정산 배치를 실행했습니다.");
      setRunBatchCooldownUntil(Date.now() + 30_000);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ??
        error?.data?.message ??
        "정산 배치 실행에 실패했습니다.";
      setRunBatchMessage(message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (params: { id: string; status: SettlementStatus }) =>
      adminSettlementApi.updateSettlement({
        id: params.id,
        status: params.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settlements"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "settlement-group-items"],
      });
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

  const groupItemsQuery = useQuery({
    queryKey: [
      "admin",
      "settlement-group-items",
      selectedGroupId,
      groupItemsPage,
    ],
    queryFn: () =>
      adminSettlementApi.getSettlementGroupItems(selectedGroupId as string, {
        page: groupItemsPage - 1,
        size: GROUP_ITEMS_PAGE_SIZE,
        sort: "updateDate,desc",
      }),
    enabled: isGroupOpen && Boolean(selectedGroupId),
    placeholderData: keepPreviousData,
  });

  const totalPages = settlementsQuery.data?.totalPages ?? 1;
  const settlements = settlementsQuery.data?.content ?? [];
  const ordersTotalPages = ordersQuery.data?.totalPages ?? 1;
  const orders = ordersQuery.data?.content ?? [];
  const groupItemsTotalPages = groupItemsQuery.data?.totalPages ?? 1;
  const groupItems = groupItemsQuery.data?.content ?? [];

  const showEmpty =
    !settlementsQuery.isLoading &&
    !settlementsQuery.isError &&
    settlements.length === 0;
  const errorMessage = useMemo(() => {
    if (!settlementsQuery.isError) return null;
    return "정산 목록을 불러오지 못했습니다.";
  }, [settlementsQuery.isError]);

  const handleOpenCreate = () => {
    setIsCreateOpen(true);
    setOrderPage(1);
    setCreateError(null);
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    setCreateError(null);
  };

  const handleOpenGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setGroupItemsPage(1);
    setIsGroupOpen(true);
  };

  const handleCloseGroup = () => {
    setIsGroupOpen(false);
    setSelectedGroupId(null);
  };

  const handleCreateSettlement = (orderId: string) => {
    createMutation.mutate(orderId, {
      onSuccess: () => {
        handleCloseCreate();
      },
    });
  };

  const handleGroupItemStatusChange = (
    settlementId: string,
    current: SettlementStatus,
    next: SettlementStatus
  ) => {
    if (current === next) return;
    updateStatusMutation.mutate({ id: settlementId, status: next });
  };

  const handleRunBatch = () => {
    if (runBatchCooldownUntil && Date.now() < runBatchCooldownUntil) return;
    setRunBatchMessage(null);
    runBatchMutation.mutate();
  };

  useEffect(() => {
    if (!runBatchCooldownUntil) {
      setBatchCooldownSeconds(0);
      return;
    }
    const updateRemaining = () => {
      const remaining = Math.max(
        0,
        Math.ceil((runBatchCooldownUntil - Date.now()) / 1000)
      );
      setBatchCooldownSeconds(remaining);
      if (remaining === 0) {
        setRunBatchCooldownUntil(null);
      }
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1_000);
    return () => window.clearInterval(timer);
  }, [runBatchCooldownUntil]);

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
            정산 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            정산 상태를 확인하고 수동 처리합니다.
          </Typography>
        </Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <Button
            variant="outlined"
            onClick={handleOpenCreate}
            fullWidth
            sx={{ minWidth: 140 }}
          >
            정산 등록
          </Button>
          <Button
            variant="contained"
            onClick={handleRunBatch}
            disabled={runBatchMutation.isPending || batchCooldownSeconds > 0}
            fullWidth
            sx={{ minWidth: 180 }}
          >
            {batchCooldownSeconds > 0
              ? `정산 배치 대기 (${batchCooldownSeconds}s)`
              : "정산 배치 즉시 실행"}
          </Button>
        </Stack>
      </Stack>
      {runBatchMessage && (
        <Alert
          severity={runBatchMutation.isError ? "error" : "success"}
          sx={{ mb: 2 }}
          onClose={() => setRunBatchMessage(null)}
        >
          {runBatchMessage}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            필터
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
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
              label="정산일 시작"
              type="date"
              size="small"
              value={draftFilters.settlementDateFrom ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  settlementDateFrom: event.target.value || undefined,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="정산일 종료"
              type="date"
              size="small"
              value={draftFilters.settlementDateTo ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  settlementDateTo: event.target.value || undefined,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="flex-end"
          >
            <Button
              variant="outlined"
              onClick={() => {
                setDraftFilters({});
                setFilters({});
                setPage(1);
              }}
              fullWidth
              sx={{ minWidth: 120 }}
            >
              초기화
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setFilters({
                  ...draftFilters,
                });
                setPage(1);
              }}
              fullWidth
              sx={{ minWidth: 120 }}
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
              <TableCell align="center">정산 그룹 ID</TableCell>
              <TableCell align="center">판매자 ID</TableCell>
              <TableCell align="center">정산일</TableCell>
              <TableCell align="center">총액</TableCell>
              <TableCell align="center">정산 예정액</TableCell>
              <TableCell align="center">수수료 예정액</TableCell>
              <TableCell align="center">총 지급액</TableCell>
              <TableCell align="center">정산 지급액</TableCell>
              <TableCell align="center">차감 수수료</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="center">등록일</TableCell>
              <TableCell align="center">수정일</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settlements.map((settlement) => (
              <TableRow key={settlement.id} hover>
                <TableCell align="center">{settlement.id}</TableCell>
                <TableCell align="center">{settlement.sellerId}</TableCell>
                <TableCell align="center">
                  {formatDate(settlement.settlementDate)}
                </TableCell>
                <TableCell align="center">
                  {formatWon(settlement.totalFinalAmount + settlement.totalCharge)}
                </TableCell>
                <TableCell align="center">
                  {formatWon(settlement.totalFinalAmount)}
                </TableCell>
                <TableCell align="center">
                  {formatWon(settlement.totalCharge)}
                </TableCell>
                <TableCell align="center">
                  {formatWon(settlement.paidFinalAmount + settlement.paidCharge)}
                </TableCell>
                <TableCell align="center">
                  {formatWon(settlement.paidFinalAmount)}
                </TableCell>
                <TableCell align="center">
                  {formatWon(settlement.paidCharge)}
                </TableCell>
                <TableCell align="center">
                  {settlement.depositStatus ?? "-"}
                </TableCell>
                <TableCell align="center">
                  <Chip size="small" label={formatDateTime(settlement.createdAt)} />
                </TableCell>
                <TableCell align="center">
                  <Chip size="small" label={formatDateTime(settlement.updateDate)} />
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleOpenGroup(settlement.id)}
                  >
                    정산 항목
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {showEmpty && (
              <TableRow>
                <TableCell colSpan={11}>
                  <Typography color="text.secondary">
                    조건에 해당하는 정산이 없습니다.
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

      <Dialog open={isCreateOpen} onClose={handleCloseCreate} maxWidth="md" fullWidth>
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
                    <TableRow key={order.id} hover>
                      <TableCell align="center">{order.id}</TableCell>
                      <TableCell align="center">{order.sellerId}</TableCell>
                      <TableCell align="center">{order.buyerId}</TableCell>
                      <TableCell align="center">
                        {formatWon(order.winningAmount)}
                      </TableCell>
                      <TableCell align="center">
                        {formatDateTime(order.confirmDate)}
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

      <Dialog open={isGroupOpen} onClose={handleCloseGroup} maxWidth="lg" fullWidth>
        <DialogTitle>정산 항목 상태 변경</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center">정산 ID</TableCell>
                    <TableCell align="center">주문 ID</TableCell>
                    <TableCell align="center">정산 금액</TableCell>
                    <TableCell align="center">상태</TableCell>
                    <TableCell align="center">등록일</TableCell>
                    <TableCell align="center">완료일</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupItems.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell align="center">{item.id}</TableCell>
                      <TableCell align="center">{item.orderId}</TableCell>
                      <TableCell align="center">
                        {formatWon(item.finalAmount)}
                      </TableCell>
                      <TableCell align="center">
                        <Select
                          size="small"
                          value={item.status}
                          onChange={(event) =>
                            handleGroupItemStatusChange(
                              item.id,
                              item.status,
                              event.target.value as SettlementStatus
                            )
                          }
                          sx={{ minWidth: 130 }}
                          disabled={item.status === SettlementStatus.COMPLETED}
                        >
                          {Object.values(SettlementStatus).map((status) => (
                            <MenuItem key={status} value={status}>
                              {settlementStatusLabels[status] ?? status}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell align="center">
                        {formatDateTime(item.inputDate)}
                      </TableCell>
                      <TableCell align="center">
                        {formatDateTime(item.completeDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!groupItemsQuery.isLoading && groupItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography color="text.secondary">
                          정산 항목이 없습니다.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {groupItemsQuery.isLoading && (
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
                count={groupItemsTotalPages}
                page={groupItemsPage}
                onChange={(_, value) => setGroupItemsPage(value)}
                color="primary"
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroup}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminSettlements;
