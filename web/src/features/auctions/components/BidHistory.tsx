import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Typography,
} from "@mui/material";
import { keyframes } from "@emotion/react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import React, { useEffect, useRef, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useNavigate } from "react-router-dom";
import type { AuctionBidMessage } from "@moreauction/types";
import { formatWon } from "@moreauction/utils";

interface BidHistoryProps {
  isAuthenticated: boolean;
  bidHistory: AuctionBidMessage[];
  fetchMoreHistory: () => void;
  hasMore: boolean;
  getBidderLabel?: (userId?: string, fallbackName?: string) => string | null;
  isBidderLoading?: boolean;
}

const BidHistory: React.FC<BidHistoryProps> = ({
  isAuthenticated,
  bidHistory,
  fetchMoreHistory,
  hasMore,
  getBidderLabel,
  isBidderLoading = false,
}) => {
  const navigate = useNavigate();
  const [highlightBidSrno, setHighlightBidSrno] = useState<number | null>(null);
  const [pushPulse, setPushPulse] = useState(false);
  const latestBidRef = useRef<number | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (bidHistory.length === 0) return;
    const latest = bidHistory[0]?.bidSrno ?? null;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      latestBidRef.current = latest;
      return;
    }
    if (latest && latest !== latestBidRef.current) {
      latestBidRef.current = latest;
      setHighlightBidSrno(latest);
      setPushPulse(true);
      const timer = window.setTimeout(() => {
        setHighlightBidSrno((prev) => (prev === latest ? null : prev));
      }, 1200);
      const pushTimer = window.setTimeout(() => {
        setPushPulse(false);
      }, 260);
      return () => {
        window.clearTimeout(timer);
        window.clearTimeout(pushTimer);
      };
    }
  }, [bidHistory]);

  const revealAnimation = keyframes`
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  `;
  const pushDownAnimation = keyframes`
    from { transform: translateY(-8px); }
    to { transform: translateY(0); }
  `;

  if (!isAuthenticated) {
    return (
      <Alert severity="info" sx={{ my: "auto" }}>
        입찰 내역은 로그인 후 확인 가능합니다.
      </Alert>
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
            <ListItem
              sx={
                highlightBidSrno === bid.bidSrno
                  ? { animation: `${revealAnimation} 280ms ease-out` }
                  : pushPulse
                    ? { animation: `${pushDownAnimation} 240ms ease-out` }
                    : undefined
              }
            >
              <ListItemText
                primary={
                  <Typography component="span" fontWeight="bold">
                    {formatWon(bid.bidPrice)}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography component="span" display="block">
                      입찰자:{" "}
                      {(() => {
                        const label = getBidderLabel
                          ? getBidderLabel(
                              bid.highestUserId,
                              bid.highestUsername,
                            )
                          : (bid.highestUsername ?? null);
                        if (label) return label;
                        if (isBidderLoading) {
                          return (
                            <Skeleton
                              width={120}
                              sx={{ display: "inline-block" }}
                            />
                          );
                        }
                        return "-";
                      })()}
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
