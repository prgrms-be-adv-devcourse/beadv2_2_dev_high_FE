import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Drawer,
  Skeleton,
  Stack,
  Typography,
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
import { DepositChargeDialog } from "../components/mypage/DepositChargeDialog";
import { requestTossPayment } from "../components/tossPay/requestTossPayment";
import { useAuth } from "../contexts/AuthContext";
import { useStomp } from "../hooks/useStomp";
import { formatWon } from "../utils/money";
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
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);

  const [auctionDetail, setAuctionDetail] =
    useState<AuctionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentBidPrice, setCurrentBidPrice] = useState<number>(0);
  const [hasAnyBid, setHasAnyBid] = useState(false);
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
  const [insufficientDepositOpen, setInsufficientDepositOpen] = useState(false);
  const [insufficientDepositInfo, setInsufficientDepositInfo] = useState<{
    balance: number;
    needed: number;
    shortage: number;
    recommendedCharge: number;
  } | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeLoading, setChargeLoading] = useState(false);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeError, setChargeError] = useState<string | null>(null);

  const getProductImageUrls = useCallback(() => {
    const raw: unknown = (auctionDetail as any)?.files;
    if (raw == null) return [];

    const pickFromObject = (value: unknown) => {
      if (!value || typeof value !== "object") return undefined;
      const record = value as any;
      const maybePath = record.filePath ?? record.url ?? record.imageUrl;
      if (typeof maybePath === "string" && maybePath.trim().length > 0) {
        return maybePath.trim();
      }
      return undefined;
    };

    if (Array.isArray(raw)) {
      return raw
        .map((item) => pickFromObject(item))
        .filter((v): v is string => typeof v === "string" && v.length > 0);
    }

    if (typeof raw === "object") {
      const one = pickFromObject(raw);
      return one ? [one] : [];
    }

    if (typeof raw !== "string") return [];

    const trimmed = raw.trim();
    if (!trimmed) return [];

    try {
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => pickFromObject(item))
            .filter((v): v is string => typeof v === "string" && v.length > 0);
        }
        const one = pickFromObject(parsed);
        return one ? [one] : [];
      }
    } catch {
      // ignore parsing errors and fall back to string heuristics
    }

    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return [trimmed];
  }, [auctionDetail?.files]);

  const fetchAuctionDetail = async () => {
    try {
      const data: AuctionDetailResponse = await auctionApi
        .getAuctionDetail(auctionId as string)
        .then((res) => res.data);
      setAuctionDetail(data);
      setHasAnyBid(data.currentBid > 0);
      setCurrentBidPrice(data.currentBid > 0 ? data.currentBid : data.startBid);
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

  const refreshBidHistoryFirstPage = useCallback(async () => {
    if (!auctionId) return;
    try {
      const response = await auctionApi.getAuctionBidHistory(auctionId, {
        page: 0,
        size: 20,
      });
      const data = response.data;
      setBidHistory(data.content);
      setHasMore(!data.last);
      setBidHistoryPage(1);
    } catch (err) {
      console.error("입찰 내역 새로고침 실패:", err);
    }
  }, [auctionId]);

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
            setHasAnyBid(true);
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

  const { isConnected, isRetrying, connectionState } = useStomp({
    topic: auctionId ? `/topic/auction.${auctionId}` : "",
    onMessage: handleNewMessage,
  });

  const minBidPrice =
    auctionDetail == null
      ? 0
      : hasAnyBid
      ? currentBidPrice + 100
      : auctionDetail.startBid;

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
    if (auctionDetail) {
      if (!hasAnyBid && bid < auctionDetail.startBid) {
        alert(
          `첫 입찰 금액은 시작가(${formatWon(auctionDetail.startBid)}) 이상이어야 합니다.`
        );
        return;
      }
      if (hasAnyBid && bid <= currentBidPrice) {
        alert(
          `입찰 금액은 최고입찰가(${formatWon(currentBidPrice)})보다 높아야 합니다.`
        );
        return;
      }
      if (bid < minBidPrice) {
        alert(`최소 입찰 금액은 ${formatWon(minBidPrice)}입니다.`);
        return;
      }
    }

    try {
      setBidLoading(true);
      await auctionApi.placeBid(auctionId!, bid);
      setNewBidAmount("");

      setParticipationStatus((prev) => ({
        ...prev,
        lastBidPrice: bid,
      }));

      const shouldFallbackRefetch =
        connectionState === "disconnected" || connectionState === "failed";
      if (shouldFallbackRefetch) {
        await fetchAuctionDetail();
        await refreshBidHistoryFirstPage();
      }
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
      setDepositLoading(true);

      const depositAmount = Number(auctionDetail?.depositAmount ?? 0);
      const account = await depositApi.getAccount();

      if ((account?.balance ?? 0) < depositAmount) {
        const balance = Number(account?.balance ?? 0);
        const needed = depositAmount;
        const shortage = Math.max(0, needed - balance);
        const recommendedCharge = Math.max(
          1000,
          Math.ceil(shortage / 100) * 100
        );

        setInsufficientDepositInfo({
          balance,
          needed,
          shortage,
          recommendedCharge,
        });
        setOpenDepositPrompt(false);
        setInsufficientDepositOpen(true);
        return;
      }

      const res = await auctionApi.createParticipation(auctionId as string, {
        depositAmount,
      });

      window.dispatchEvent(
        new CustomEvent("deposit:decrement", { detail: depositAmount })
      );

      setParticipationStatus(res.data);
      setOpenDepositPrompt(false);
      alert("보증금 결제가 완료되었습니다. 이제 입찰할 수 있습니다.");
    } catch (error: any) {
      alert(error?.data?.message ?? "보증금 결제중 에러가 발생했습니다.");
    } finally {
      setDepositLoading(false);
    }
  };

  if (loading)
    return (
      <Container
        maxWidth={false}
        sx={{
          px: { xs: 2, md: 4 },
          mt: 4,
          mb: 4,
        }}
      >
        <Grid container spacing={3} justifyContent={"center"}>
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
                <CardHeader title={<Skeleton width="40%" />} sx={{ pb: 0 }} />
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader title={<Skeleton width="30%" />} sx={{ pb: 0 }} />
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="50%" />
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          <Card sx={{ flex: 0.3, height: "100%" }}>
            <CardHeader title={<Skeleton width="40%" />} />
            <CardContent>
              <Stack spacing={2}>
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="rectangular" height={160} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
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
  const isAuctionInReday = auctionDetail.status === AuctionStatus.READY;
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
                    auctionStatus={auctionDetail.status}
                    setOpenPopup={() => setOpenWithdrawnPopup(true)}
                    refundRequest={refundRequest}
                  />
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* --- 실시간 입찰 --- */}
          <Card sx={{ flex: 0.3, height: "100%" }}>
            <CardHeader
              title="실시간 현황"
              action={
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setProductDrawerOpen(true)}
                >
                  상품 정보
                </Button>
              }
            />
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
                  hasAnyBid={hasAnyBid}
                  highestBidderInfo={highestBidderInfo}
                  currentUserCount={currentUserCount}
                  auctionEndAt={auctionDetail.auctionEndAt}
                  auctionStartAt={auctionDetail.auctionStartAt}
                  startBid={auctionDetail.startBid}
                />
                <Divider />
                <AuctionBidForm
                  isAuctionInReady={isAuctionInReday}
                  isAuctionInProgress={isAuctionInProgress}
                  currentBidPrice={currentBidPrice}
                  minBidPrice={minBidPrice}
                  hasAnyBid={hasAnyBid}
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

      <Dialog
        open={insufficientDepositOpen}
        onClose={() => setInsufficientDepositOpen(false)}
      >
        <DialogTitle>예치금 잔액이 부족합니다</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            현재 잔액: {formatWon(insufficientDepositInfo?.balance ?? 0)}
          </Typography>
          <Typography variant="body2">
            필요 금액: {formatWon(insufficientDepositInfo?.needed ?? 0)}
          </Typography>
          <Typography variant="body2">
            부족 금액:{" "}
            {formatWon(insufficientDepositInfo?.shortage ?? 0)}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            예치금을 충전한 뒤 보증금 결제를 진행할 수 있어요.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInsufficientDepositOpen(false)}>
            닫기
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const amount = insufficientDepositInfo?.recommendedCharge ?? 0;
              setChargeAmount(amount > 0 ? String(amount) : "");
              setChargeError(null);
              setInsufficientDepositOpen(false);
              setChargeOpen(true);
            }}
          >
            충전하기
          </Button>
        </DialogActions>
      </Dialog>

      <DepositChargeDialog
        open={chargeOpen}
        loading={chargeLoading}
        amount={chargeAmount}
        errorText={chargeError}
        onChangeAmount={setChargeAmount}
        onClose={() => {
          if (chargeLoading) return;
          setChargeOpen(false);
          setChargeAmount("");
          setChargeError(null);
        }}
        onSubmit={async () => {
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
            if (depositOrder && depositOrder.orderId && auctionId) {
              const depositAmount = Number(auctionDetail?.depositAmount ?? 0);
              const bidPrice = Number(newBidAmount);
              sessionStorage.setItem(
                "autoAuctionDepositAfterCharge",
                JSON.stringify({
                  auctionId,
                  depositAmount,
                  bidPrice: Number.isFinite(bidPrice) ? bidPrice : undefined,
                  createdAt: Date.now(),
                })
              );
              requestTossPayment(depositOrder.orderId, depositOrder.amount);
              setChargeOpen(false);
            } else {
              setChargeError("주문 생성에 실패했습니다.");
            }
          } catch (chargeErr) {
            console.error("예치금 충전 주문 생성 실패:", chargeErr);
            setChargeError("예치금 충전 주문 생성 중 오류가 발생했습니다.");
          } finally {
            setChargeLoading(false);
          }
        }}
      />

      <Drawer
        anchor="right"
        open={productDrawerOpen}
        onClose={() => setProductDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 420 }, p: 2 },
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between">
            <Button
              variant="outlined"
              onClick={() => setProductDrawerOpen(false)}
            >
              닫기
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate(`/products/${auctionDetail.productId}`)}
            >
              상품 상세보기
            </Button>
          </Stack>
          <ProductInfo
            imageUrls={getProductImageUrls()}
            productName={auctionDetail.productName}
            description={auctionDetail.description}
          />
        </Stack>
      </Drawer>
    </>
  );
};

export default AuctionDetail;
