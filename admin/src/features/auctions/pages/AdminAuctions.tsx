import {
  Box,
  Button,
  Chip,
  Divider,
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
  AuctionStatus,
  type AuctionDetailResponse,
  type PagedApiResponse,
} from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import { adminAuctionApi } from "@/apis/adminAuctionApi";

const PAGE_SIZE = 10;

const statusOptions = [
  { value: "all", label: "전체" },
  ...Object.values(AuctionStatus).map((status) => ({
    value: status,
    label: status,
  })),
];

const deletedOptions = [
  { value: "all", label: "삭제 여부 전체" },
  { value: "N", label: "삭제 안됨" },
  { value: "Y", label: "삭제됨" },
];

const toOffsetDateTime = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

const formatDateTime = (value?: string | null) => {
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

const AdminAuctions = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletedFilter, setDeletedFilter] = useState("all");
  const [filters, setFilters] = useState({
    productId: "",
    sellerId: "",
    minBid: "",
    maxBid: "",
    startFrom: "",
    startTo: "",
    endFrom: "",
    endTo: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    productId: "",
    sellerId: "",
    minBid: "",
    maxBid: "",
    startFrom: "",
    startTo: "",
    endFrom: "",
    endTo: "",
  });

  const auctionsQuery = useQuery({
    queryKey: [
      "admin",
      "auctions",
      page,
      statusFilter,
      deletedFilter,
      appliedFilters,
    ],
    queryFn: () =>
      adminAuctionApi.getAuctions({
        page: page - 1,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
        status:
          statusFilter === "all" ? undefined : (statusFilter as AuctionStatus),
        deletedYn:
          deletedFilter === "all" ? undefined : (deletedFilter as "Y" | "N"),
        productId: appliedFilters.productId || undefined,
        sellerId: appliedFilters.sellerId || undefined,
        minBid: appliedFilters.minBid
          ? Number(appliedFilters.minBid)
          : undefined,
        maxBid: appliedFilters.maxBid
          ? Number(appliedFilters.maxBid)
          : undefined,
        startFrom: toOffsetDateTime(appliedFilters.startFrom),
        startTo: toOffsetDateTime(appliedFilters.startTo),
        endFrom: toOffsetDateTime(appliedFilters.endFrom),
        endTo: toOffsetDateTime(appliedFilters.endTo),
      }),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });

  const updateAuctionStatus = (auctionId: string, status: AuctionStatus) => {
    queryClient.setQueriesData<PagedApiResponse<AuctionDetailResponse>>(
      { queryKey: ["admin", "auctions"] },
      (cached) => {
        if (!cached) return cached;
        const nextContent = cached.content.map((auction) =>
          auction.id === auctionId ? { ...auction, status } : auction
        );
        return { ...cached, content: nextContent };
      }
    );
  };

  const startNowMutation = useMutation({
    mutationFn: (auctionId: string) => adminAuctionApi.startNow(auctionId),
    onSuccess: (_response, auctionId) => {
      updateAuctionStatus(auctionId, AuctionStatus.IN_PROGRESS);
      queryClient.invalidateQueries({
        queryKey: ["admin", "auctions"],
        refetchType: "none",
      });
    },
  });

  const endNowMutation = useMutation({
    mutationFn: (auctionId: string) => adminAuctionApi.endNow(auctionId),
    onSuccess: (_response, auctionId) => {
      updateAuctionStatus(auctionId, AuctionStatus.COMPLETED);
      queryClient.invalidateQueries({
        queryKey: ["admin", "auctions"],
        refetchType: "none",
      });
    },
  });

  const totalPages = auctionsQuery.data?.totalPages ?? 1;
  const auctions = auctionsQuery.data?.content ?? [];

  const showEmpty =
    !auctionsQuery.isLoading && !auctionsQuery.isError && auctions.length === 0;
  const errorMessage = useMemo(() => {
    if (!auctionsQuery.isError) return null;
    return "경매 목록을 불러오지 못했습니다.";
  }, [auctionsQuery.isError]);

  const canStartNow = (status: AuctionStatus) =>
    status === AuctionStatus.READY;
  const canEndNow = (status: AuctionStatus) =>
    status === AuctionStatus.IN_PROGRESS;
  const getDisplayBid = (auction: AuctionDetailResponse) => {
    const currentBid = auction.currentBid ?? 0;
    if (currentBid > 0) return currentBid;
    return auction.startBid ?? 0;
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
            경매 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            전체 경매 현황을 조회합니다.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
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
          <Select
            size="small"
            value={deletedFilter}
            onChange={(event) => {
              setPage(1);
              setDeletedFilter(event.target.value);
            }}
          >
            {deletedOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </Stack>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="상품 ID"
              size="small"
              value={filters.productId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  productId: event.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="판매자 ID"
              size="small"
              value={filters.sellerId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  sellerId: event.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="가격 최소(현재가)"
              size="small"
              type="number"
              value={filters.minBid}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, minBid: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="가격 최대(현재가)"
              size="small"
              type="number"
              value={filters.maxBid}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, maxBid: event.target.value }))
              }
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="시작 시간 From"
              type="datetime-local"
              size="small"
              value={filters.startFrom}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  startFrom: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="시작 시간 To"
              type="datetime-local"
              size="small"
              value={filters.startTo}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  startTo: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="종료 시간 From"
              type="datetime-local"
              size="small"
              value={filters.endFrom}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  endFrom: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="종료 시간 To"
              type="datetime-local"
              size="small"
              value={filters.endTo}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  endTo: event.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Typography variant="body2" color="text.secondary">
              시간 필터는 ISO DateTime으로 전송됩니다.
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const empty = {
                  productId: "",
                  sellerId: "",
                  minBid: "",
                  maxBid: "",
                  startFrom: "",
                  startTo: "",
                  endFrom: "",
                  endTo: "",
                };
                setFilters(empty);
                setAppliedFilters(empty);
                setPage(1);
              }}
            >
              초기화
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                setAppliedFilters({ ...filters });
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
              <TableCell align="center">경매 ID</TableCell>
              <TableCell align="center">상품명</TableCell>
              <TableCell align="center">판매자 ID</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="center">시작가</TableCell>
              <TableCell align="center">현재가</TableCell>
              <TableCell align="center">시작일</TableCell>
              <TableCell align="center">종료일</TableCell>
              <TableCell align="center">삭제</TableCell>
              <TableCell align="center">즉시 제어</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {auctions.map((auction: AuctionDetailResponse) => (
              <TableRow key={auction.id} hover>
                <TableCell align="center">{auction.id}</TableCell>
                <TableCell align="center">
                  {auction.productName ?? "-"}
                </TableCell>
                <TableCell align="center">{auction.sellerId}</TableCell>
                <TableCell align="center">
                  <Chip size="small" label={auction.status} />
                </TableCell>
                <TableCell align="center">
                  {formatWon(auction.startBid)}
                </TableCell>
                <TableCell align="center">
                  {formatWon(getDisplayBid(auction))}
                </TableCell>
                <TableCell align="center">
                  {formatDateTime(auction.auctionStartAt)}
                </TableCell>
                <TableCell align="center">
                  {formatDateTime(auction.auctionEndAt)}
                </TableCell>
                <TableCell align="center">
                  {(() => {
                    const deletedFlag =
                      auction.deletedYn === true || auction.deletedYn === "Y";
                    return (
                      <Chip
                        size="small"
                        label={deletedFlag ? "Y" : "N"}
                        color={deletedFlag ? "default" : "success"}
                        variant={deletedFlag ? "outlined" : "filled"}
                      />
                    );
                  })()}
                </TableCell>
                <TableCell align="center">
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={
                        !canStartNow(auction.status) ||
                        startNowMutation.isPending ||
                        endNowMutation.isPending
                      }
                      onClick={() => {
                        if (!window.confirm("경매를 즉시 시작할까요?")) return;
                        startNowMutation.mutate(auction.id);
                      }}
                    >
                      즉시 시작
                    </Button>
                    <Divider orientation="vertical" flexItem />
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      disabled={
                        !canEndNow(auction.status) ||
                        startNowMutation.isPending ||
                        endNowMutation.isPending
                      }
                      onClick={() => {
                        if (!window.confirm("경매를 즉시 종료할까요?")) return;
                        endNowMutation.mutate(auction.id);
                      }}
                    >
                      즉시 종료
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {showEmpty && (
              <TableRow>
                <TableCell colSpan={10}>
                  <Typography color="text.secondary">
                    조건에 해당하는 경매가 없습니다.
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

export default AdminAuctions;
