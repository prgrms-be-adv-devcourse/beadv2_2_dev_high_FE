import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { settlementApi } from "../../apis/settlementApi";
import type { SettlementResponse, SettlementSummary } from "@moreauction/types";
import { formatNumber, formatWon } from "@moreauction/utils";

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
  const [view, setView] = useState<SettlementView>("SUMMARY");

  const pageSize = 20;

  const summaryQuery = useInfiniteQuery({
    queryKey: ["settlement", "summary", pageSize],
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
    enabled: view === "SUMMARY",
    staleTime: 30_000,
  });

  const historyQuery = useInfiniteQuery({
    queryKey: ["settlement", "history", pageSize],
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
    enabled: view === "HISTORY",
    staleTime: 30_000,
  });

  const errorMessage = useMemo(() => {
    const activeQuery = view === "SUMMARY" ? summaryQuery : historyQuery;
    if (!activeQuery.isError) return null;
    const err: any = activeQuery.error;
    const isNetworkError =
      err?.code === "ERR_NETWORK" || err?.message === "Network Error";
    return (
      err?.data?.message ??
      (!isNetworkError ? err?.message : null) ??
      "정산 내역을 불러오는데 실패했습니다."
    );
  }, [
    historyQuery.error,
    historyQuery.isError,
    summaryQuery.error,
    summaryQuery.isError,
    view,
  ]);

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

  const renderSummary = () => {
    const list: SettlementSummary[] =
      summaryQuery.data?.pages.flatMap((p) => p.content ?? []) ?? [];

    if (summaryQuery.isLoading && list.length === 0) return renderSkeletonList();
    if (list.length === 0) {
      if (summaryQuery.isError) return null;
      return <Alert severity="info">정산 내역이 없습니다.</Alert>;
    }

    return (
      <>
        <Box sx={{ maxHeight: "60vh", overflowY: "auto" }}>
          <List>
            {list.map((item) => (
              <React.Fragment key={`${item.sellerId}-${item.date ?? "all"}`}>
                <ListItem>
                  <ListItemText
                    primary={`${item.date ? formatDate(item.date) : "전체"} · ${formatNumber(item.count)}건`}
                    secondary={`낙찰합계: ${formatWon(item.totalWinningAmount)} · 수수료합계: ${formatWon(item.totalCharge)} · 정산합계: ${formatWon(item.totalFinalAmount)}`}
                  />
                </ListItem>
                <Divider />
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

  const renderHistory = () => {
    const list: SettlementResponse[] =
      historyQuery.data?.pages.flatMap((p) => p.content ?? []) ?? [];

    if (historyQuery.isLoading && list.length === 0) return renderSkeletonList();
    if (list.length === 0) {
      if (historyQuery.isError) return null;
      return <Alert severity="info">정산 내역이 없습니다.</Alert>;
    }

    return (
      <>
        <Box sx={{ maxHeight: "60vh", overflowY: "auto" }}>
          <List>
            {list.map((item) => (
              <React.Fragment key={item.id}>
                <ListItem>
                  <ListItemText
                    primary={`${formatDate(item.dueDate)} · 주문 ID: ${item.orderId}`}
                    secondary={[
                      `낙찰가: ${formatWon(item.winningAmount)}`,
                      `수수료: ${formatWon(item.charge)}`,
                      `정산금: ${formatWon(item.finalAmount)}`,
                      item.completeDate
                        ? `완료일: ${formatDateTime(item.completeDate)}`
                        : undefined,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </ListItem>
                <Divider />
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

  return (
    <Paper sx={{ p: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">정산</Typography>
        <ToggleButtonGroup
          size="small"
          color="primary"
          value={view}
          exclusive
          onChange={(_, v: SettlementView | null) => {
            if (!v) return;
            setView(v);
          }}
        >
          <ToggleButton value="SUMMARY">합산 기록</ToggleButton>
          <ToggleButton value="HISTORY">단건 기록(목록)</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Box>{view === "SUMMARY" ? renderSummary() : renderHistory()}</Box>
    </Paper>
  );
};
