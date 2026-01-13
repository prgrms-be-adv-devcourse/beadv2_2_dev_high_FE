import React from "react";
import {
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
  Paper,
  Skeleton,
} from "@mui/material";
import {
  Gavel as GavelIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import AuctionList from "@/features/auctions/components/AuctionList";
import {
  hasRole,
  UserRole,
  AuctionStatus,
  type AuctionRankingResponse,
  type Product,
} from "@moreauction/types";
import { useAuth } from "@moreauction/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auctionApi } from "@/apis/auctionApi";
import { productApi } from "@/apis/productApi";
import { queryKeys } from "@/shared/queries/queryKeys";
import { formatWon, getAuctionStatusText } from "@moreauction/utils";
import RemainingTime from "@/shared/components/RemainingTime";

// 홈: 상단 히어로 섹션 + 상품 목록
const Home: React.FC = () => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isSeller = hasRole(user?.roles, UserRole.SELLER);

  let secondaryLabel = "판매자 등록하기";
  let secondaryTo: string = "/seller/register";

  if (!isAuthenticated) {
    secondaryLabel = "판매자 등록 안내";
    secondaryTo = "/login";
  } else if (isSeller) {
    secondaryLabel = "상품 등록하기";
    secondaryTo = "/products/new";
  }

  const topAuctionsQuery = useQuery({
    queryKey: queryKeys.auctions.topToday(3),
    queryFn: async () => {
      const res = await auctionApi.getTopAuctions(3);
      const items = res.data as AuctionRankingResponse[];
      if (!items.length) return items;

      const productIds = Array.from(
        new Set(items.map((item) => item.auction.productId).filter(Boolean))
      );
      const cachedProducts = productIds
        .map((productId) =>
          queryClient.getQueryData<Product>(
            queryKeys.products.detail(productId)
          )
        )
        .filter((product): product is Product => !!product);
      const cachedMap = new Map(
        cachedProducts.map((product) => [product.id, product])
      );
      const missingProductIds = productIds.filter(
        (productId) => !cachedMap.has(productId)
      );

      const fetchedProducts = missingProductIds.length
        ? await Promise.all(
            missingProductIds.map(async (productId) => {
              try {
                const detail = await productApi.getProductById(productId);
                queryClient.setQueryData(
                  queryKeys.products.detail(productId),
                  detail.data
                );
                return detail.data as Product;
              } catch (err) {
                console.error("상품명 조회 실패:", productId, err);
                return null;
              }
            })
          )
        : [];
      fetchedProducts
        .filter((product): product is Product => !!product)
        .forEach((product) => cachedMap.set(product.id, product));

      return items.map((item) => {
        const product = cachedMap.get(item.auction.productId);
        if (!product?.name) return item;
        return {
          ...item,
          auction: {
            ...item.auction,
            productName: product.name,
          },
        };
      });
    },
    staleTime: 30_000,
  });

  const topAuctions = topAuctionsQuery.data ?? [];
  const [carouselIndex, setCarouselIndex] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(true);
  const [isAutoPaused, setIsAutoPaused] = React.useState(false);
  const [isCarouselHover, setIsCarouselHover] = React.useState(false);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const resumeTimeoutRef = React.useRef<number | null>(null);
  const intervalRef = React.useRef<number | null>(null);
  const transitionTimeoutRef = React.useRef<number | null>(null);
  const transitionLockRef = React.useRef(false);
  const lastTickAtRef = React.useRef<number | null>(null);
  const remainingMsRef = React.useRef<number>(5000);
  const hasCarousel = topAuctions.length > 1;
  const loopedAuctions = hasCarousel
    ? [topAuctions[topAuctions.length - 1], ...topAuctions, topAuctions[0]]
    : topAuctions;
  const gapSize = 16;
  const carouselHeight = isMdUp ? 250 : 230;
  const effectiveSlideHeight = Math.floor(carouselHeight * 0.82);

  const releaseTransitionLock = () => {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    transitionLockRef.current = false;
    setIsTransitioning(false);
  };

  const startTransitionLock = () => {
    if (!isAnimating) return;
    transitionLockRef.current = true;
    setIsTransitioning(true);
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = window.setTimeout(() => {
      releaseTransitionLock();
    }, 800);
  };

  React.useEffect(() => {
    if (!hasCarousel) {
      setCarouselIndex(0);
      return;
    }
    setCarouselIndex(1);
    setIsAnimating(true);
  }, [hasCarousel, topAuctions.length]);

  React.useEffect(() => {
    if (!hasCarousel) return;
    if (isAutoPaused) return;
    if (intervalRef.current !== null) return;
    const startInterval = () => {
      intervalRef.current = window.setInterval(() => {
        if (transitionLockRef.current) return;
        lastTickAtRef.current = Date.now();
        remainingMsRef.current = 5000;
        startTransitionLock();
        setCarouselIndex((prev) => prev + 1);
      }, 5000);
    };

    if (remainingMsRef.current < 5000) {
      resumeTimeoutRef.current = window.setTimeout(() => {
        if (transitionLockRef.current) return;
        lastTickAtRef.current = Date.now();
        remainingMsRef.current = 5000;
        startTransitionLock();
        setCarouselIndex((prev) => prev + 1);
        resumeTimeoutRef.current = null;
        startInterval();
      }, remainingMsRef.current);
    } else {
      lastTickAtRef.current = Date.now();
      startInterval();
    }

    return () => {
      if (resumeTimeoutRef.current !== null) {
        window.clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [hasCarousel, isAutoPaused]);
  const handleCarouselTransitionEnd = () => {
    if (!hasCarousel) return;
    releaseTransitionLock();
    if (carouselIndex === 0) {
      setIsAnimating(false);
      setCarouselIndex(topAuctions.length);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setIsAnimating(true))
      );
    } else if (carouselIndex === topAuctions.length + 1) {
      setIsAnimating(false);
      setCarouselIndex(1);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setIsAnimating(true))
      );
    }
  };

  const handlePrev = () => {
    if (!hasCarousel) return;
    if (transitionLockRef.current) return;
    startTransitionLock();
    setCarouselIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    if (!hasCarousel) return;
    if (transitionLockRef.current) return;
    startTransitionLock();
    setCarouselIndex((prev) => Math.min(prev + 1, topAuctions.length + 1));
  };

  const getRankLabel = (index: number) => {
    if (!hasCarousel) return "#1";
    if (index === 0) return `#${topAuctions.length}`;
    if (index === topAuctions.length + 1) return "#1";
    return `#${index}`;
  };
  return (
    <>
      <Box
        sx={{
          py: { xs: 5, md: 6 },
          background: (t) =>
            t.palette.mode === "light"
              ? "radial-gradient(circle at 0% 0%, #dbeafe 0, #eff6ff 45%, #f9fafb 100%)"
              : "radial-gradient(circle at 0% 0%, #0f172a 0, #020617 55%, #000 100%)",
          borderBottom: "1px solid",
          borderColor:
            theme.palette.mode === "light"
              ? "rgba(15, 23, 42, 0.06)"
              : "rgba(148, 163, 184, 0.25)",
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={4}
          >
            <Box flex={1}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  letterSpacing: "-0.03em",
                }}
              >
                실시간 경매로
                <br />
                원하는 상품을 만나보세요.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                판매자는 손쉽게 상품을 등록하고, 구매자는 진행 중인 경매를
                한눈에 확인할 수 있습니다. 지금 바로 경매를 시작해 보세요.
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  component={RouterLink}
                  to="/search"
                  startIcon={<GavelIcon />}
                >
                  상품 둘러보기
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  size="large"
                  component={RouterLink}
                  to={secondaryTo}
                >
                  {secondaryLabel}
                </Button>
              </Stack>
            </Box>
            <Box flex={1}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderRadius: 3.5,
                  border: "1px solid",
                  borderColor:
                    theme.palette.mode === "light"
                      ? "rgba(15, 23, 42, 0.04)"
                      : "rgba(148, 163, 184, 0.12)",
                  boxShadow: "none",
                  background:
                    theme.palette.mode === "light"
                      ? "linear-gradient(140deg, rgba(255,255,255,0.96), rgba(239,246,255,0.92))"
                      : "linear-gradient(140deg, rgba(15,23,42,0.9), rgba(2,6,23,0.92))",
                }}
              >
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(14,165,233,0.85))",
                          boxShadow: "0 10px 20px rgba(59,130,246,0.25)",
                        }}
                      >
                        <GavelIcon sx={{ color: "#fff", fontSize: 22 }} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={800}>
                        오늘의 인기 경매 TOP 3
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        onClick={handlePrev}
                        disabled={!hasCarousel || isTransitioning}
                        aria-label="이전 인기 경매"
                      >
                        <ExpandLessIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={handleNext}
                        disabled={!hasCarousel || isTransitioning}
                        aria-label="다음 인기 경매"
                      >
                        <ExpandMoreIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                  {topAuctionsQuery.isLoading ? (
                    <Stack spacing={1.5}>
                      <Skeleton variant="rounded" height={140} />
                    </Stack>
                  ) : loopedAuctions.length > 0 ? (
                    <Box
                      sx={{
                        position: "relative",
                        overflow: "hidden",
                        height: carouselHeight,
                        py: 0.5,
                        px: 2,
                        pt: 2,
                        boxSizing: "border-box",
                        perspective: 1000,
                      }}
                      onMouseEnter={() => {
                        if (lastTickAtRef.current) {
                          const elapsed = Date.now() - lastTickAtRef.current;
                          remainingMsRef.current = Math.max(0, 5000 - elapsed);
                        }
                        setIsCarouselHover(true);
                        setIsAutoPaused(true);
                      }}
                      onMouseLeave={() => {
                        setIsAutoPaused(false);
                        setIsCarouselHover(false);
                      }}
                    >
                      <Box
                        sx={{
                          position: "relative",
                          height: "100%",
                          transformStyle: "preserve-3d",
                        }}
                      >
                        {loopedAuctions.map((item, idx) => {
                          const auction = item.auction;
                          const label = getRankLabel(idx);
                          const offset = idx - carouselIndex;
                          const absOffset = Math.abs(offset);
                          const isActive = offset === 0;
                          const isHovered = hoveredIndex === idx && isActive;
                          const currentBidValue =
                            auction.currentBid != null && auction.currentBid > 0
                              ? auction.currentBid
                              : auction.startBid;
                          const scale =
                            absOffset === 0
                              ? 1.01
                              : absOffset === 1
                              ? 0.96
                              : 0.92;
                          const opacity =
                            absOffset === 0 ? 1 : absOffset === 1 ? 0.7 : 0.45;
                          const depth = absOffset === 0 ? 40 : -80 * absOffset;
                          const zIndex = Math.max(1, 10 - absOffset);
                          const yOffset =
                            offset * (effectiveSlideHeight * 0.38);
                          return (
                            <Paper
                              key={`top-auction-slide-${auction.id}-${idx}`}
                              elevation={0}
                              onTransitionEnd={
                                isActive
                                  ? (event) => {
                                      if (event.propertyName !== "transform") {
                                        return;
                                      }
                                      handleCarouselTransitionEnd();
                                    }
                                  : undefined
                              }
                              sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: `${effectiveSlideHeight}px`,
                                p: 2.25,
                                borderRadius: 3,
                                border: "1px solid",
                                borderColor: isHovered
                                  ? theme.palette.primary.main
                                  : theme.palette.mode === "light"
                                  ? "rgba(148, 163, 184, 0.35)"
                                  : "rgba(148, 163, 184, 0.35)",
                                boxShadow: isHovered
                                  ? "0 14px 28px rgba(15, 23, 42, 0.12)"
                                  : "none",
                                background:
                                  theme.palette.mode === "light"
                                    ? "rgba(255, 255, 255, 0.96)"
                                    : "rgba(15, 23, 42, 0.85)",
                                transform: `translate3d(0px, ${yOffset}px, ${depth}px) scale(${scale})`,
                                opacity,
                                zIndex,
                                outline: "none",
                                cursor: isActive ? "pointer" : "default",
                                pointerEvents: isActive ? "auto" : "none",
                                transition: isAnimating
                                  ? "transform 600ms ease, opacity 600ms ease, box-shadow 600ms ease, border-color 200ms ease"
                                  : "none",
                              }}
                              onMouseEnter={() => {
                                if (isActive) setHoveredIndex(idx);
                              }}
                              onMouseLeave={() => {
                                if (isActive) setHoveredIndex(null);
                              }}
                              onClick={() => {
                                if (!isActive) return;
                                const id = auction.id || auction.auctionId;
                                if (id) navigate(`/auctions/${id}`);
                              }}
                            >
                              <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{ mb: 0.5 }}
                              >
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={1}
                                >
                                  <Typography
                                    variant="overline"
                                    color="primary"
                                    sx={{ fontWeight: 700 }}
                                  >
                                    {label}
                                  </Typography>
                                  {isActive && isCarouselHover && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontWeight: 700 }}
                                    >
                                      자동 회전 일시정지
                                    </Typography>
                                  )}
                                </Stack>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  조회 {item.viewCount ?? 0}
                                </Typography>
                              </Stack>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 800,
                                  mb: 0.75,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {auction.productName ?? "상품명 미확인"}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  남은 시간
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 700 }}
                                >
                                  <RemainingTime
                                    auctionStartAt={auction.auctionStartAt}
                                    auctionEndAt={auction.auctionEndAt}
                                    status={auction.status}
                                  />
                                </Typography>
                              </Stack>
                              <Box
                                sx={{
                                  mt: 1.5,
                                  p: 1.5,
                                  borderRadius: 2,
                                  bgcolor:
                                    theme.palette.mode === "light"
                                      ? "rgba(59, 130, 246, 0.08)"
                                      : "rgba(59, 130, 246, 0.18)",
                                }}
                              >
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    fontWeight: 800,
                                    color: "primary.main",
                                  }}
                                >
                                  현재가 {formatWon(currentBidValue)}
                                </Typography>
                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  sx={{ mt: 0.5 }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    시작가 {formatWon(auction.startBid)}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    보증금{" "}
                                    {auction.depositAmount != null
                                      ? formatWon(auction.depositAmount)
                                      : "-"}
                                  </Typography>
                                </Stack>
                              </Box>
                            </Paper>
                          );
                        })}
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      오늘의 인기 경매가 아직 없습니다.
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Box sx={{ py: 6 }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                개인 맞춤 추천
              </Typography>
              <Typography variant="body2" color="text.secondary">
                관심 상품과 활동을 바탕으로 추천 경매를 보여줄 예정입니다.
              </Typography>
            </Box>
            <Button size="small" disabled>
              추천 더 보기 (준비 중)
            </Button>
          </Stack>

          {isAuthenticated ? (
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
                <Paper
                  key={`ai-reco-${idx}`}
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor:
                      theme.palette.mode === "light"
                        ? "rgba(15, 23, 42, 0.08)"
                        : "rgba(148, 163, 184, 0.2)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Skeleton variant="rectangular" height={200} />
                  <Box sx={{ p: 2 }}>
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="50%" />
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px dashed",
                borderColor:
                  theme.palette.mode === "light"
                    ? "rgba(15, 23, 42, 0.25)"
                    : "rgba(148, 163, 184, 0.3)",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                로그인하고 맞춤 추천을 확인하세요
              </Typography>
              <Typography variant="body2" color="text.secondary">
                로그인하면 관심 경매와 유사한 상품을 더 빠르게 찾을 수 있어요.
              </Typography>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                sx={{ mt: 2 }}
              >
                로그인하기
              </Button>
            </Paper>
          )}
        </Container>
      </Box>

      {/* 진행 중인 경매 하이라이트 섹션 */}
      <Box sx={{ py: 6 }}>
        <Container maxWidth="lg">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-end"
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                지금 진행 중인 경매
              </Typography>
              <Typography variant="body2" color="text.secondary">
                마감이 가까운 경매를 한눈에 살펴보세요.
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/search?status=IN_PROGRESS"
              size="small"
            >
              더 찾아보기
            </Button>
          </Stack>

          <AuctionList
            status={[AuctionStatus.IN_PROGRESS]}
            showEmptyState
            emptyTitle="현재 진행 중인 경매가 없습니다"
            emptyDescription="곧 새로운 경매가 열릴 예정입니다. 알림을 켜두고 가장 먼저 확인해보세요."
          />
        </Container>
      </Box>
      <Box sx={{ py: 6 }}>
        <Container maxWidth="lg">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-end"
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                곧 시작하는 경매
              </Typography>
              <Typography variant="body2" color="text.secondary">
                곧 시작 예정인 경매를 미리 확인해 보세요.
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/search?status=READY"
              size="small"
            >
              더 찾아보기
            </Button>
          </Stack>

          <AuctionList
            status={[AuctionStatus.READY]}
            showEmptyState
            emptyTitle="곧 시작하는 경매가 없습니다"
            emptyDescription="원하는 상품을 검색하거나 찜을 등록해두면 시작 알림을 받아볼 수 있습니다."
          />
        </Container>
      </Box>
      {/* 서비스 특징 요약 섹션 */}
      <Box
        sx={{
          py: 6,
          borderTop: "1px solid",
          borderColor:
            theme.palette.mode === "light"
              ? "rgba(15, 23, 42, 0.06)"
              : "rgba(148, 163, 184, 0.25)",
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h6"
            sx={{ mb: 3, fontWeight: 700, textAlign: "center" }}
          >
            More Auction 이렇게 이용해 보세요
          </Typography>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems="stretch"
          >
            <Paper
              elevation={1}
              sx={{ p: 3, flex: 1, display: "flex", flexDirection: "column" }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                1. 경매 둘러보기
              </Typography>
              <Typography variant="body2" color="text.secondary">
                홈과 검색 화면에서 진행 중/예정 경매를 확인하고 관심 있는 상품을
                찜해 두세요.
              </Typography>
            </Paper>
            <Paper
              elevation={1}
              sx={{ p: 3, flex: 1, display: "flex", flexDirection: "column" }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                2. 예치금 충전 후 입찰
              </Typography>
              <Typography variant="body2" color="text.secondary">
                마이페이지에서 예치금을 충전한 뒤, 실시간 경매에 참여해 원하는
                가격에 입찰할 수 있습니다.
              </Typography>
            </Paper>
            <Paper
              elevation={1}
              sx={{ p: 3, flex: 1, display: "flex", flexDirection: "column" }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                3. 낙찰 및 정산
              </Typography>
              <Typography variant="body2" color="text.secondary">
                낙찰 후 주문/정산 내역을 통해 거래 현황을 확인하고, 판매자는
                정산 내역에서 입금 정보를 확인할 수 있습니다.
              </Typography>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default Home;
