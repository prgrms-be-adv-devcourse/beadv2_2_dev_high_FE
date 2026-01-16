import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { settlementApi } from "@/apis/settlementApi";
import type { SettlementResponse, SettlementSummary } from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

type SettlementView = "SUMMARY" | "HISTORY";

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
};

export const SettlementTab: React.FC = () => {
  const [view, setView] = useState<SettlementView>(() => {
    const stored = sessionStorage.getItem("settlementView");
    return (stored as SettlementView) ?? "SUMMARY";
  });
  const [selectedGroup, setSelectedGroup] = useState<SettlementSummary | null>(
    null
  );

  const handleCloseGroup = () => {
    setSelectedGroup(null);
  };

  useEffect(() => {
    sessionStorage.setItem("settlementView", view);
  }, [view]);

  const pageSize = 20;

  const renderSkeletonList = () => (
    <List>
      {Array.from({ length: 6 }).map((_, idx) => (
        <React.Fragment key={idx}>
          <ListItem>
            <ListItemText
              primary={<Skeleton width="45%" />}
              secondary={<Skeleton width="75%" />}
            />
          </ListItem>
          <Divider />
        </React.Fragment>
      ))}
    </List>
  );

  const SummaryPanel = ({
    onSelect,
  }: {
    onSelect: (group: SettlementSummary) => void;
  }) => {
    const summaryQuery = useInfiniteQuery({
      queryKey: queryKeys.settlement.summary(pageSize),
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => {
        const res = await settlementApi.getSettlementSummary({
          page: pageParam,
          size: pageSize,
        });
        return res.data;
      },
      getNextPageParam: (lastPage) =>
        lastPage.last ? undefined : lastPage.number + 1,
      staleTime: 30_000,
    });
    const errorMessage = useMemo(() => {
      if (!summaryQuery.isError) return null;
      const err: any = summaryQuery.error;
      const isNetworkError =
        err?.code === "ERR_NETWORK" || err?.message === "Network Error";
      if (isNetworkError) {
        return "정산 내역을 불러오는데 실패했습니다.";
      }
      return getErrorMessage(err, "정산 내역을 불러오는데 실패했습니다.");
    }, [summaryQuery.error, summaryQuery.isError]);

    const list: SettlementSummary[] =
      summaryQuery.data?.pages.flatMap((p) => p.content ?? []) ?? [];

    if (summaryQuery.isLoading && list.length === 0) {
      return renderSkeletonList();
    }
    if (errorMessage) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      );
    }
    if (list.length === 0) {
      return <Alert severity="info">정산 내역이 없습니다.</Alert>;
    }

    return (
      <>
        <Box sx={{ maxHeight: "60vh", overflowY: "auto" }}>
          <List>
            {list.map((item) => (
              <React.Fragment key={item.id}>
                <ListItem disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => onSelect(item)}
                    sx={{
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      alignItems: "flex-start",
                      bgcolor: "background.paper",
                      transition: "all 160ms ease",
                      "&:hover": {
                        bgcolor: "action.hover",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                      },
                    }}
                  >
                    <Stack spacing={1.5} sx={{ width: "100%" }}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {formatDate(item.settlementDate)}
                        </Typography>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`상태 · ${item.depositStatus ?? "-"}`}
                        />
                      </Stack>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "1fr 1fr",
                            md: "1fr 1fr 1fr",
                          },
                          gap: 1.5,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            총액
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {formatWon(item.totalFinalAmount + item.totalCharge)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            정산 예정액
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {formatWon(item.totalFinalAmount)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            수수료 예정액
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {formatWon(item.totalCharge)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            총 지급액
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {formatWon(item.paidFinalAmount + item.paidCharge)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            정산 지급액
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {formatWon(item.paidFinalAmount)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            차감 수수료
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {formatWon(item.paidCharge)}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>

          {summaryQuery.hasNextPage && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <Button
                variant="outlined"
                onClick={() => summaryQuery.fetchNextPage()}
                disabled={summaryQuery.isFetchingNextPage}
              >
                {summaryQuery.isFetchingNextPage ? (
                  <CircularProgress size={18} />
                ) : (
                  "더 보기"
                )}
              </Button>
            </Box>
          )}
        </Box>
      </>
    );
  };

  const HistoryPanel = () => {
    const historyQuery = useInfiniteQuery({
      queryKey: queryKeys.settlement.history(pageSize),
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => {
        const res = await settlementApi.getSettlementHistory({
          page: pageParam,
          size: pageSize,
        });
        return res.data;
      },
      getNextPageParam: (lastPage) =>
        lastPage.last ? undefined : lastPage.number + 1,
      staleTime: 30_000,
    });
    const errorMessage = useMemo(() => {
      if (!historyQuery.isError) return null;
      const err: any = historyQuery.error;
      const isNetworkError =
        err?.code === "ERR_NETWORK" || err?.message === "Network Error";
      if (isNetworkError) {
        return "정산 내역을 불러오는데 실패했습니다.";
      }
      return getErrorMessage(err, "정산 내역을 불러오는데 실패했습니다.");
    }, [historyQuery.error, historyQuery.isError]);

    const list: SettlementResponse[] =
      historyQuery.data?.pages.flatMap((p) => p.content ?? []) ?? [];

    if (historyQuery.isLoading && list.length === 0) {
      return renderSkeletonList();
    }
    if (errorMessage) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      );
    }
    if (list.length === 0) {
      return <Alert severity="info">정산 내역이 없습니다.</Alert>;
    }

    return (
      <>
        <Box sx={{ maxHeight: "60vh", overflowY: "auto" }}>
          <List>
            {list.map((item) => (
              <React.Fragment key={item.id}>
                <ListItem disablePadding sx={{ mb: 1 }}>
                  <Paper
                    variant="outlined"
                    sx={{ width: "100%", p: 2, borderRadius: 2 }}
                  >
                    <Stack spacing={1}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          주문 ID · {item.orderId}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          완료일 {formatDateTime(item.completeDate)}
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "1fr 1fr",
                            md: "1fr 1fr 1fr",
                          },
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            낙찰가
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {formatWon(item.winningAmount)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            정산 지급액
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {formatWon(item.finalAmount)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            차감 수수료
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {formatWon(item.charge)}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </Paper>
                </ListItem>
              </React.Fragment>
            ))}
          </List>

          {historyQuery.hasNextPage && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <Button
                variant="outlined"
                onClick={() => historyQuery.fetchNextPage()}
                disabled={historyQuery.isFetchingNextPage}
              >
                {historyQuery.isFetchingNextPage ? (
                  <CircularProgress size={18} />
                ) : (
                  "더 보기"
                )}
              </Button>
            </Box>
          )}
        </Box>
      </>
    );
  };

  const GroupDetailDialog = () => {
    const groupId = selectedGroup?.id;
    const itemsQuery = useInfiniteQuery({
      queryKey: queryKeys.settlement.groupItems(groupId ?? "unknown", pageSize),
      enabled: Boolean(groupId),
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => {
        if (!groupId) {
          throw new Error("정산 그룹 정보가 없습니다.");
        }
        const res = await settlementApi.getSettlementGroupItems(groupId, {
          page: pageParam,
          size: pageSize,
        });
        return res.data;
      },
      getNextPageParam: (lastPage) =>
        lastPage.last ? undefined : lastPage.number + 1,
      staleTime: 30_000,
    });
    const errorMessage = useMemo(() => {
      if (!itemsQuery.isError) return null;
      const err: any = itemsQuery.error;
      const isNetworkError =
        err?.code === "ERR_NETWORK" || err?.message === "Network Error";
      if (isNetworkError) {
        return "정산 상세 내역을 불러오는데 실패했습니다.";
      }
      return getErrorMessage(
        err,
        "정산 상세 내역을 불러오는데 실패했습니다."
      );
    }, [itemsQuery.error, itemsQuery.isError]);

    const items: SettlementResponse[] =
      itemsQuery.data?.pages.flatMap((p) => p.content ?? []) ?? [];

    return (
      <Dialog
        open={Boolean(selectedGroup)}
        onClose={handleCloseGroup}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>정산 상세</DialogTitle>
      <DialogContent dividers>
        {selectedGroup && (
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2, mb: 2, bgcolor: "background.paper" }}
          >
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={1}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  정산일 {formatDate(selectedGroup.settlementDate)}
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`상태 · ${selectedGroup.depositStatus ?? "-"}`}
                />
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    총액
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {formatWon(
                      selectedGroup.totalFinalAmount + selectedGroup.totalCharge
                    )}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    정산 예정액
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {formatWon(selectedGroup.totalFinalAmount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    수수료 예정액
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {formatWon(selectedGroup.totalCharge)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    총 지급액
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {formatWon(
                      selectedGroup.paidFinalAmount + selectedGroup.paidCharge
                    )}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    정산 지급액
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {formatWon(selectedGroup.paidFinalAmount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    차감 수수료
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {formatWon(selectedGroup.paidCharge)}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Paper>
        )}

          {itemsQuery.isLoading && items.length === 0 && renderSkeletonList()}
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}
          {!itemsQuery.isLoading && !errorMessage && items.length === 0 && (
            <Alert severity="info">정산 상세 내역이 없습니다.</Alert>
          )}

          {items.length > 0 && (
            <List>
              {items.map((item) => (
                <React.Fragment key={item.id}>
                  <ListItem disablePadding sx={{ mb: 1 }}>
                    <Paper
                      variant="outlined"
                      sx={{ width: "100%", p: 2, borderRadius: 2 }}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700 }}
                          >
                            주문 ID · {item.orderId}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            완료일 {formatDateTime(item.completeDate)}
                          </Typography>
                        </Stack>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "1fr",
                              sm: "1fr 1fr",
                              md: "1fr 1fr 1fr",
                            },
                            gap: 1,
                          }}
                        >
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              낙찰가
                            </Typography>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700 }}
                            >
                              {formatWon(item.winningAmount)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              정산 지급액
                            </Typography>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700 }}
                            >
                              {formatWon(item.finalAmount)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              차감 수수료
                            </Typography>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700 }}
                            >
                              {formatWon(item.charge)}
                            </Typography>
                          </Box>
                        </Box>
                      </Stack>
                    </Paper>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}

          {itemsQuery.hasNextPage && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <Button
                variant="outlined"
                onClick={() => itemsQuery.fetchNextPage()}
                disabled={itemsQuery.isFetchingNextPage}
              >
                {itemsQuery.isFetchingNextPage ? (
                  <CircularProgress size={18} />
                ) : (
                  "더 보기"
                )}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroup}>닫기</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Paper sx={{ p: 0, overflow: "hidden", borderRadius: 3 }}>
      <Box
        sx={{
          px: 2.5,
          py: 2,
          background:
            "linear-gradient(135deg, rgba(255, 247, 237, 0.9), rgba(239, 246, 255, 0.9))",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              정산 내역
            </Typography>
            <Typography variant="body2" color="text.secondary">
              총액과 지급액을 한눈에 확인하세요.
            </Typography>
          </Box>
          <ToggleButtonGroup
            size="small"
            color="primary"
            value={view}
            exclusive
            onChange={(_, v: SettlementView | null) => {
              if (!v) return;
              setView(v);
            }}
            sx={{
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
            }}
          >
            <ToggleButton value="SUMMARY">정산 합산</ToggleButton>
            <ToggleButton value="HISTORY">정산 내역</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      <Box sx={{ p: 2 }}>
        {view === "SUMMARY" ? (
          <SummaryPanel onSelect={setSelectedGroup} />
        ) : (
          <HistoryPanel />
        )}
      </Box>
      <GroupDetailDialog />
    </Paper>
  );
};
