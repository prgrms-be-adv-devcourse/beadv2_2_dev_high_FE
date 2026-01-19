import {
  adminSettlementApi,
  type SettlementAdminSearchFilter,
} from "@/apis/adminSettlementApi";
import { formatDate, formatWon } from "@moreauction/utils";
import {
  Alert,
  Box,
  Button,
  Chip,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import ChangeSettleDialog from "../dialog/ChangeSettleDialog";
import SettleCreateDialog from "../dialog/SettleCreateDialog";

const PAGE_SIZE = 10;

const AdminSettlements = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SettlementAdminSearchFilter>({});
  const [draftFilters, setDraftFilters] = useState<SettlementAdminSearchFilter>(
    {}
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [runBatchMessage, setRunBatchMessage] = useState<string | null>(null);
  const [runBatchCooldownUntil, setRunBatchCooldownUntil] = useState<
    number | null
  >(null);
  const [batchCooldownSeconds, setBatchCooldownSeconds] = useState(0);

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

  const handleOpenGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
  };

  const handleOpenCreate = () => {
    setIsCreateOpen(true);
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
              size="small"
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
              size="small"
            >
              필터 적용
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined">
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
            {errorMessage && (
              <TableRow>
                <TableCell colSpan={13}>
                  <Alert severity="error">{errorMessage}</Alert>
                </TableCell>
              </TableRow>
            )}
            {settlements.map((settlement) => (
              <TableRow key={settlement.id} hover sx={{ height: 56 }}>
                <TableCell align="center">{settlement.id}</TableCell>
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
                    {settlement.sellerId}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {formatDate(settlement.settlementDate)}
                </TableCell>
                <TableCell align="center">
                  {formatWon(
                    settlement.totalFinalAmount + settlement.totalCharge
                  )}
                </TableCell>
                <TableCell align="center">
                  {formatWon(settlement.totalFinalAmount)}
                </TableCell>
                <TableCell align="center">
                  {formatWon(settlement.totalCharge)}
                </TableCell>
                <TableCell align="center">
                  {formatWon(
                    settlement.paidFinalAmount + settlement.paidCharge
                  )}
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
                  <Chip size="small" label={formatDate(settlement.createdAt)} />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={formatDate(settlement.updateDate)}
                  />
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
      <SettleCreateDialog
        isCreateOpen={isCreateOpen}
        setIsCreateOpen={setIsCreateOpen}
      />
      <ChangeSettleDialog
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
      />
    </Box>
  );
};

export default AdminSettlements;
