import React from "react";
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  useTheme,
  Paper,
} from "@mui/material";
import { Gavel as GavelIcon } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import AuctionList from "../components/AuctionList";
import { hasRole, UserRole, AuctionStatus } from "@moreauction/types";
import { useAuth } from "../contexts/AuthContext";

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
          py: { xs: 6, md: 8 },
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
            <Box
              flex={1}
              sx={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 360,
                  aspectRatio: "4 / 3",
                  borderRadius: 4,
                  background:
                    "conic-gradient(from 180deg at 50% 50%, #3b82f6, #f97316, #22c55e, #3b82f6)",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow:
                    theme.palette.mode === "light"
                      ? "0 18px 45px rgba(15, 23, 42, 0.18)"
                      : "0 18px 45px rgba(15, 23, 42, 0.8)",
                  "@keyframes floatCard": {
                    "0%": { transform: "translateY(0px) scale(1)" },
                    "50%": { transform: "translateY(-6px) scale(1.01)" },
                    "100%": { transform: "translateY(0px) scale(1)" },
                  },
                  animation: "floatCard 8s ease-in-out infinite",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 12,
                    borderRadius: 3,
                    backgroundColor:
                      theme.palette.mode === "light"
                        ? "rgba(249, 250, 251, 0.96)"
                        : "rgba(15, 23, 42, 0.96)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 1,
                    textAlign: "center",
                    px: 3,
                  }}
                >
                  <GavelIcon
                    sx={{
                      fontSize: 40,
                      color:
                        theme.palette.mode === "light"
                          ? theme.palette.primary.main
                          : theme.palette.primary.light,
                    }}
                  />
                  <Typography variant="subtitle1" fontWeight={700}>
                    오늘의 인기 경매
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ maxWidth: 260 }}
                  >
                    마감이 가까운 경매를 놓치지 마세요. 실시간으로 가격이
                    변동됩니다.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Stack>
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
            sortOption="ENDING_SOON"
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
            sortOption="START_SOON"
            linkDestination="product"
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
