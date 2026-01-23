import { adminAuctionApi } from "@/apis/adminAuctionApi";
import {
  AuctionStatus,
  type AuctionDetailResponse,
  type PagedApiResponse,
} from "@moreauction/types";
import { formatDate, formatWon, getAuctionStatusText } from "@moreauction/utils";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import AuctionCreateDialog from "../dialog/AuctionCreateDialog";
import AuctionDeleteDialog from "../dialog/AuctionDeleteDialog";
import ProductInfoDialog from "../dialog/ProductInfoDialog";
import AuctionDetailDialog from "../dialog/AuctionDetailDialog";
import AuctionEditDialog from "../dialog/AuctionEditDialog";
import { PAGE_SIZE } from "@/shared/constant/const";

const statusOptions = [
  { value: "all", label: "전체" },
  ...Object.values(AuctionStatus).map((status) => ({
    value: status,
    label: getAuctionStatusText(status),
  })),
];

const deletedOptions = [
  { value: "all", label: "삭제 여부 전체" },
  { value: "N", label: "삭제 안됨" },
  { value: "Y", label: "삭제됨" },
];

const DELETE_TARGETS: AuctionStatus[] = [
  AuctionStatus.READY,
  AuctionStatus.CANCELLED,
  AuctionStatus.FAILED,
];

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
  const [deleteTarget, setDeleteTarget] =
    useState<AuctionDetailResponse | null>(null);
  const [productDetail, setProductDetail] = useState<{
    id?: string;
    name?: string;
    sellerId?: string;
    fileGroupId?: string | number | null;
  } | null>(null);
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] =
    useState<AuctionDetailResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTarget, setEditTarget] =
    useState<AuctionDetailResponse | null>(null);
  const [editOpen, setEditOpen] = useState(false);

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
        startFrom: formatDate(appliedFilters.startFrom),
        startTo: formatDate(appliedFilters.startTo),
        endFrom: formatDate(appliedFilters.endFrom),
        endTo: formatDate(appliedFilters.endTo),
      }),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });

  const [createAuctionOpen, setCreateAuctionOpen] = useState(false);
  const [startNowPendingId, setStartNowPendingId] = useState<string | null>(
    null
  );

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
    onMutate: async (auctionId) => {
      setStartNowPendingId(auctionId);
      await queryClient.cancelQueries({ queryKey: ["admin", "auctions"] });
      const previousQueries = queryClient.getQueriesData<
        PagedApiResponse<AuctionDetailResponse>
      >({ queryKey: ["admin", "auctions"] });
      updateAuctionStatus(auctionId, AuctionStatus.IN_PROGRESS);
      return { previousQueries };
    },
    onSuccess: (_response, auctionId) => {
      updateAuctionStatus(auctionId, AuctionStatus.IN_PROGRESS);
      queryClient.invalidateQueries({
        queryKey: ["admin", "auctions"],
        refetchType: "none",
      });
    },
    onError: (_error, _auctionId, context) => {
      if (!context?.previousQueries) return;
      context.previousQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      setStartNowPendingId(null);
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

  const deleteMutation = useMutation({
    mutationFn: (auctionId: string) => adminAuctionApi.deleteAuction(auctionId),
    onSuccess: (_response, auctionId) => {
      queryClient.setQueryData(
        [
          "admin",
          "auctions",
          page,
          statusFilter,
          deletedFilter,
          appliedFilters,
        ],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            content: oldData.content.map((auction: AuctionDetailResponse) =>
              auction.id === auctionId
                ? { ...auction, deletedYn: true }
                : auction
            ),
          };
        }
      );
      setDeleteTarget(null);
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

  const isNotDeleted = (auction: AuctionDetailResponse) =>
    !auction.deletedYn || auction.deletedYn === "N";
  const isDeleted = (auction: AuctionDetailResponse) =>
    auction.deletedYn === true || auction.deletedYn === "Y";

  const isMutating =
    startNowMutation.isPending ||
    endNowMutation.isPending ||
    deleteMutation.isPending;
  // (삭제 mutation도 있으면 여기에 추가)  || deleteMutation.isPending

  // 즉시 시작: READY && 삭제 아님 && 뮤테이션 중 아님
  const canStartNow = (auction: AuctionDetailResponse) =>
    auction.status === AuctionStatus.READY &&
    isNotDeleted(auction) &&
    !isMutating &&
    startNowPendingId !== auction.id;

  // 즉시 종료: IN_PROGRESS && 삭제 아님 && 뮤테이션 중 아님
  const canEndNow = (auction: AuctionDetailResponse) =>
    auction.status === AuctionStatus.IN_PROGRESS &&
    isNotDeleted(auction) &&
    !isMutating;

  // 삭제: (DELETE_TARGETS에 포함된 상태일 때) && 삭제 아님 && 삭제 실행 중 아님
  // => 네 문장 기준 그대로면 "포함된 상태일 때"가 삭제 가능 조건
  const canDelete = (auction: AuctionDetailResponse) =>
    DELETE_TARGETS.includes(auction.status) &&
    isNotDeleted(auction) &&
    !isMutating;

  const getDisplayBid = (auction: AuctionDetailResponse) => {
    const currentBid = auction.currentBid ?? 0;
    if (currentBid > 0) return currentBid;
    return auction.startBid ?? 0;
  };

  const handleEditOpen = (auction: AuctionDetailResponse) => {
    setEditTarget(auction);
    setEditOpen(true);
  };
  const handleEditClose = () => {
    setEditOpen(false);
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
          <Button
            variant="contained"
            onClick={() => setCreateAuctionOpen(true)}
          >
            경매 등록
          </Button>
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
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            필터
          </Typography>
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
            <Typography variant="body2" color="text.secondary"></Typography>
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">경매 ID</TableCell>
              <TableCell align="center">상품명</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="center">현재가</TableCell>
              <TableCell align="center">종료시간</TableCell>
              <TableCell align="center">삭제 상태</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody
            sx={{
              "& tr:last-child td, & tr:last-child th": { borderBottom: 0 },
            }}
          >
            {auctionsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={11}>
                  <Typography color="text.secondary">
                    경매 목록을 불러오는 중...
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {errorMessage && (
              <TableRow>
                <TableCell colSpan={11}>
                  <Alert severity="error">{errorMessage}</Alert>
                </TableCell>
              </TableRow>
            )}
            {auctions.map((auction: AuctionDetailResponse) => (
              <TableRow
                key={auction.id}
                hover
                sx={{ height: 56, cursor: "pointer" }}
                onClick={() => {
                  setDetailTarget(auction);
                  setDetailOpen(true);
                }}
              >
                <TableCell align="center">{auction.id}</TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      const fileGroupId =
                        auction.productFileGroupId ?? auction.fileGroupId ?? null;
                      setProductDetail({
                        id: auction.productId,
                        name: auction.productName ?? "-",
                        sellerId: auction.sellerId ?? "-",
                        fileGroupId,
                      });
                      setProductDetailOpen(true);
                    }}
                  >
                    {auction.productName ?? "-"}
                  </Button>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={`상태 코드: ${auction.status ?? "-"}`}>
                    <Chip
                      size="small"
                      label={
                        isDeleted(auction)
                          ? "삭제됨"
                          : getAuctionStatusText(auction.status)
                      }
                      color={isDeleted(auction) ? "default" : "primary"}
                      variant={isDeleted(auction) ? "outlined" : "filled"}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  {formatWon(getDisplayBid(auction))}
                </TableCell>
                <TableCell align="center">
                  <Chip size="small" label={formatDate(auction.auctionEndAt)} />
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
                      disabled={!canStartNow(auction)}
                      onClick={(event) => {
                        event.stopPropagation();
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
                      disabled={!canEndNow(auction)}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!window.confirm("경매를 즉시 종료할까요?")) return;
                        endNowMutation.mutate(auction.id);
                      }}
                    >
                      즉시 종료
                    </Button>
                    <Divider orientation="vertical" flexItem />
                    <Button
                      size="small"
                      color="info"
                      disabled={!canStartNow(auction)}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEditOpen(auction);
                      }}
                    >
                      수정
                    </Button>
                    <Divider orientation="vertical" flexItem />
                    <Button
                      size="small"
                      color="error"
                      disabled={!canDelete(auction)}
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget(auction);
                      }}
                    >
                      삭제
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {showEmpty && (
              <TableRow>
                <TableCell colSpan={11}>
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

      <AuctionDeleteDialog
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        deleteMutation={deleteMutation}
      />

      <ProductInfoDialog
        open={productDetailOpen}
        product={productDetail}
        onClose={() => setProductDetailOpen(false)}
        onExited={() => setProductDetail(null)}
      />
      <AuctionDetailDialog
        open={detailOpen}
        auction={detailTarget}
        onClose={() => setDetailOpen(false)}
        onExited={() => setDetailTarget(null)}
      />
      <AuctionEditDialog
        open={editOpen}
        auction={editTarget}
        onClose={handleEditClose}
        onExited={() => setEditTarget(null)}
      />
      <AuctionCreateDialog
        createAuctionOpen={createAuctionOpen}
        setCreateAuctionOpen={setCreateAuctionOpen}
      />
    </Box>
  );
};

export default AdminAuctions;
