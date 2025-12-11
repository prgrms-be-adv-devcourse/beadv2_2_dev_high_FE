import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import type { IMessage } from "@stomp/stompjs";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import React, { useCallback, useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { auctionApi } from "../apis/auctionApi";
import RemainingTime from "../components/RemainingTime";
import { useAuth } from "../contexts/AuthContext";
import { useStomp } from "../hooks/useStomp";
import {
  type AuctionBidMessage,
  type AuctionDetailResponse,
  type AuctionParticipationResponse,
  AuctionStatus,
} from "../types/auction";
import { depositApi } from "../apis/depositApi";
import { DepositType } from "../types/deposit";

// 보증금 및 참여 상태를 표시하는 컴포넌트
const AuctionParticipationStatus: React.FC<{
  participationStatus: AuctionParticipationResponse;
  depositAmount: number;
  setOpenPopup: () => void;
  refundRequest: () => void;
}> = ({ participationStatus, depositAmount, setOpenPopup, refundRequest }) => {
  const { isParticipated, isWithdrawn, isRefund, lastBidPrice } =
    participationStatus;

  let statusChip;
  if (isWithdrawn && isRefund) {
    statusChip = <Chip label="참여 포기 + 환급 완료" color="success" />;
  } else if (isWithdrawn) {
    statusChip = <Chip label="참여 포기" color="warning" />;
  } else if (isRefund) {
    statusChip = <Chip label="보증금 환급 완료" color="success" />;
  } else if (isParticipated) {
    if (lastBidPrice && lastBidPrice > 0) {
      statusChip = <Chip label="참여중" color="secondary" />;
    } else {
      statusChip = <Chip label="보증금 납부 완료" color="primary" />;
    }
  } else {
    statusChip = <Chip label="미참여" color="default" />;
  }

  return (
    <Paper sx={{ p: 2, mt: 2, backgroundColor: "background.paper" }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6" gutterBottom>
          나의 경매 참여 상태
        </Typography>
        {isWithdrawn && !isRefund && (
          <Box display="flex" gap={1}>
            <Button variant="contained" loading={false} onClick={refundRequest}>
              환불요청
            </Button>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          justifyContent: "space-between",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {statusChip}

          <Typography variant="h5" sx={{ mt: 1 }}>
            마지막 입찰가: {lastBidPrice?.toLocaleString()}원
          </Typography>
        </Box>

        <Box
          flexDirection={"column"}
          alignContent={"flex-end"}
          display={"flex"}
          gap={1}
        >
          <Typography variant="body1" textAlign="right">
            {isParticipated || isRefund
              ? `보증금: ${depositAmount.toLocaleString()}원`
              : `필요 보증금: ${depositAmount.toLocaleString()}원`}
          </Typography>
          {isParticipated && !isWithdrawn && !isRefund && (
            <Button
              variant="contained"
              color="error"
              onClick={setOpenPopup}
              size="medium"
            >
              경매 포기하기
            </Button>
          )}
        </Box>
      </Box>

      {isWithdrawn && (
        <Alert
          severity="warning"
          sx={{
            mt: 2,
            mb: 2,
            display: "flex",
          }}
        >
          경매 참여를 포기하여 더 이상 입찰할 수 없습니다.
        </Alert>
      )}
    </Paper>
  );
};

const AuctionDetail: React.FC = () => {
  const { id: auctionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [auctionDetail, setAuctionDetail] =
    useState<AuctionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentBidPrice, setCurrentBidPrice] = useState<number>(0);
  const [highestBidderInfo, setHighestBidderInfo] = useState<{
    id?: string;
    username?: string;
  } | null>(null);
  const [currentUserCount, setCurrentUserCount] = useState(0);
  const [newBidAmount, setNewBidAmount] = useState<string>("");

  const [openLoginPrompt, setOpenLoginPrompt] = useState(false);
  const [openDepositPrompt, setOpenDepositPrompt] = useState(false);
  const [openWithdrawnPopup, setOpenWithdrawnPopup] = useState(false);

  const [participationStatus, setParticipationStatus] =
    useState<AuctionParticipationResponse>({
      isParticipated: false,
      isWithdrawn: false,
      isRefund: false,
    });

  // 입찰 내역 상태
  const [bidHistory, setBidHistory] = useState<AuctionBidMessage[]>([]);
  const [bidHistoryPage, setBidHistoryPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [bidLoading, setBidLoading] = useState(false);

  const fetchAuctionDetail = async () => {
    try {
      const data: AuctionDetailResponse = await auctionApi
        .getAuctionDetail(auctionId as string)
        .then((res) => res.data);
      setAuctionDetail(data);
      setCurrentBidPrice(data.currentBid || data.startBid);
      if (data.highestUserId) {
        setHighestBidderInfo({ id: data.highestUserId, username: "" });
      }
    } catch (err) {
      console.error("경매 상세 정보 로딩 실패:", err);
      setError("경매 상세 정보를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuctionParticipation = async () => {
    try {
      const res = await auctionApi.checkParticipationStatus(
        auctionId as string
      );
      setParticipationStatus(res?.data);
    } catch (err) {
      console.error("경매 참여 정보 로딩 실패:", err);
    }
  };

  const fetchMoreHistory = async () => {
    if (!auctionId) return;
    try {
      const response = await auctionApi.getAuctionBidHistory(auctionId, {
        page: bidHistoryPage,
        size: 20,
      });

      const data = response.data;

      setBidHistory((prev) => [...prev, ...data.content]);
      setHasMore(!data.last);
      setBidHistoryPage((prev) => prev + 1);
    } catch (err) {
      console.error("입찰 내역 추가 로딩 실패:", err);
    }
  };

  useEffect(() => {
    if (auctionId) {
      fetchAuctionDetail();
      if (isAuthenticated) {
        fetchAuctionParticipation();
      }
    }
  }, [auctionId, isAuthenticated]);

  useEffect(() => {
    if (!auctionId) return;
    // Reset and fetch initial data when auctionId changes
    setBidHistory([]);
    setBidHistoryPage(0);
    setHasMore(true);
    auctionApi
      .getAuctionBidHistory(auctionId, { page: 0, size: 20 })
      .then((response) => {
        const data = response.data;
        setBidHistory(data.content);
        setHasMore(!data.last);
        setBidHistoryPage(1);
      })
      .catch((err) => {
        console.error("입찰 내역 초기 로딩 실패:", err);
      });
  }, [auctionId]);

  const handleNewMessage = useCallback(
    (message: IMessage) => {
      try {
        const payload: AuctionBidMessage = JSON.parse(message.body);
        switch (payload.type) {
          case "USER_JOIN":
          case "USER_LEAVE":
            setCurrentUserCount(payload.currentUsers);
            break;
          case "BID_SUCCESS":
            console.log("입찰 성공 메시지 처리:", payload);
            setCurrentBidPrice(payload.bidPrice);
            setHighestBidderInfo({
              id: payload.highestUserId,
              username: payload.highestUsername,
            });
            setCurrentUserCount(payload.currentUsers);
            setBidHistory((prev) => {
              const newBid: AuctionBidMessage = {
                bidSrno: payload.bidSrno,
                highestUserId: payload.highestUserId!,
                highestUsername: payload.highestUsername! ?? "-",
                bidPrice: payload.bidPrice,
                bidAt: payload.bidAt,
                type: "BID_SUCCESS",
                auctionId: payload.auctionId,
                currentUsers: payload.currentUsers,
              };
              if (prev.some((bid) => bid.bidSrno === newBid.bidSrno)) {
                return prev;
              }
              return [newBid, ...prev];
            });
            break;
          default:
            break;
        }
      } catch (e) {
        console.error("메시지 파싱 오류:", e);
      }
    },
    [setBidHistory]
  );

  const { isConnected, isRetrying } = useStomp({
    topic: auctionId ? `/topic/auction.${auctionId}` : "",
    onMessage: handleNewMessage,
  });

  const handleBidSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setOpenLoginPrompt(true);
      return;
    }
    if (user?.id === auctionDetail?.sellerId) {
      alert("본인이 등록한 경매에는 입찰할 수 없습니다.");
      return;
    }
    if (participationStatus.isWithdrawn) {
      alert("경매 참여를 포기하여 입찰할 수 없습니다.");
      return;
    }
    if (!participationStatus.isParticipated) {
      setOpenDepositPrompt(true);
      return;
    }

    const bid = Number(newBidAmount);
    if (isNaN(bid) || bid <= 0 || bid % 100 !== 0) {
      alert("입찰 금액은 100원 단위의 올바른 숫자여야 합니다.");
      return;
    }
    if (bid <= currentBidPrice) {
      alert(
        `입찰 금액은 현재가(${currentBidPrice.toLocaleString()}원)보다 높아야 합니다.`
      );
      return;
    }

    try {
      setBidLoading(true);
      await auctionApi.placeBid(auctionId!, bid);
      setNewBidAmount("");

      setParticipationStatus((prev) => ({
        ...prev,
        lastBidPrice: bid,
      }));
      alert("입찰이 성공적으로 접수되었습니다.");
    } catch (err: any) {
      alert(`입찰 실패: ${err.response?.data?.message || err.message}`);
    } finally {
      setBidLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      const res = await auctionApi.withdrawnParticipation(auctionId!);
      setNewBidAmount("");

      setParticipationStatus(res.data);
    } catch (err) {
      console.error("경매 포기 실패:", err);
    }
  };

  const handleCloseLoginPrompt = () => {
    setOpenLoginPrompt(false);
    navigate("/login");
  };

  const refundRequest = () => {
    alert("ㄱㄷ");
  };

  const handleCloseDepositPrompt = async () => {
    try {
      setOpenDepositPrompt(false);

      // 1. 잔액 조회
      const accountRes = await depositApi.getAccount(user?.id);

      if (accountRes.balance < Number(auctionDetail?.depositAmount ?? 0)) {
        alert("보증금이 부족합니다.");
        return;
      }

      // 2. 보증금 기록 생성
      const depositRes = await depositApi.createDepositHst({
        amount: Number(auctionDetail?.depositAmount),
        userId: user?.id,
        type: DepositType.USAGE,
      });

      if (!depositRes.balance) {
        alert("보증금 기록 생성에 실패했습니다.");
        return;
      }

      // 3. 경매 참여 생성
      const participationRes = await auctionApi.createParticipation(
        auctionId!,
        {
          depositAmount: auctionDetail?.depositAmount,
        }
      );

      setParticipationStatus(participationRes.data);
      alert("보증금 결제가 완료되었습니다. 이제 입찰할 수 있습니다.");
    } catch (error) {
      console.error(error);
      alert("보증금 결제 중 오류가 발생했습니다.");
    }
  };

  if (loading)
    return (
      <Container sx={{ textAlign: "center", mt: 5 }}>
        <CircularProgress />
      </Container>
    );
  if (error)
    return (
      <Container sx={{ mt: 5 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  if (!auctionDetail)
    return (
      <Container sx={{ mt: 5 }}>
        <Alert severity="warning">경매 정보를 찾을 수 없습니다.</Alert>
      </Container>
    );

  const isAuctionInProgress =
    auctionDetail.status === AuctionStatus.IN_PROGRESS;
  const canEdit =
    auctionDetail.status === AuctionStatus.READY &&
    user &&
    (user.role === "ADMIN" || user.id === auctionDetail.sellerId);

  return (
    <Container>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, my: 4 }}>
        <Typography variant="h4">{auctionDetail.productName}</Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h5">경매 정보</Typography>
          <Box display="flex" gap={1}>
            <Chip
              label={auctionDetail.status}
              color={isAuctionInProgress ? "success" : "default"}
            />
            <Chip
              label={
                isConnected ? "연결완료" : isRetrying ? "연결중" : "연결 끊김"
              }
              color={isConnected ? "success" : isRetrying ? "warning" : "error"}
            />
            {canEdit && (
              <Button
                size="small"
                variant="contained"
                color="secondary"
                component={RouterLink}
                to={`/auction/edit/${auctionId}`}
              >
                수정
              </Button>
            )}
          </Box>
        </Box>
        <List dense>
          <ListItem>
            <ListItemText
              primary="시작가"
              secondary={`${auctionDetail.startBid.toLocaleString()}원`}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="최고 입찰가"
              secondary={
                <Typography component="span" variant="h5" color="primary">
                  {auctionDetail.status === AuctionStatus.READY
                    ? "시작 전"
                    : `${currentBidPrice.toLocaleString()}원`}
                </Typography>
              }
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="최고 입찰자"
              secondary={
                highestBidderInfo?.id
                  ? `${
                      highestBidderInfo.username
                    } (ID: ${highestBidderInfo.id.slice(0, 4)}****)`
                  : "없음"
              }
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="경매 시작"
              secondary={format(
                new Date(auctionDetail.auctionStartAt),
                "yyyy-MM-dd HH:mm",
                { locale: ko }
              )}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="경매 종료"
              secondary={format(
                new Date(auctionDetail.auctionEndAt),
                "yyyy-MM-dd HH:mm",
                { locale: ko }
              )}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="남은 시간"
              secondary={
                <RemainingTime
                  auctionEndAt={auctionDetail.auctionEndAt}
                  auctionStartAt={auctionDetail.auctionStartAt}
                  status={auctionDetail.status}
                />
              }
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="현재 접속자"
              secondary={`${currentUserCount}명`}
            />
          </ListItem>
        </List>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">
            상품 설명: {auctionDetail.description}
          </Typography>
        </Box>
        {isAuthenticated && (
          <AuctionParticipationStatus
            participationStatus={participationStatus}
            depositAmount={auctionDetail.depositAmount}
            setOpenPopup={handleWithdraw}
            refundRequest={refundRequest}
          />
        )}
      </Paper>

      {isAuctionInProgress && (
        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            입찰하기
          </Typography>
          <Box
            component="form"
            onSubmit={handleBidSubmit}
            sx={{ display: "flex", gap: 2, alignItems: "center" }}
          >
            <TextField
              type="number"
              label={`입찰 금액 (현재가 ${currentBidPrice.toLocaleString()}원 이상)`}
              value={newBidAmount}
              onChange={(e) => setNewBidAmount(e.target.value)}
              fullWidth
              onFocus={() =>
                !newBidAmount && setNewBidAmount(String(currentBidPrice + 100))
              }
              disabled={!isConnected || participationStatus.isWithdrawn}
              inputProps={{ min: currentBidPrice + 100, step: 100 }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              loading={bidLoading}
              disabled={!isConnected || participationStatus.isWithdrawn}
              sx={{ p: 2 }}
            >
              입찰
            </Button>
          </Box>
          {!isAuthenticated && (
            <Alert severity="info" sx={{ mt: 2 }}>
              입찰에 참여하려면 로그인해주세요.
            </Alert>
          )}
          {!isConnected && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              실시간 서버와 연결이 끊어졌습니다. 입찰을 시도할 수 없습니다.
            </Alert>
          )}
        </Paper>
      )}

      {isAuthenticated ? (
        <Paper sx={{ p: 2, mt: 4, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            실시간 입찰 내역
          </Typography>
          <Box id="bidHistoryContainer" sx={{ height: 400, overflow: "auto" }}>
            <InfiniteScroll
              dataLength={bidHistory.length}
              next={fetchMoreHistory}
              hasMore={hasMore}
              loader={
                <Box sx={{ textAlign: "center", py: 2 }}>
                  <CircularProgress />
                </Box>
              }
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
                            {bid.bidPrice.toLocaleString()}원
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
                              {format(
                                new Date(bid.bidAt),
                                "yyyy-MM-dd HH:mm:ss",
                                { locale: ko }
                              )}
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
          </Box>
        </Paper>
      ) : (
        <Paper sx={{ p: 2, mt: 4, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            실시간 입찰 내역
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            입찰 내역은 로그인 후 확인 가능합니다.
            <Button onClick={() => navigate("/login")} sx={{ ml: 1 }}>
              로그인
            </Button>
          </Alert>
        </Paper>
      )}

      <Dialog open={openLoginPrompt} onClose={() => setOpenLoginPrompt(false)}>
        <DialogTitle>로그인 필요</DialogTitle>
        <DialogContent>
          <Typography>입찰에 참여하려면 먼저 로그인해야 합니다.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLoginPrompt(false)}>취소</Button>
          <Button onClick={handleCloseLoginPrompt} autoFocus>
            로그인
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDepositPrompt}
        onClose={() => setOpenDepositPrompt(false)}
      >
        <DialogTitle>보증금 필요</DialogTitle>
        <DialogContent>
          <Typography>
            경매에 처음 입찰하시려면 보증금{" "}
            <Typography component="span" fontWeight="bold">
              {auctionDetail.depositAmount.toLocaleString()}원
            </Typography>
            이 필요합니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDepositPrompt(false)}>취소</Button>
          <Button onClick={handleCloseDepositPrompt} autoFocus>
            보증금 결제
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openWithdrawnPopup}
        onClose={() => setOpenWithdrawnPopup(false)}
      >
        <DialogTitle>경매 포기</DialogTitle>
        <DialogContent>
          {highestBidderInfo?.id === user?.id ? (
            <Typography color="error">
              현재 최고 입찰자이므로 경매를 포기할 수 없습니다.
            </Typography>
          ) : (
            <Typography>
              경매에 처음 입찰하시려면 보증금{" "}
              <Typography component="span" fontWeight="bold">
                {auctionDetail.depositAmount.toLocaleString()}원
              </Typography>
              이 필요합니다. 포기하면 보증금이 즉시 환불되며, 해당 경매에는 다시
              참여할 수 없습니다.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWithdrawnPopup(false)}>취소</Button>
          <Button
            onClick={handleWithdraw}
            autoFocus
            disabled={highestBidderInfo?.id === user?.id} // 최고입찰자는 버튼 비활성
          >
            보증금 결제 / 포기
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AuctionDetail;
