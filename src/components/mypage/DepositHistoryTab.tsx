import {
  Alert,
  Skeleton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Box,
  Button,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import {
  DepositType,
  type DepositHistory,
  type DepositInfo,
} from "../../types/deposit";
import { formatNumber } from "../../utils/money";

type HistoryFilter = "ALL" | "CHARGE" | "USAGE";

interface DepositHistoryTabProps {
  loading: boolean;
  error: string | null;
  history: DepositHistory[];
  balanceInfo: DepositInfo | null;
  balanceLoading: boolean;
  balanceError?: string | null;
  onOpenChargeDialog: () => void;
  onCreateAccount: () => void;
}

const typeMap = {
  CHARGE: "충전",
  USAGE: "사용",
  ALL: "예치금",
};

const isUsageType = (type: DepositType) => type === "USAGE" || type === "DEPOSIT";

const getHistoryTypeText = (type: DepositType) => {
  switch (type) {
    case "CHARGE":
      return "충전";
    case "USAGE":
      return "사용";
    case "DEPOSIT":
      return "보증금 납부";
    case "REFUND":
      return "보증금 환불";
    default:
      return String(type);
  }
};

export const DepositHistoryTab: React.FC<DepositHistoryTabProps> = ({
  loading,
  error,
  history,
  balanceInfo,
  balanceLoading,
  balanceError,
  onOpenChargeDialog,
  onCreateAccount,
}) => {
  const [filter, setFilter] = useState<HistoryFilter>("ALL");

  const filtered = useMemo(() => {
    if (filter === "ALL") return history;
    if (filter === "CHARGE") return history.filter((h) => h.type === "CHARGE");
    return history.filter((h) => isUsageType(h.type));
  }, [history, filter]);

  const showSkeleton = loading && !error && history.length === 0;

  // 에러가 있는 경우에는 목록 대신 에러만 표시
  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          예치금 내역
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        예치금 내역
      </Typography>

      <Box
        sx={{
          mb: 2,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
        }}
      >
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            현재 잔액
          </Typography>
          {balanceLoading && !balanceInfo ? (
            <Skeleton width={120} />
          ) : (
            <Typography variant="h5" fontWeight={700}>
              {formatNumber(balanceInfo?.balance ?? 0)}원
            </Typography>
          )}
          {balanceError && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              예치금 잔액을 불러오지 못했습니다.
            </Alert>
          )}
          {!balanceLoading && !balanceInfo && !balanceError && (
            <Alert
              severity="info"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={onCreateAccount}
                >
                  계좌 생성
                </Button>
              }
              sx={{ mt: 1 }}
            >
              아직 예치금 계좌가 없습니다. 계좌를 생성해 주세요.
            </Alert>
          )}
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={onOpenChargeDialog}
          disabled={balanceLoading || !balanceInfo}
        >
          예치금 충전
        </Button>
      </Box>

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

      {showSkeleton ? (
        <List>
          {Array.from({ length: 3 }).map((_, idx) => (
            <React.Fragment key={idx}>
              <ListItem>
                <ListItemText
                  primary={<Skeleton width="50%" />}
                  secondary={<Skeleton width="80%" />}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      ) : filtered.length === 0 ? (
        <Alert severity="info">{typeMap[filter]} 내역이 없습니다.</Alert>
      ) : (
        <List>
          {filtered.map((hst) => (
            <React.Fragment key={hst.id}>
              <ListItem>
                <ListItemText
                  primary={`${new Date(hst.createdAt).toLocaleString()}`}
                  secondary={`${
                    getHistoryTypeText(hst.type)
                  } 금액: ${formatNumber(hst.amount)}원 (잔액: ${formatNumber(hst.balance)}원)`}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};
