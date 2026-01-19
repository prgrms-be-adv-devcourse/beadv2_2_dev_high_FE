import React from "react";
import {
  Box,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Gavel as GavelIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { formatWon } from "@moreauction/utils";
import RemainingTime from "@/shared/components/RemainingTime";
import AnimatedNumber from "@/features/home/components/AnimatedNumber";
import { useTopAuctions } from "@/features/home/hooks/useTopAuctions";

const TopAuctionsCarousel: React.FC = () => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const navigate = useNavigate();
  const topAuctionsQuery = useTopAuctions(3);
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
            <Skeleton variant="rounded" height={effectiveSlideHeight} />
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
                  absOffset === 0 ? 1.01 : absOffset === 1 ? 0.96 : 0.92;
                const opacity =
                  absOffset === 0 ? 1 : absOffset === 1 ? 0.7 : 0.45;
                const depth = absOffset === 0 ? 40 : -80 * absOffset;
                const zIndex = Math.max(1, 10 - absOffset);
                const yOffset = offset * (effectiveSlideHeight * 0.38);
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
                          ? "rgba(255, 255, 255, 0.98)"
                          : "rgba(2, 6, 23, 0.98)",
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
                      <Stack direction="row" alignItems="center" spacing={1}>
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
                      <Typography variant="caption" color="text.secondary">
                        조회 <AnimatedNumber value={item.viewCount ?? 0} />
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
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        남은 시간
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
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
                        현재가{" "}
                        <AnimatedNumber
                          value={currentBidValue}
                          format={(val) => formatWon(val)}
                        />
                      </Typography>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        sx={{ mt: 0.5 }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          시작가 {formatWon(auction.startBid)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
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
  );
};

export default TopAuctionsCarousel;
