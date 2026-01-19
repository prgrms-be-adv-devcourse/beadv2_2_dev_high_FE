import { adminAuctionApi } from "@/apis/adminAuctionApi";
import { adminOrderApi } from "@/apis/adminOrderApi";
import { AuctionStatus, type AuctionDetailResponse } from "@moreauction/types";
import { formatDate, formatWon } from "@moreauction/utils";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  Chip,
  Button,
  Pagination,
  DialogActions,
} from "@mui/material";
import {
  useQuery,
  keepPreviousData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import React, { useMemo, useState } from "react";

const COMPLETED_AUCTION_PAGE_SIZE = 5;

const OrderCreateDialog = ({ createOrderOpen, setCreateOrderOpen }: any) => {
  const queryClient = useQueryClient();
  const [completedPage, setCompletedPage] = useState(1);

  const completedAuctionsQuery = useQuery({
    queryKey: ["admin", "auctions", "completed", completedPage],
    queryFn: () =>
      adminAuctionApi.getAuctions({
        page: completedPage - 1,
        size: COMPLETED_AUCTION_PAGE_SIZE,
        sort: "auctionEndAt,desc",
        status: AuctionStatus.COMPLETED,
      }),
    enabled: createOrderOpen,
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
  const createOrderMutation = useMutation({
    mutationFn: (payload: {
      sellerId: string;
      buyerId: string;
      productId: string;
      productName: string;
      auctionId: string;
      winningAmount: number;
      depositAmount: number;
      winningDate: string;
    }) => adminOrderApi.createOrder(payload),
    onSuccess: () => {
      alert("주문이 생성되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "auctions", "completed"],
        refetchType: "none",
      });
    },
    onError: (error: any) => {
      alert(error?.data?.message ?? "주문 생성에 실패했습니다.");
    },
  });
  const completedErrorMessage = useMemo(() => {
    if (!completedAuctionsQuery.isError) return null;
    return "종료된 경매 목록을 불러오지 못했습니다.";
  }, [completedAuctionsQuery.isError]);
  const completedTotalPages = completedAuctionsQuery.data?.totalPages ?? 1;
  const completedAuctions = completedAuctionsQuery.data?.content ?? [];
  const showEmpty =
    !completedAuctionsQuery.isLoading &&
    !completedAuctionsQuery.isError &&
    completedAuctions.length === 0;
  const getDisplayBid = (auction: AuctionDetailResponse) => {
    const currentBid = auction.currentBid ?? 0;
    if (currentBid > 0) return currentBid;
    return auction.startBid ?? 0;
  };
  return (
    <Dialog
      open={createOrderOpen}
      onClose={() => setCreateOrderOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>주문 생성</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            종료된 경매(COMPLETED)에서 주문서를 생성합니다.
          </Typography>

          <Table size="small" sx={{ "& th, & td": { py: 1, px: 1 } }}>
            <TableHead>
              <TableRow>
                <TableCell align="center">경매 ID</TableCell>
                <TableCell align="center">상품명</TableCell>
                <TableCell align="center">판매자</TableCell>
                <TableCell align="center">최고 입찰자</TableCell>
                <TableCell align="center">낙찰가</TableCell>
                <TableCell align="center">종료일</TableCell>
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {completedErrorMessage && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Alert severity="error">{completedErrorMessage}</Alert>
                  </TableCell>
                </TableRow>
              )}

              {completedAuctions.map((auction) => (
                <TableRow key={auction.id} hover sx={{ height: 56 }}>
                  <TableCell align="center">{auction.id}</TableCell>
                  <TableCell align="center">
                    {auction.productName ?? "-"}
                  </TableCell>
                  <TableCell align="center">
                    {auction.sellerId ?? "-"}
                  </TableCell>
                  <TableCell align="center">
                    {auction.highestUserId ?? "-"}
                  </TableCell>
                  <TableCell align="center">
                    {formatWon(getDisplayBid(auction))}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={formatDate(auction.auctionEndAt)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        if (!auction.highestUserId) {
                          return;
                        }
                        createOrderMutation.mutate({
                          sellerId: auction.sellerId,
                          buyerId: auction.highestUserId,
                          productId: auction.productId,
                          productName: auction.productName ?? "",
                          auctionId: auction.id,
                          winningAmount: getDisplayBid(auction),
                          depositAmount: auction.depositAmount ?? 0,
                          winningDate: auction.auctionEndAt,
                        });
                      }}
                      disabled={
                        createOrderMutation.isPending || !auction.highestUserId
                      }
                    >
                      주문 생성
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {showEmpty && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">
                      종료된 경매가 없습니다.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination
            count={Math.max(completedTotalPages, 1)}
            page={completedPage}
            onChange={(_, value) => setCompletedPage(value)}
            disabled={completedTotalPages === 0}
            size="small"
            sx={{ display: "flex", justifyContent: "center" }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateOrderOpen(false)}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderCreateDialog;
