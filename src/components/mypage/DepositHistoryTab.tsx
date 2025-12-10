import {
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import type { DepositHistory, DepositType } from "../../types/deposit";

type HistoryFilter = "ALL" | "CHARGE" | "USAGE";

interface DepositHistoryTabProps {
  loading: boolean;
  error: string | null;
  history: DepositHistory[];
}

export const DepositHistoryTab: React.FC<DepositHistoryTabProps> = ({
  loading,
  error,
  history,
}) => {
  const [filter, setFilter] = useState<HistoryFilter>("ALL");

  const filtered = useMemo(() => {
    if (filter === "ALL") return history;
    const type: DepositType = filter === "CHARGE" ? "CHARGE" : "USAGE";
    return history.filter((h) => h.type === type);
  }, [history, filter]);

  return (
    <Paper sx={{ p: 2 }}>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            예치금 내역
          </Typography>

          <ToggleButtonGroup
            size="small"
            color="primary"
            value={filter}
            exclusive
            onChange={(_, v: HistoryFilter | null) => {
              if (!v) return;
              setFilter(v);
            }}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="ALL">전체</ToggleButton>
            <ToggleButton value="CHARGE">충전</ToggleButton>
            <ToggleButton value="USAGE">사용</ToggleButton>
          </ToggleButtonGroup>

          {filtered.length === 0 ? (
            <Typography>내역이 없습니다.</Typography>
          ) : (
            <List>
              {filtered.map((hst) => (
                <React.Fragment key={hst.id}>
                  <ListItem>
                    <ListItemText
                      primary={`${new Date(hst.createdAt).toLocaleString()}`}
                      secondary={`${hst.type === "CHARGE" ? "충전" : "사용"} 금액: ${hst.amount.toLocaleString()}원 (잔액: ${hst.balance.toLocaleString()}원)`}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </>
      )}
    </Paper>
  );
};

