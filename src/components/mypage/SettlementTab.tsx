import {
  Alert,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { settlementApi } from "../../apis/settlementApi";
import type { SettlementResponse, SettlementSummary } from "../../types/settlement";

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

  const [summaryPage, setSummaryPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const pageSize = 20;

  const summaryQuery = useQuery({
    queryKey: ["settlement", "summary", summaryPage, pageSize],
    queryFn: async () => {
      const res = await settlementApi.getSettlementSummary({
        page: summaryPage,
        size: pageSize,
      });
      return res.data;
    },
    enabled: view === "SUMMARY",
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const historyQuery = useQuery({
    queryKey: ["settlement", "history", historyPage, pageSize],
    queryFn: async () => {
      const res = await settlementApi.getSettlementHistory({
        page: historyPage,
        size: pageSize,
      });
      return res.data;
    },
    enabled: view === "HISTORY",
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const errorMessage = useMemo(() => {
    const err: any = summaryQuery.error ?? historyQuery.error;
    if (!err) return null;
    return err?.data?.message ?? err?.message ?? "정산 내역 조회에 실패했습니다.";
  }, [historyQuery.error, summaryQuery.error]);

  const isLoading =
    view === "SUMMARY" ? summaryQuery.isLoading : historyQuery.isLoading;

  const summaryPageData = summaryQuery.data;
  const historyPageData = historyQuery.data;

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
    const list: SettlementSummary[] = summaryPageData?.content ?? [];

    if (isLoading && list.length === 0) return renderSkeletonList();
    if (list.length === 0) {
      return <Alert severity="info">합산 정산 기록이 없습니다.</Alert>;
    }

    return (
      <>
        <List>
          {list.map((item) => (
            <React.Fragment key={`${item.sellerId}-${item.date ?? "all"}`}>
              <ListItem>
                <ListItemText
                  primary={`${item.date ? formatDate(item.date) : "전체"} · ${item.count.toLocaleString()}건`}
                  secondary={`낙찰합계: ${item.totalWinningAmount.toLocaleString()}원 · 수수료합계: ${item.totalCharge.toLocaleString()}원 · 정산합계: ${item.totalFinalAmount.toLocaleString()}원`}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>

        {(summaryPageData?.totalPages ?? 0) > 1 && (
          <Pagination
            count={summaryPageData?.totalPages ?? 0}
            page={summaryPage + 1}
            onChange={(_, next) => setSummaryPage(next - 1)}
            sx={{ display: "flex", justifyContent: "center", mt: 2 }}
          />
        )}
      </>
    );
  };

  const renderHistory = () => {
    const list: SettlementResponse[] = historyPageData?.content ?? [];

    if (isLoading && list.length === 0) return renderSkeletonList();
    if (list.length === 0) {
      return <Alert severity="info">단건 정산 기록이 없습니다.</Alert>;
    }

    return (
      <>
        <List>
          {list.map((item) => (
            <React.Fragment key={item.id}>
              <ListItem>
                <ListItemText
                  primary={`${formatDate(item.dueDate)} · 주문 ID: ${item.orderId}`}
                  secondary={[
                    `낙찰가: ${item.winningAmount.toLocaleString()}원`,
                    `수수료: ${item.charge.toLocaleString()}원`,
                    `정산금: ${item.finalAmount.toLocaleString()}원`,
                    item.completeDate ? `완료일: ${formatDateTime(item.completeDate)}` : undefined,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>

        {(historyPageData?.totalPages ?? 0) > 1 && (
          <Pagination
            count={historyPageData?.totalPages ?? 0}
            page={historyPage + 1}
            onChange={(_, next) => setHistoryPage(next - 1)}
            sx={{ display: "flex", justifyContent: "center", mt: 2 }}
          />
        )}
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

      {errorMessage ? (
        <Alert severity="error">{errorMessage}</Alert>
      ) : (
        <Box>{view === "SUMMARY" ? renderSummary() : renderHistory()}</Box>
      )}
    </Paper>
  );
};
