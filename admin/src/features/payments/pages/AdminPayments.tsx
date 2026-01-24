import { adminPaymentsApi } from "@/apis/adminPaymentsApi";
import { PAGE_SIZE } from "@/shared/constant/const";
import { formatWon } from "@moreauction/utils";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type {
  DepositOrderInfo,
  DepositPaymentDetail,
  DepositOrderStatus,
  DepositPaymentStatus,
} from "@moreauction/types";

type TabKey = "payments" | "orders";
type FilterState = {
  userId: string;
  status: string;
  startFrom: string;
  startTo: string;
};

const emptyFilters: FilterState = {
  userId: "",
  status: "all",
  startFrom: "",
  startTo: "",
};

const paymentStatusOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "전체" },
  ...(["READY", "IN_PROGRESS", "CONFIRMED", "CANCELED", "FAILED"] as const).map(
    (status) => ({
      value: status,
      label: status,
    })
  ),
];

const orderStatusOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "전체" },
  ...(["PENDING", "COMPLETED", "FAILED", "CANCELLED"] as const).map(
    (status) => ({
      value: status,
      label: status,
    })
  ),
];

const AdminPayments = () => {
  const [tab, setTab] = useState<TabKey>("payments");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [paymentFilters, setPaymentFilters] = useState<FilterState>(emptyFilters);
  const [paymentDrafts, setPaymentDrafts] = useState<FilterState>(emptyFilters);
  const [orderFilters, setOrderFilters] = useState<FilterState>(emptyFilters);
  const [orderDrafts, setOrderDrafts] = useState<FilterState>(emptyFilters);

  const paymentsQuery = useQuery({
    queryKey: ["admin", "payments", paymentsPage, paymentFilters],
    queryFn: () =>
      adminPaymentsApi.getDepositPayments({
        page: paymentsPage - 1,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
        userId: paymentFilters.userId || undefined,
        status:
          paymentFilters.status === "all"
            ? undefined
            : (paymentFilters.status as DepositPaymentStatus),
        startFrom: paymentFilters.startFrom || undefined,
        startTo: paymentFilters.startTo || undefined,
      }),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });

  const ordersQuery = useQuery({
    queryKey: ["admin", "payment-orders", ordersPage, orderFilters],
    queryFn: () =>
      adminPaymentsApi.getDepositOrders({
        page: ordersPage - 1,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
        userId: orderFilters.userId || undefined,
        status:
          orderFilters.status === "all"
            ? undefined
            : (orderFilters.status as DepositOrderStatus),
        startFrom: orderFilters.startFrom || undefined,
        startTo: orderFilters.startTo || undefined,
      }),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });

  const paymentPageData = paymentsQuery.data?.data ?? null;
  const orderPageData = ordersQuery.data?.data ?? null;
  const paymentRows = paymentPageData?.content ?? [];
  const orderRows = orderPageData?.content ?? [];
  const paymentsTotalPages = paymentPageData?.totalPages ?? 1;
  const ordersTotalPages = orderPageData?.totalPages ?? 1;

  const paymentsError = useMemo(
    () => (paymentsQuery.isError ? "결제 내역을 불러오지 못했습니다." : null),
    [paymentsQuery.isError]
  );
  const ordersError = useMemo(
    () => (ordersQuery.isError ? "주문 결제 내역을 불러오지 못했습니다." : null),
    [ordersQuery.isError]
  );

  const activeDrafts = tab === "payments" ? paymentDrafts : orderDrafts;
  const setActiveDrafts = tab === "payments" ? setPaymentDrafts : setOrderDrafts;
  const applyFilters = () => {
    if (tab === "payments") {
      setPaymentFilters({ ...paymentDrafts });
      setPaymentsPage(1);
      return;
    }
    setOrderFilters({ ...orderDrafts });
    setOrdersPage(1);
  };
  const resetFilters = () => {
    if (tab === "payments") {
      setPaymentDrafts(emptyFilters);
      setPaymentFilters(emptyFilters);
      setPaymentsPage(1);
      return;
    }
    setOrderDrafts(emptyFilters);
    setOrderFilters(emptyFilters);
    setOrdersPage(1);
  };

  const renderPaymentsTable = () => (
    <Paper variant="outlined">
      {paymentsError ? (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">{paymentsError}</Alert>
        </Box>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">주문 ID</TableCell>
              <TableCell align="center">사용자</TableCell>
              <TableCell align="center">결제키</TableCell>
              <TableCell align="center">수단</TableCell>
              <TableCell align="center">금액</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="center">요청일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paymentsQuery.isLoading && paymentRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">
                    결제 내역을 불러오는 중...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : paymentRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">
                    결제 내역이 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paymentRows.map((row: DepositPaymentDetail) => (
                <TableRow key={row.orderId}>
                  <TableCell align="center">{row.orderId}</TableCell>
                  <TableCell align="center">{row.userId}</TableCell>
                  <TableCell align="center">
                    {row.paymentKey ?? "-"}
                  </TableCell>
                  <TableCell align="center">{row.method ?? "-"}</TableCell>
                  <TableCell align="center">
                    {formatWon(row.amount ?? 0)}
                  </TableCell>
                  <TableCell align="center">{row.status ?? "-"}</TableCell>
                  <TableCell align="center">
                    {row.requestedAt
                      ? new Date(row.requestedAt).toLocaleString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </Paper>
  );

  const renderOrdersTable = () => (
    <Paper variant="outlined">
      {ordersError ? (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">{ordersError}</Alert>
        </Box>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">주문 ID</TableCell>
              <TableCell align="center">사용자</TableCell>
              <TableCell align="center">총 금액</TableCell>
              <TableCell align="center">예치금</TableCell>
              <TableCell align="center">실결제</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="center">생성일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordersQuery.isLoading && orderRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">
                    주문 결제 내역을 불러오는 중...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : orderRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">
                    주문 결제 내역이 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              orderRows.map((row: DepositOrderInfo) => (
                <TableRow key={row.id}>
                  <TableCell align="center">{row.id}</TableCell>
                  <TableCell align="center">{row.userId}</TableCell>
                  <TableCell align="center">
                    {formatWon(row.amount ?? 0)}
                  </TableCell>
                  <TableCell align="center">
                    {typeof row.deposit === "number"
                      ? formatWon(row.deposit)
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    {typeof row.paidAmount === "number"
                      ? formatWon(row.paidAmount)
                      : "-"}
                  </TableCell>
                  <TableCell align="center">{row.status ?? "-"}</TableCell>
                  <TableCell align="center">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </Paper>
  );

  return (
    <Box>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          결제 관리
        </Typography>
        <Typography variant="body2" color="text.secondary">
          예치금 결제/주문 이력을 확인합니다.
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            필터
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="사용자 ID"
              size="small"
              value={activeDrafts.userId}
              onChange={(event) =>
                setActiveDrafts((prev) => ({
                  ...prev,
                  userId: event.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="상태"
              size="small"
              select
              value={activeDrafts.status}
              onChange={(event) =>
                setActiveDrafts((prev) => ({
                  ...prev,
                  status: event.target.value,
                }))
              }
              fullWidth
            >
              {(tab === "payments"
                ? paymentStatusOptions
                : orderStatusOptions
              ).map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="기간 From"
              type="datetime-local"
              size="small"
              value={activeDrafts.startFrom}
              onChange={(event) =>
                setActiveDrafts((prev) => ({
                  ...prev,
                  startFrom: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="기간 To"
              type="datetime-local"
              size="small"
              value={activeDrafts.startTo}
              onChange={(event) =>
                setActiveDrafts((prev) => ({
                  ...prev,
                  startTo: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button size="small" variant="outlined" onClick={resetFilters}>
              초기화
            </Button>
            <Button size="small" variant="contained" onClick={applyFilters}>
              필터 적용
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab value="payments" label="결제 내역" />
          <Tab value="orders" label="주문 결제" />
        </Tabs>
      </Paper>

      {tab === "payments" ? renderPaymentsTable() : renderOrdersTable()}

      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        {tab === "payments" ? (
          <Pagination
            count={Math.max(paymentsTotalPages, 1)}
            page={paymentsPage}
            onChange={(_, value) => setPaymentsPage(value)}
            color="primary"
          />
        ) : (
          <Pagination
            count={Math.max(ordersTotalPages, 1)}
            page={ordersPage}
            onChange={(_, value) => setOrdersPage(value)}
            color="primary"
          />
        )}
      </Box>
    </Box>
  );
};

export default AdminPayments;
