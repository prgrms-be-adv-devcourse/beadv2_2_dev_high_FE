import { adminSettlementApi } from "@/apis/adminSettlementApi";
import { SettlementStatus } from "@moreauction/types";
import { formatDate, formatWon } from "@moreauction/utils";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Typography,
} from "@mui/material";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
const GROUP_ITEMS_PAGE_SIZE = 8;
const settlementStatusLabels: Record<string, string> = {
  WAITING: "대기",
  COMPLETED: "완료",
  FAILED: "실패",
};
const ChangeSettleDialog = ({ selectedGroupId, setSelectedGroupId }: any) => {
  const queryClient = useQueryClient();

  const [groupItemsPage, setGroupItemsPage] = useState(1);

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
    enabled: Boolean(selectedGroupId),
    placeholderData: keepPreviousData,
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

  const groupItemsTotalPages = groupItemsQuery.data?.totalPages ?? 1;
  const groupItems = groupItemsQuery.data?.content ?? [];

  const handleCloseGroup = () => {
    setSelectedGroupId(null);
    setGroupItemsPage(1);
  };

  const handleGroupItemStatusChange = (
    settlementId: string,
    current: SettlementStatus,
    next: SettlementStatus
  ) => {
    if (current === next) return;
    updateStatusMutation.mutate({ id: settlementId, status: next });
  };

  return (
    <Dialog
      open={Boolean(selectedGroupId)}
      onClose={handleCloseGroup}
      maxWidth="lg"
      fullWidth
    >
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
                  <TableRow key={item.id} hover sx={{ height: 56 }}>
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
                      {formatDate(item.inputDate)}
                    </TableCell>
                    <TableCell align="center">
                      {formatDate(item.completeDate)}
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
  );
};

export default ChangeSettleDialog;
