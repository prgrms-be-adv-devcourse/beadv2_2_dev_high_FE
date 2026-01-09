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
  SettlementStatus,
  type SettlementResponse,
} from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import {
  adminSettlementApi,
  type SettlementAdminSearchFilter,
} from "@/apis/adminSettlementApi";

const PAGE_SIZE = 10;

const settlementStatusLabels: Record<string, string> = {
  PENDING: "대기",
  COMPLETED: "완료",
};

const statusOptions = [
  { value: "all", label: "전체" },
  ...Object.values(SettlementStatus).map((status) => ({
    value: status,
    label: settlementStatusLabels[status] ?? status,
  })),
];

const AdminSettlements = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [filters, setFilters] = useState<SettlementAdminSearchFilter>({});
  const [draftFilters, setDraftFilters] =
    useState<SettlementAdminSearchFilter>({});

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

  const settlementsQuery = useQuery({
    queryKey: ["admin", "settlements", page, statusFilter, filters],
    queryFn: () =>
      adminSettlementApi.getSettlements({
        page: page - 1,
        size: PAGE_SIZE,
        sort: "updateDate,desc",
        filter: {
          status:
            statusFilter === "all"
              ? undefined
              : (statusFilter as SettlementStatus),
          ...filters,
        },
      }),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (params: { id: string; status: SettlementStatus }) =>
      adminSettlementApi.updateSettlement(params.id, {
        status: params.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settlements"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminSettlementApi.deleteSettlement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settlements"] });
    },
  });

  const totalPages = settlementsQuery.data?.totalPages ?? 1;
  const settlements = settlementsQuery.data?.content ?? [];

  const showEmpty =
    !settlementsQuery.isLoading &&
    !settlementsQuery.isError &&
    settlements.length === 0;
  const errorMessage = useMemo(() => {
    if (!settlementsQuery.isError) return null;
    return "정산 목록을 불러오지 못했습니다.";
  }, [settlementsQuery.isError]);

  const handleStatusChange = (
    settlement: SettlementResponse,
    next: SettlementStatus
  ) => {
    if (settlement.status === next) return;
    updateStatusMutation.mutate({ id: settlement.id, status: next });
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
            정산 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            정산 상태를 확인하고 수동 처리합니다.
          </Typography>
        </Box>
        <Select
          size="small"
          value={statusFilter}
          onChange={(event) => {
            setPage(1);
            setStatusFilter(event.target.value);
          }}
        >
          {statusOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </Stack>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="정산 ID"
              size="small"
              value={draftFilters.settlementId ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  settlementId: event.target.value || undefined,
                }))
              }
              fullWidth
            />
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
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
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
              value={draftFilters.completeYn ?? "all"}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  completeYn:
                    event.target.value === "all"
                      ? undefined
                      : String(event.target.value),
                }))
              }
              fullWidth
            >
              <MenuItem value="all">정산 여부 전체</MenuItem>
              <MenuItem value="Y">정산 완료</MenuItem>
              <MenuItem value="N">미정산</MenuItem>
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
            <TextField
              label="완료일 시작"
              type="datetime-local"
              size="small"
              value={draftFilters.completeFrom ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  completeFrom: event.target.value || undefined,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="완료일 종료"
              type="datetime-local"
              size="small"
              value={draftFilters.completeTo ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  completeTo: event.target.value || undefined,
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
                  completeFrom: toOffsetDateTime(draftFilters.completeFrom),
                  completeTo: toOffsetDateTime(draftFilters.completeTo),
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
              <TableCell align="center">정산 ID</TableCell>
              <TableCell align="center">주문 ID</TableCell>
              <TableCell align="center">정산 금액</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="center">등록일</TableCell>
              <TableCell align="center">수정일</TableCell>
              <TableCell align="center">완료일</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settlements.map((settlement) => (
              <TableRow key={settlement.id} hover>
                <TableCell align="center">{settlement.id}</TableCell>
                <TableCell align="center">{settlement.orderId}</TableCell>
                <TableCell align="center">
                  {formatWon(settlement.finalAmount)}
                </TableCell>
                <TableCell align="center">
                  <Select
                    size="small"
                    value={settlement.status}
                    onChange={(event) =>
                      handleStatusChange(
                        settlement,
                        event.target.value as SettlementStatus
                      )
                    }
                    sx={{ minWidth: 120 }}
                    disabled={settlement.status === SettlementStatus.COMPLETED}
                  >
                    {Object.values(SettlementStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {settlementStatusLabels[status] ?? status}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={formatDateTime(settlement.inputDate)}
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={formatDateTime(settlement.lastUpdateDate)}
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={formatDateTime(settlement.completeDate)}
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    color="error"
                    onClick={() => {
                      if (window.confirm("해당 정산을 삭제하시겠습니까?")) {
                        deleteMutation.mutate(settlement.id);
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
                <TableCell colSpan={8}>
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
    </Box>
  );
};

export default AdminSettlements;
