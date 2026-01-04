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
  Typography,
} from "@mui/material";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import React from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useNavigate } from "react-router-dom";
import type { AuctionBidMessage } from "@moreauction/types";
import { formatWon } from "@moreauction/utils";

interface BidHistoryProps {
  isAuthenticated: boolean;
  bidHistory: AuctionBidMessage[];
  fetchMoreHistory: () => void;
  hasMore: boolean;
}

const BidHistory: React.FC<BidHistoryProps> = ({
  isAuthenticated,
  bidHistory,
  fetchMoreHistory,
  hasMore,
}) => {
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <Alert severity="info" sx={{ m: "auto" }}>
          입찰 내역은 로그인 후 확인 가능합니다.
          <Button onClick={() => navigate("/login")} sx={{ ml: 1 }}>
            로그인
          </Button>
        </Alert>
      </Box>
    );
  }

  return bidHistory.length === 0 && !hasMore ? (
    <Typography
      color="text.secondary"
      textAlign={"center"}
      flex={1}
      alignContent={"center"}
    >
      입찰 내역이 없습니다.
    </Typography>
  ) : (
    <InfiniteScroll
      dataLength={bidHistory.length}
      next={fetchMoreHistory}
      hasMore={hasMore}
      loader={
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress />
        </Box>
      }
      style={{ overflow: "inherit" }}
      endMessage={
        <Typography variant="body2" sx={{ textAlign: "center", py: 2 }}>
          <b>더 이상 입찰 내역이 없습니다.</b>
        </Typography>
      }
      scrollableTarget="bidHistoryContainer"
    >
      <List>
        {bidHistory.map((bid) => (
          <React.Fragment key={bid.bidSrno}>
            <ListItem>
              <ListItemText
                primary={
                  <Typography component="span" fontWeight="bold">
                    {formatWon(bid.bidPrice)}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography component="span" display="block">
                      입찰자: {bid?.highestUsername} (ID:{" "}
                      {bid.highestUserId?.slice(0, 4)}
                      ****)
                    </Typography>
                    <Typography
                      component="span"
                      display="block"
                      color="text.secondary"
                    >
                      {format(new Date(bid.bidAt), "yyyy-MM-dd HH:mm:ss", {
                        locale: ko,
                      })}
                    </Typography>
                  </>
                }
              />
            </ListItem>
            <Divider component="li" />
          </React.Fragment>
        ))}
      </List>
    </InfiniteScroll>
  );
};

export default BidHistory;
