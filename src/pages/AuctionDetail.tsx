import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Stack,
} from "@mui/material";
import type { IMessage } from "@stomp/stompjs";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auctionApi } from "../apis/auctionApi";
import { depositApi } from "../apis/depositApi";
import AuctionParticipationStatus from "../components/auctions/AuctiobParticipationStatus";
import AuctionBiddingPanel from "../components/auctions/AuctionBiddingPanel";
import AuctionBidForm from "../components/auctions/AuctionBidForm";
import AuctionDialogs from "../components/auctions/AuctionDialogs";
import AuctionInfoPanel from "../components/auctions/AuctionInfoPanel";
import BidHistory from "../components/auctions/BidHistory";
import ProductInfo from "../components/auctions/ProductInfo";
import { useAuth } from "../contexts/AuthContext";
import { useStomp } from "../hooks/useStomp";
import {
  type AuctionBidMessage,
  type AuctionDetailResponse,
  type AuctionParticipationResponse,
  AuctionStatus,
} from "../types/auction";
import { DepositType } from "../types/deposit";

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
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);

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
      fetchMoreHistory();
      if (isAuthenticated) {
        fetchAuctionParticipation();
      }
    }
  }, [auctionId, isAuthenticated]);

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
    if (bidLoading) return;
    if (!isAuthenticated) {
      setOpenLoginPrompt(true);
      return;
    }
    if (user?.userId === auctionDetail?.sellerId) {
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
    if (withdrawLoading) return;
    try {
      setWithdrawLoading(true);
      const res = await auctionApi.withdrawnParticipation(auctionId!);
      setNewBidAmount("");

      setParticipationStatus(res.data);
      setOpenWithdrawnPopup(false);
      alert("경매 참여가 포기되었습니다.");
    } catch (err: any) {
      setOpenWithdrawnPopup(false);
      console.error("경매 포기 실패:", err);
      alert(err?.data?.message);
    } finally {
      setWithdrawLoading(false);
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
    if (depositLoading) return;
    try {
      setOpenDepositPrompt(false);
      setDepositLoading(true);

      /* 임시 */
      const balance = 1000;

      if (balance < Number(auctionDetail?.depositAmount ?? 0)) {
        alert("보증금이 부족합니다.");
        return;
      }
      // 2. 보증금 기록 생성
      await depositApi.createDepositHst({
        amount: Number(auctionDetail?.depositAmount),
        userId: user?.userId,
        type: DepositType.USAGE,
      });

      setParticipationStatus({ ...participationStatus, isParticipated: true });
      alert("보증금 결제가 완료되었습니다. 이제 입찰할 수 있습니다.");
    } catch (error: any) {
      alert(error?.data?.message ?? "보증금 결제중 에러가 발생했습니다.");
    } finally {
      setDepositLoading(false);
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
    (user.role === "ADMIN" || user?.userId === auctionDetail.sellerId);

  return (
    <>
      <Container
        maxWidth={false}
        sx={{
          px: { xs: 2, md: 4 },
          mt: 4,
          mb: 4,
        }}
      >
        <Grid container spacing={3} justifyContent={"center"}>
          {/* --- 경매 현황 및 입찰 내역 --- */}
          <Grid flex={0.3}>
            <Stack spacing={3}>
              <Card
                sx={{
                  height: "400px",
                  display: "flex",
                  flexDirection: "column",
                  pb: 2,
                }}
              >
                <CardHeader title="실시간 입찰 내역" />
                <CardContent
                  id="bidHistoryContainer"
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "auto",
                  }}
                >
                  <BidHistory
                    isAuthenticated={isAuthenticated}
                    bidHistory={bidHistory}
                    fetchMoreHistory={fetchMoreHistory}
                    hasMore={hasMore}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader title="참여 현황" />

                <CardContent>
                  <AuctionParticipationStatus
                    participationStatus={participationStatus}
                    depositAmount={auctionDetail.depositAmount}
                    setOpenPopup={() => setOpenWithdrawnPopup(true)}
                    refundRequest={refundRequest}
                  />
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* --- 실시간 입찰 --- */}
          <Card sx={{ flex: 0.3, height: "100%" }}>
            <CardHeader title="실시간 현황" />
            <CardContent>
              <Stack spacing={2}>
                <AuctionInfoPanel
                  productName={auctionDetail.productName}
                  status={auctionDetail.status}
                  isAuctionInProgress={isAuctionInProgress}
                  isConnected={isConnected}
                  isRetrying={isRetrying}
                  canEdit={canEdit || false}
                  auctionId={auctionId!}
                />
                <Divider />
                <AuctionBiddingPanel
                  status={auctionDetail.status}
                  currentBidPrice={currentBidPrice}
                  highestBidderInfo={highestBidderInfo}
                  currentUserCount={currentUserCount}
                  auctionEndAt={auctionDetail.auctionEndAt}
                  auctionStartAt={auctionDetail.auctionStartAt}
                  startBid={auctionDetail.startBid}
                />
                <Divider />
                <AuctionBidForm
                  isAuctionInProgress={isAuctionInProgress}
                  currentBidPrice={currentBidPrice}
                  newBidAmount={newBidAmount}
                  setNewBidAmount={setNewBidAmount}
                  handleBidSubmit={handleBidSubmit}
                  bidLoading={bidLoading}
                  isConnected={isConnected}
                  isWithdrawn={participationStatus.isWithdrawn}
                  isAuthenticated={isAuthenticated}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Container>

      <AuctionDialogs
        openLoginPrompt={openLoginPrompt}
        setOpenLoginPrompt={setOpenLoginPrompt}
        handleCloseLoginPrompt={handleCloseLoginPrompt}
        openDepositPrompt={openDepositPrompt}
        setOpenDepositPrompt={setOpenDepositPrompt}
        handleCloseDepositPrompt={handleCloseDepositPrompt}
        depositAmount={auctionDetail.depositAmount}
        openWithdrawnPopup={openWithdrawnPopup}
        setOpenWithdrawnPopup={setOpenWithdrawnPopup}
        handleWithdraw={handleWithdraw}
        isCurrentUserHighestBidder={highestBidderInfo?.id === user?.userId}
      />
    </>
  );
};

export default AuctionDetail;
