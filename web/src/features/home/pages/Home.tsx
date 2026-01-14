import React from "react";
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  useTheme,
  Paper,
  Skeleton,
} from "@mui/material";
import { Gavel as GavelIcon } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import AuctionList from "@/features/auctions/components/AuctionList";
import {
  hasRole,
  UserRole,
  AuctionStatus,
} from "@moreauction/types";
import { useAuth } from "@moreauction/auth";
import TopAuctionsCarousel from "@/features/home/components/TopAuctionsCarousel";

// 홈: 상단 히어로 섹션 + 상품 목록
const Home: React.FC = () => {
  const theme = useTheme();
  const { isAuthenticated, user } = useAuth();

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

  return (
    <>
      <Box
        sx={{
          py: { xs: 5, md: 6 },
          background: (t) =>
            t.palette.mode === "light"
              ? "radial-gradient(circle at 12% 12%, rgba(59, 130, 246, 0.32) 0, rgba(147, 197, 253, 0.55) 28%, rgba(224, 231, 255, 0.85) 55%, rgba(248, 250, 252, 0.98) 100%)"
              : "radial-gradient(circle at 12% 12%, rgba(51, 65, 85, 0.95) 0, rgba(15, 23, 42, 0.98) 45%, rgba(2, 6, 23, 1) 100%)",
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
                  to="/search?page=0&size=20"
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
              <TopAuctionsCarousel />
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
                  <Skeleton variant="rectangular" height={220} />
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
              to="/search?status=IN_PROGRESS&page=0&size=20"
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
              to="/search?status=READY&page=0&size=20"
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
