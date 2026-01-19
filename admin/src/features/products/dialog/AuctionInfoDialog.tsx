import { adminAuctionApi } from "@/apis/adminAuctionApi";
import { AuctionStatus } from "@moreauction/types";
import { formatDate } from "@moreauction/utils";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import React from "react";

const AuctionInfoDialog = ({ auctionListOpen, setAuctionListOpen }: any) => {
  const auctionListQuery = useQuery({
    queryKey: ["admin", "auctions", "by-product", auctionListOpen],
    queryFn: () =>
      auctionListOpen
        ? adminAuctionApi.getAuctionsByProductId(auctionListOpen)
        : null,
    enabled: auctionListOpen !== null,
    staleTime: 20_000,
  });
  return (
    <Dialog
      open={auctionListOpen !== null}
      onClose={() => setAuctionListOpen(null)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>경매 리스트</DialogTitle>
      <DialogContent>
        {auctionListQuery.isLoading ? (
          <Typography>로딩 중...</Typography>
        ) : auctionListQuery.isError ? (
          <Typography color="error">
            경매 리스트를 불러오는데 실패했습니다.
          </Typography>
        ) : auctionListQuery.data?.data &&
          auctionListQuery.data.data.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>시작 가격</TableCell>
                <TableCell>현재 가격</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>시작 시간</TableCell>
                <TableCell>종료 시간</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auctionListQuery.data.data.map((auction) => (
                <TableRow key={auction.id}>
                  <TableCell>{auction.id}</TableCell>
                  <TableCell>{auction.startBid?.toLocaleString()}원</TableCell>
                  <TableCell>
                    {auction.currentBid?.toLocaleString()}원
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={auction.status}
                      color={
                        auction.status === AuctionStatus.IN_PROGRESS
                          ? "success"
                          : auction.status === AuctionStatus.COMPLETED
                          ? "default"
                          : "warning"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(auction.auctionStartAt)}</TableCell>
                  <TableCell>{formatDate(auction.auctionEndAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography>이 상품에 대한 경매가 없습니다.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAuctionListOpen(null)}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuctionInfoDialog;
