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
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import type { IMessage } from "@stomp/stompjs";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auctionApi } from "@/apis/auctionApi";
import { depositApi } from "@/apis/depositApi";
import { fileApi } from "@/apis/fileApi";
import { productApi } from "@/apis/productApi";
import { wishlistApi, type WishlistEntry } from "@/apis/wishlistApi";
import { userApi } from "@/apis/userApi";
import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import AuctionParticipationStatus from "@/features/auctions/components/AuctionParticipationStatus";
import AuctionBiddingPanel from "@/features/auctions/components/AuctionBiddingPanel";
import AuctionBidForm from "@/features/auctions/components/AuctionBidForm";
import AuctionDialogs from "@/features/auctions/components/AuctionDialogs";
import AuctionInfoPanel from "@/features/auctions/components/AuctionInfoPanel";
import BidHistory from "@/features/auctions/components/BidHistory";
import ProductInfo from "@/features/auctions/components/ProductInfo";
import { DepositChargeDialog } from "@/features/mypage/components/DepositChargeDialog";
import { requestTossPayment } from "@/shared/utils/requestTossPayment";
import { useAuth } from "@moreauction/auth";
import { useStomp } from "@/features/auctions/hooks/useStomp";
import { formatWon } from "@moreauction/utils";
import {
  type AuctionBidMessage,
  type AuctionDetailResponse,
  type AuctionParticipationResponse,
  type PagedBidHistoryResponse,
  AuctionStatus,
  type Product,
  type User,
} from "@moreauction/types";
import { DepositType } from "@moreauction/types";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const AuctionDetail: React.FC = () => {
  const { id: auctionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);

  const [highestBidderInfo, setHighestBidderInfo] = useState<{
    id?: string;
    username?: string;
  } | null>(null);
  const [currentUserCount, setCurrentUserCount] = useState(0);
  const [newBidAmount, setNewBidAmount] = useState<string>("");

  const [openLoginPrompt, setOpenLoginPrompt] = useState(false);
  const [openDepositPrompt, setOpenDepositPrompt] = useState(false);
  const [openWithdrawnPopup, setOpenWithdrawnPopup] = useState(false);

  const [isWish, setIsWish] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const wishActionSeqRef = useRef(0);
  const wishInFlightRef = useRef(false);
  const wishDesiredRef = useRef(false);
  const wishServerRef = useRef(false);

  const [bidLoading, setBidLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const queryClient = useQueryClient();
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

  const auctionDetailQuery = useQuery({
    queryKey: queryKeys.auctions.detail(auctionId),
    queryFn: async () => {
      const res = await auctionApi.getAuctionDetail(auctionId as string);
      return res.data as AuctionDetailResponse;
    },
    enabled: !!auctionId,
    staleTime: 30_000,
    placeholderData: () =>
      queryClient.getQueryData(queryKeys.auctions.detail(auctionId)),
  });

  const participationQuery = useQuery({
    queryKey: queryKeys.auctions.participation(auctionId),
    queryFn: async () => {
      const res = await auctionApi.checkParticipationStatus(
        auctionId as string
      );
      return res.data as AuctionParticipationResponse;
    },
    enabled: !!auctionId && isAuthenticated,
    staleTime: 30_000,
  });

  const auctionDetail = auctionDetailQuery.data ?? null;
  const participationStatus = participationQuery.data ?? {
    isParticipated: false,
    isWithdrawn: false,
    isRefund: false,
  };
  const productId = auctionDetail?.productId;

  const wishlistQuery = useQuery({
    queryKey: queryKeys.wishlist.detail(user?.userId, productId),
    queryFn: async () => {
      if (!productId) return null;
      try {
        const res = await wishlistApi.getWishlistByProductId(productId);
        return res.data;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!productId && !!user?.userId,
    staleTime: 30_000,
    retry: false,
  });

  const productDetailQuery = useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: async () => {
      const response = await productApi.getProductById(productId as string);
      return response.data;
    },
    enabled: !!productId,
    staleTime: 30_000,
  });

  const updateWishlistCaches = useCallback(
    (nextDesired: boolean) => {
      if (!user?.userId || !productId) return;
      const userId = user.userId;
      const now = new Date().toISOString();
      const buildEntry = (
        overrides?: Partial<WishlistEntry>
      ): WishlistEntry => ({
        id: overrides?.id ?? `optimistic-${userId}-${productId}`,
        userId,
        productId,
        deletedYn: overrides?.deletedYn ?? "N",
        deletedAt: overrides?.deletedAt ?? null,
        createdBy: overrides?.createdBy ?? userId,
        createdAt: overrides?.createdAt ?? now,
        updatedBy: overrides?.updatedBy ?? userId,
        updatedAt: overrides?.updatedAt ?? now,
      });

      queryClient.setQueryData(
        queryKeys.wishlist.detail(userId, productId),
        (prev?: WishlistEntry | null) => {
          if (!nextDesired) return null;
          const base = prev ?? buildEntry();
          return {
            ...base,
            deletedYn: "N",
            deletedAt: null,
            updatedAt: now,
            updatedBy: userId,
          };
        }
      );

      queryClient.setQueryData(
        queryKeys.wishlist.list(userId),
        (
          prev:
            | {
                entries: WishlistEntry[];
                products: Product[];
              }
            | undefined
        ) => {
          if (!prev) return prev;
          if (nextDesired) {
            const exists = prev.entries.some(
              (entry) => entry.productId === productId
            );
            const nextEntries = exists
              ? prev.entries
              : [buildEntry(), ...prev.entries];
            const productForList = productDetailQuery.data;
            const nextProducts =
              productForList &&
              !prev.products.some((product) => product.id === productId)
                ? [productForList, ...prev.products]
                : prev.products;
            return { entries: nextEntries, products: nextProducts };
          }
          return {
            entries: prev.entries.filter(
              (entry) => entry.productId !== productId
            ),
            products: prev.products.filter(
              (product) => product.id !== productId
            ),
          };
        }
      );
    },
    [productDetailQuery.data, productId, queryClient, user?.userId]
  );

  useEffect(() => {
    if (!productId) return;
    if (!user) {
      setIsWish(false);
      wishDesiredRef.current = false;
      wishServerRef.current = false;
      return;
    }
    const exists = !!wishlistQuery.data && wishlistQuery.data.deletedYn !== "Y";
    setIsWish(exists);
    wishDesiredRef.current = exists;
    wishServerRef.current = exists;
  }, [productId, user, wishlistQuery.data]);

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
  }, [auctionDetail]);

  const productFileGroupId = productDetailQuery.data?.fileGroupId;
  const fileGroupQuery = useQuery({
    queryKey: queryKeys.files.group(productFileGroupId),
    queryFn: () => fileApi.getFiles(String(productFileGroupId)),
    enabled: !!productFileGroupId,
    staleTime: 30_000,
  });

  const productImageUrls = useMemo(() => {
    if (fileGroupQuery.isError) {
      return ["/images/fallback.png"];
    }
    const fileGroup = fileGroupQuery.data?.data;
    const fileUrls =
      fileGroup?.files
        ?.map((file) => file.filePath)
        .filter((path): path is string => !!path && path.length > 0) ?? [];
    return fileUrls.length > 0 ? fileUrls : getProductImageUrls();
  }, [fileGroupQuery.data, fileGroupQuery.isError, getProductImageUrls]);

  const sellerId = auctionDetail?.sellerId ?? productDetailQuery.data?.sellerId;
  const isSeller = !!user?.userId && !!sellerId && user.userId === sellerId;

  const bidHistoryQuery = useInfiniteQuery<
    PagedBidHistoryResponse,
    Error,
    InfiniteData<PagedBidHistoryResponse, number>,
    QueryKey,
    number
  >({
    queryKey: queryKeys.auctions.bidHistory(auctionId),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await auctionApi.getAuctionBidHistory(
        auctionId as string,
        {
          page: pageParam,
          size: 20,
        }
      );
      return response.data;
    },
    initialPageParam: 0,
    enabled: !!auctionId && isAuthenticated,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : (lastPage.number ?? 0) + 1,
    staleTime: 30_000,
  });

  const bidHistory = useMemo(() => {
    const pages = bidHistoryQuery.data?.pages ?? [];
    const merged = pages.flatMap((page) => page?.content ?? []);
    return merged;
  }, [bidHistoryQuery.data?.pages]);

  const refreshBidHistoryFirstPage = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.auctions.bidHistory(auctionId),
    });
  }, [auctionId, queryClient]);

  const errorMessage = useMemo(() => {
    if (!auctionDetailQuery.isError) return null;
    return getErrorMessage(
      auctionDetailQuery.error,
      "경매 상세 정보를 불러오는 데 실패했습니다."
    );
  }, [auctionDetailQuery.error, auctionDetailQuery.isError]);

  const participationErrorMessage = useMemo(() => {
    if (!participationQuery.isError) return null;
    return getErrorMessage(
      participationQuery.error,
      "참여 내역을 불러오지 못했습니다."
    );
  }, [participationQuery.error, participationQuery.isError]);

  const bidHistoryErrorMessage = useMemo(() => {
    if (!isAuthenticated || !bidHistoryQuery.isError) return null;
    return getErrorMessage(
      bidHistoryQuery.error,
      "실시간 입찰 내역을 불러오지 못했습니다."
    );
  }, [bidHistoryQuery.error, bidHistoryQuery.isError, isAuthenticated]);

  const hasBidHistory = bidHistory.length > 0;
  const showBidHistoryWarning = !!bidHistoryErrorMessage && hasBidHistory;
  const showParticipationWarning =
    !!participationErrorMessage && !!participationQuery.data;
  const showAuctionDetailWarning = !!errorMessage && !!auctionDetail;
  const shouldBlockDetail = !!errorMessage && !auctionDetail;
  const isBidHistoryLoading =
    bidHistoryQuery.isLoading && bidHistory.length === 0;
  const isParticipationLoading =
    participationQuery.isLoading && isAuthenticated;
  const isParticipationUnavailable =
    isAuthenticated && !!participationErrorMessage;

  useEffect(() => {
    const highestUserId = auctionDetail?.highestUserId ?? undefined;
    if (!highestUserId) return;
    setHighestBidderInfo((prev) =>
      prev?.id === highestUserId ? prev : { id: highestUserId, username: "" }
    );
  }, [auctionDetail?.highestUserId]);

  const bidderUserIds = useMemo(() => {
    const ids = bidHistory
      .map((bid) => bid.highestUserId)
      .filter((id): id is string => !!id);
    if (auctionDetail?.highestUserId) {
      ids.push(auctionDetail.highestUserId);
    }
    if (highestBidderInfo?.id) {
      ids.push(highestBidderInfo.id);
    }
    return Array.from(new Set(ids));
  }, [auctionDetail?.highestUserId, bidHistory, highestBidderInfo?.id]);

  const cachedUsers = useMemo(() => {
    const map = new Map<string, User>();
    bidderUserIds.forEach((id) => {
      const cached = queryClient.getQueryData<User>(queryKeys.user.detail(id));
      if (cached) {
        map.set(id, cached);
      }
    });
    return map;
  }, [bidderUserIds, queryClient]);

  const missingUserIds = useMemo(() => {
    return bidderUserIds.filter((id) => {
      const cached = cachedUsers.get(id);
      if (!cached) return true;
      return !cached.email;
    });
  }, [bidderUserIds, cachedUsers]);

  const usersQuery = useQuery({
    queryKey: queryKeys.user.many(missingUserIds),
    queryFn: async () => {
      const response = await userApi.getUsersByIds(missingUserIds);
      const users = response.data ?? [];
      users.forEach((userInfo) => {
        if (!userInfo?.userId) return;
        queryClient.setQueryData(
          queryKeys.user.detail(userInfo.userId),
          userInfo
        );
      });
      return users;
    },
    enabled: missingUserIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const userLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    cachedUsers.forEach((userInfo, userId) => {
      const nickname = userInfo.nickname?.trim();
      const email = userInfo.email?.trim();
      if (nickname && email) {
        map.set(userId, `${nickname} (${email})`);
      } else if (nickname) {
        map.set(userId, nickname);
      } else if (email) {
        map.set(userId, email);
      }
    });
    (usersQuery.data ?? []).forEach((userInfo) => {
      if (!userInfo?.userId) return;
      const nickname = userInfo.nickname?.trim();
      const email = userInfo.email?.trim();
      if (nickname && email) {
        map.set(userInfo.userId, `${nickname} (${email})`);
      } else if (nickname) {
        map.set(userInfo.userId, nickname);
      } else if (email) {
        map.set(userInfo.userId, email);
      }
    });
    return map;
  }, [cachedUsers, usersQuery.data]);

  const getBidderLabel = useCallback(
    (userId?: string, fallbackName?: string) => {
      if (!userId) return "-";
      const label = userLabelMap.get(userId);
      if (label) return label;
      if (fallbackName) return fallbackName;
      return null;
    },
    [userLabelMap]
  );

  const isUserInfoLoading = missingUserIds.length > 0 && usersQuery.isLoading;

  const resolvedHighestBidderId =
    auctionDetail?.highestUserId ?? highestBidderInfo?.id;
  const resolvedHighestBidderLabel = getBidderLabel(
    resolvedHighestBidderId,
    highestBidderInfo?.username
  );

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
            setHighestBidderInfo({
              id: payload.highestUserId,
              username: payload.highestUsername,
            });
            setCurrentUserCount(payload.currentUsers);
            queryClient.setQueryData(
              queryKeys.auctions.detail(auctionId),
              (prev: AuctionDetailResponse | undefined) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  currentBid: payload.bidPrice,
                  highestUserId: payload.highestUserId ?? prev.highestUserId,
                };
              }
            );
            queryClient.setQueryData(
              queryKeys.auctions.bidHistory(auctionId),
              (
                prev: InfiniteData<PagedBidHistoryResponse, number> | undefined
              ) => {
                if (!prev?.pages) return prev;
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
                const firstPage = prev.pages[0];
                if (!firstPage) return prev;
                const firstContent = firstPage?.content ?? [];
                if (
                  firstContent.some((bid) => bid.bidSrno === newBid.bidSrno)
                ) {
                  return prev;
                }
                return {
                  ...prev,
                  pages: [
                    { ...firstPage, content: [newBid, ...firstContent] },
                    ...prev.pages.slice(1),
                  ],
                };
              }
            );
            break;
          default:
            break;
        }
      } catch (e) {
        console.error("메시지 파싱 오류:", e);
      }
    },
    [auctionId, queryClient]
  );

  const shouldConnect =
    auctionDetail?.status === AuctionStatus.IN_PROGRESS && !!auctionId;
  const { isConnected, isRetrying, connectionState } = useStomp({
    topic: shouldConnect ? `/topic/auction.${auctionId}` : "",
    onMessage: handleNewMessage,
  });

  const hasAnyBid = (auctionDetail?.currentBid ?? 0) > 0;
  const currentBidPrice =
    auctionDetail == null
      ? 0
      : hasAnyBid
      ? auctionDetail.currentBid
      : auctionDetail.startBid;
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
    if (isSeller) {
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
          `첫 입찰 금액은 시작가(${formatWon(
            auctionDetail.startBid
          )}) 이상이어야 합니다.`
        );
        return;
      }
      if (hasAnyBid && bid <= currentBidPrice) {
        alert(
          `입찰 금액은 최고입찰가(${formatWon(
            currentBidPrice
          )})보다 높아야 합니다.`
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

      queryClient.setQueryData(
        queryKeys.auctions.participation(auctionId),
        (prev: AuctionParticipationResponse | undefined) => ({
          ...(prev ?? {
            isParticipated: true,
            isWithdrawn: false,
            isRefund: false,
          }),
          lastBidPrice: bid,
        })
      );

      const shouldFallbackRefetch =
        connectionState === "disconnected" || connectionState === "failed";
      if (shouldFallbackRefetch) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.auctions.detail(auctionId),
        });
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

      queryClient.setQueryData(
        queryKeys.auctions.participation(auctionId),
        res.data
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.balance(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.account(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.historyAll(),
        }),
      ]);
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

      if ((account?.data?.balance ?? 0) < depositAmount) {
        const balance = Number(account?.data?.balance ?? 0);
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

      queryClient.setQueryData(
        queryKeys.deposit.balance(),
        (prev: number | undefined) => {
          const base = typeof prev === "number" ? prev : 0;
          const next = Math.max(base - depositAmount, 0);
          localStorage.setItem("depositBalance", String(next));
          return next;
        }
      );

      queryClient.setQueryData(
        queryKeys.auctions.participation(auctionId),
        res.data
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.account(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.historyAll(),
        }),
      ]);
      setOpenDepositPrompt(false);
      alert("보증금 결제가 완료되었습니다. 이제 입찰할 수 있습니다.");
    } catch (error: any) {
      alert(error?.data?.message ?? "보증금 결제중 에러가 발생했습니다.");
    } finally {
      setDepositLoading(false);
    }
  };

  if (auctionDetailQuery.isLoading)
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
  const canRenderDetail = !!auctionDetail;
  const showSocketWarning = shouldConnect && connectionState === "failed";

  const isAuctionInProgress =
    auctionDetail?.status === AuctionStatus.IN_PROGRESS;
  const isAuctionInReday = auctionDetail?.status === AuctionStatus.READY;
  const canEdit =
    auctionDetail?.status === AuctionStatus.READY &&
    user &&
    user?.userId === auctionDetail.sellerId;

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
                  {bidHistoryErrorMessage && !hasBidHistory ? (
                    <Alert severity="error">{bidHistoryErrorMessage}</Alert>
                  ) : isBidHistoryLoading ? (
                    <Stack spacing={1}>
                      <Skeleton variant="text" width="60%" />
                      <Skeleton variant="text" width="45%" />
                      <Skeleton variant="text" width="70%" />
                    </Stack>
                  ) : (
                    <>
                      {showBidHistoryWarning && (
                        <Alert severity="warning" sx={{ mb: 1 }}>
                          {bidHistoryErrorMessage}
                        </Alert>
                      )}
                      <BidHistory
                        isAuthenticated={isAuthenticated}
                        bidHistory={bidHistory}
                        fetchMoreHistory={() => bidHistoryQuery.fetchNextPage()}
                        hasMore={!!bidHistoryQuery.hasNextPage}
                        getBidderLabel={getBidderLabel}
                        isBidderLoading={isUserInfoLoading}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader title="참여 현황" />

                <CardContent>
                  {participationErrorMessage && !participationQuery.data ? (
                    <Alert severity="error">{participationErrorMessage}</Alert>
                  ) : !isAuthenticated ? (
                    <Alert severity="info">
                      로그인 후 참여 현황을 확인할 수 있습니다.
                    </Alert>
                  ) : isParticipationLoading ? (
                    <Stack spacing={1}>
                      <Skeleton variant="text" width="55%" />
                      <Skeleton variant="text" width="70%" />
                      <Skeleton variant="text" width="40%" />
                    </Stack>
                  ) : canRenderDetail ? (
                    <>
                      {showParticipationWarning && (
                        <Alert severity="warning" sx={{ mb: 1 }}>
                          {participationErrorMessage}
                        </Alert>
                      )}
                      <AuctionParticipationStatus
                        participationStatus={participationStatus}
                        depositAmount={auctionDetail.depositAmount}
                        auctionStatus={auctionDetail.status}
                        highestUserId={auctionDetail.highestUserId}
                        currentUserId={user?.userId}
                        setOpenPopup={() => setOpenWithdrawnPopup(true)}
                        refundRequest={refundRequest}
                      />
                    </>
                  ) : (
                    <Alert severity="error">
                      경매 정보를 불러오지 못했습니다.
                    </Alert>
                  )}
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
                  disabled={!canRenderDetail}
                >
                  상품 정보
                </Button>
              }
            />
            <CardContent>
              <Stack spacing={2}>
                {shouldBlockDetail ? (
                  <Alert severity="error">{errorMessage}</Alert>
                ) : canRenderDetail ? (
                  <>
                    {showAuctionDetailWarning && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        {errorMessage}
                      </Alert>
                    )}
                    <AuctionInfoPanel
                      productName={
                        auctionDetail.productName ?? "TODO : auctionDetail"
                      }
                      status={auctionDetail.status}
                      isAuctionInProgress={isAuctionInProgress}
                      isConnected={isConnected}
                      isRetrying={isRetrying}
                      showConnectionStatus={shouldConnect}
                    />
                  </>
                ) : (
                  <Alert severity="error">
                    경매 정보를 불러오지 못했습니다.
                  </Alert>
                )}
                <Divider />
                {canRenderDetail ? (
                  <AuctionBiddingPanel
                    status={auctionDetail.status}
                    currentBidPrice={currentBidPrice}
                    hasAnyBid={hasAnyBid}
                    highestBidderId={resolvedHighestBidderId}
                    highestBidderLabel={resolvedHighestBidderLabel}
                    isBidderLoading={isUserInfoLoading}
                    currentUserCount={currentUserCount}
                    auctionEndAt={auctionDetail.auctionEndAt}
                    auctionStartAt={auctionDetail.auctionStartAt}
                    startBid={auctionDetail.startBid}
                  />
                ) : (
                  <Alert severity="info">경매 정보를 불러오는 중입니다.</Alert>
                )}
                <Divider />
                {canRenderDetail ? (
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
                    showConnectionStatus={shouldConnect}
                    isRetrying={isRetrying}
                    isWithdrawn={participationStatus.isWithdrawn}
                    isAuthenticated={isAuthenticated}
                    isParticipationUnavailable={isParticipationUnavailable}
                    isSeller={isSeller}
                  />
                ) : (
                  <Alert severity="info">
                    경매 정보를 불러오면 입찰할 수 있습니다.
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Container>

      <Container
        maxWidth={false}
        sx={{
          px: { xs: 2, md: 4 },
          mb: 6,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              비슷한 경매
            </Typography>
            <Typography variant="body2" color="text.secondary">
              이 경매와 비슷한 항목을 추천해 드려요.
            </Typography>
          </Box>
          <Button size="small" disabled>
            더 보기 (준비 중)
          </Button>
        </Stack>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 4,
          }}
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <Card
              key={`similar-auction-${idx}`}
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <Skeleton variant="rectangular" height={200} />
              <CardContent
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  mt: 1,
                }}
              >
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="50%" />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>

      <AuctionDialogs
        openLoginPrompt={openLoginPrompt}
        setOpenLoginPrompt={setOpenLoginPrompt}
        handleCloseLoginPrompt={handleCloseLoginPrompt}
        openDepositPrompt={openDepositPrompt}
        setOpenDepositPrompt={setOpenDepositPrompt}
        handleCloseDepositPrompt={handleCloseDepositPrompt}
        depositAmount={auctionDetail?.depositAmount ?? 0}
        isDepositLoading={depositLoading}
        openWithdrawnPopup={openWithdrawnPopup}
        setOpenWithdrawnPopup={setOpenWithdrawnPopup}
        handleWithdraw={handleWithdraw}
        isCurrentUserHighestBidder={resolvedHighestBidderId === user?.userId}
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
            부족 금액: {formatWon(insufficientDepositInfo?.shortage ?? 0)}
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
            if (depositOrder?.data?.orderId && auctionId) {
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
              requestTossPayment(
                depositOrder.data.orderId,
                depositOrder.data.amount
              );
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
          sx: {
            width: { xs: "100%", sm: 420 },
            p: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          },
        }}
      >
        <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          <Stack direction="row" justifyContent="space-between">
            <Button
              variant="outlined"
              onClick={() => setProductDrawerOpen(false)}
            >
              닫기
            </Button>
            <Button
              variant="contained"
              onClick={() =>
                auctionDetail &&
                navigate(`/products/${auctionDetail.productId}`)
              }
              disabled={!auctionDetail}
            >
              상품 상세보기
            </Button>
          </Stack>
          {productDetailQuery.isLoading ? (
            <Stack spacing={2}>
              <Skeleton variant="rectangular" height={300} />
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="90%" />
              <Skeleton variant="text" width="80%" />
            </Stack>
          ) : productDetailQuery.isError ? (
            <Alert severity="error">상품 정보를 불러오지 못했습니다.</Alert>
          ) : (
            <>
              {fileGroupQuery.isError && (
                <Alert severity="warning">이미지 로드에 실패했습니다.</Alert>
              )}
              <ProductInfo
                imageUrls={productImageUrls}
                productName={
                  productDetailQuery.data?.name ??
                  auctionDetail?.productName ??
                  ""
                }
                description={
                  productDetailQuery.data?.description ??
                  auctionDetail?.description ??
                  ""
                }
                action={
                  <IconButton
                    size="small"
                    onClick={async () => {
                      if (!user) {
                        alert("로그인 후 찜하기를 사용할 수 있습니다.");
                        navigate("/login");
                        return;
                      }
                      if (!productId) return;

                      wishActionSeqRef.current += 1;
                      const seqAtClick = wishActionSeqRef.current;

                      const nextDesired = !wishDesiredRef.current;
                      wishDesiredRef.current = nextDesired;
                      setIsWish(nextDesired);
                      updateWishlistCaches(nextDesired);

                      if (wishInFlightRef.current) return;
                      wishInFlightRef.current = true;
                      setWishLoading(true);

                      try {
                        while (
                          wishServerRef.current !== wishDesiredRef.current
                        ) {
                          const target = wishDesiredRef.current;
                          if (target) {
                            await wishlistApi.add(productId);
                          } else {
                            await wishlistApi.remove(productId);
                          }
                          wishServerRef.current = target;
                          updateWishlistCaches(target);
                        }
                      } catch (err: any) {
                        console.error("찜 토글 실패:", err);
                        if (wishActionSeqRef.current === seqAtClick) {
                          wishDesiredRef.current = wishServerRef.current;
                          setIsWish(wishServerRef.current);
                          updateWishlistCaches(wishServerRef.current);
                        }
                        alert(
                          err?.response?.data?.message ??
                            "찜하기 처리 중 오류가 발생했습니다."
                        );
                      } finally {
                        wishInFlightRef.current = false;
                        if (wishActionSeqRef.current === seqAtClick) {
                          setWishLoading(false);
                        }
                      }
                    }}
                    disabled={wishLoading}
                  >
                    {isWish ? (
                      <FavoriteIcon color="error" fontSize="small" />
                    ) : (
                      <FavoriteBorderIcon fontSize="small" />
                    )}
                  </IconButton>
                }
              />
            </>
          )}
        </Stack>
      </Drawer>
    </>
  );
};

export default AuctionDetail;
