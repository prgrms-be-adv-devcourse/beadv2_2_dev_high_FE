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
import React, { useEffect, useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  DepositType,
  type DepositHistory,
  type PagedDepositHistoryResponse,
} from "@moreauction/types";
import { formatNumber } from "@moreauction/utils";
import { depositApi } from "@/apis/depositApi";
import { DepositChargeDialog } from "@/features/mypage/components/DepositChargeDialog";
import { requestTossPayment } from "@/shared/utils/requestTossPayment";
import { useAuth } from "@moreauction/auth";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

type HistoryFilter = "ALL" | DepositType;

const getHistoryTypeText = (type: DepositType) => {
  switch (type) {
    case DepositType.CHARGE:
      return "충전";
    case DepositType.USAGE:
      return "사용";
    case DepositType.DEPOSIT:
      return "보증금 납부";
    case DepositType.REFUND:
      return "보증금 환불";
    case DepositType.PAYMENT:
      return "결제";
    default:
      return String(type);
  }
};

export const DepositHistoryTab: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openChargeDialog, setOpenChargeDialog] = useState(false);
  const [chargeLoading, setChargeLoading] = useState(false);
  const [chargeAmount, setChargeAmount] = useState<string>("");
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>(() => {
    const stored = sessionStorage.getItem("depositHistoryFilter");
    return (stored as HistoryFilter) ?? "ALL";
  });

  const depositInfoQuery = useQuery({
    queryKey: queryKeys.deposit.account(),
    queryFn: () => depositApi.getAccount(),
    staleTime: 30_000,
  });

  const depositHistoryQuery = useInfiniteQuery<
    PagedDepositHistoryResponse,
    Error
  >({
    queryKey: queryKeys.deposit.history(filter),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await depositApi.getDepositHistories({
        page: pageParam as number,
        size: 20,
        type: filter === "ALL" ? undefined : filter,
      });
      return response.data;
    },
    initialPageParam: 0,
    staleTime: 30_000,

    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : (lastPage.number ?? 0) + 1,
  });

  const balanceInfo = depositInfoQuery.data?.data ?? null;
  const balanceLoading = depositInfoQuery.isLoading;
  const balanceError = depositInfoQuery.isError
    ? getErrorMessage(
        depositInfoQuery.error,
        "예치금 잔액을 불러오지 못했습니다."
      )
    : null;
  const history: DepositHistory[] =
    depositHistoryQuery.data?.pages.flatMap((page) => page.content ?? []) ?? [];
  const loading = depositHistoryQuery.isLoading;
  const loadingMore = depositHistoryQuery.isFetchingNextPage;
  const hasMore = !!depositHistoryQuery.hasNextPage;
  const historyError = depositHistoryQuery.isError
    ? getErrorMessage(
        depositHistoryQuery.error,
        "예치금 내역을 불러오지 못했습니다."
      )
    : null;
  const filtered = history;
  const filterLabel = filter === "ALL" ? "예치금" : getHistoryTypeText(filter);

  useEffect(() => {
    sessionStorage.setItem("depositHistoryFilter", filter);
  }, [filter]);

  const showSkeleton = loading && !historyError && history.length === 0;
  const canLoadMore = hasMore && !loadingMore;

  const handleCloseChargeDialog = () => {
    setOpenChargeDialog(false);
    setChargeAmount("");
    setChargeError(null);
  };

  const handleCreateAccount = async () => {
    try {
      const res = await depositApi.createAccount(user?.userId);
      if (res?.data) {
        alert("예치금 계좌가 생성되었습니다.");
        queryClient.setQueryData(queryKeys.deposit.account(), res);
        if (typeof res.data.balance === "number") {
          queryClient.setQueryData(
            queryKeys.deposit.balance(),
            res.data.balance
          );
          localStorage.setItem("depositBalance", String(res.data.balance));
        }
        await queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.historyAll(),
        });
      }
    } catch (err: any) {
      alert("계좌 생성 실패: " + (err?.data?.message ?? "알 수 없는 오류"));
    }
  };

  const handleChargeSubmit = async () => {
    if (chargeLoading) return;
    const amount = parseInt(chargeAmount, 10);

    if (isNaN(amount) || amount < 1000 || amount % 100 !== 0) {
      setChargeError("충전은 100원 단위로 최소 1,000원부터 가능합니다.");
      return;
    }

    setChargeLoading(true);
    setChargeError(null);

    try {
      const depositOrder = await depositApi.createDepositOrder(amount);

      if (depositOrder?.data?.id) {
        requestTossPayment(depositOrder.data.id, depositOrder.data.amount);
        handleCloseChargeDialog();
      } else {
        setChargeError("주문 생성에 실패했습니다.");
      }
    } catch (err: any) {
      console.error("예치금 충전 주문 생성 실패:", err);
      setChargeError("예치금 충전 주문 생성 중 오류가 발생했습니다.");
    } finally {
      setChargeLoading(false);
    }
  };

  // 에러가 있는 경우에는 목록 대신 에러만 표시
  if (historyError) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          예치금 내역
        </Typography>
        <Alert severity="error">{historyError}</Alert>
      </Paper>
    );
  }

  return (
    <>
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
          {balanceError ? (
            <Alert
              severity="warning"
              sx={{ width: "100%", alignItems: "flex-start" }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                예치금 계좌 정보를 불러오지 못했습니다.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                잠시 후 다시 시도해 주세요. 문제가 반복되면 고객센터로 문의해
                주세요.
              </Typography>
            </Alert>
          ) : (
            <>
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
                {!balanceLoading && !balanceInfo && (
                  <Alert
                    severity="info"
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={handleCreateAccount}
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
                onClick={() => setOpenChargeDialog(true)}
                disabled={balanceLoading || !balanceInfo}
              >
                예치금 충전
              </Button>
            </>
          )}
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
          <ToggleButton value={DepositType.CHARGE}>충전</ToggleButton>
          <ToggleButton value={DepositType.USAGE}>사용</ToggleButton>
          <ToggleButton value={DepositType.DEPOSIT}>보증금</ToggleButton>
          <ToggleButton value={DepositType.REFUND}>환불</ToggleButton>
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
          <Alert severity="info">{filterLabel} 내역이 없습니다.</Alert>
        ) : (
          <Box
            sx={{ maxHeight: 480, overflowY: "auto" }}
            onScroll={(event) => {
              if (!canLoadMore) return;
              const target = event.currentTarget;
              const remaining =
                target.scrollHeight - target.scrollTop - target.clientHeight;
              if (remaining < 120) {
                depositHistoryQuery.fetchNextPage();
              }
            }}
          >
            <List>
              {filtered.map((hst) => (
                <React.Fragment key={hst.id}>
                  <ListItem>
                    <ListItemText
                      primary={`${new Date(hst.createdAt).toLocaleString()}`}
                      secondary={`${getHistoryTypeText(
                        hst.type
                      )} 금액: ${formatNumber(
                        hst.amount
                      )}원 (잔액: ${formatNumber(hst.balance)}원)`}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
              {loadingMore && (
                <>
                  {Array.from({ length: 2 }).map((_, idx) => (
                    <React.Fragment key={`loading-${idx}`}>
                      <ListItem>
                        <ListItemText
                          primary={<Skeleton width="50%" />}
                          secondary={<Skeleton width="80%" />}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </>
              )}
            </List>
          </Box>
        )}
      </Paper>
      <DepositChargeDialog
        open={openChargeDialog}
        loading={chargeLoading}
        amount={chargeAmount}
        errorText={chargeError}
        onChangeAmount={setChargeAmount}
        onClose={handleCloseChargeDialog}
        onSubmit={handleChargeSubmit}
      />
    </>
  );
};
