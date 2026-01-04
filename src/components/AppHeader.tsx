import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Badge,
  Container,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  FavoriteBorder as FavoriteBorderIcon, // 찜화면 아이콘 추가
  Receipt as ReceiptIcon, // 결제대기(주문서) 아이콘 추가
  Gavel as GavelIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useThemeContext } from "../contexts/ThemeProvider";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "../apis/notificationApi";
import { orderApi } from "../apis/orderApi";
import { depositApi } from "../apis/depositApi";
import { OrderStatus } from "../types/order";
import { formatWon } from "../utils/money";

export const AppHeader: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { mode, toggleColorMode } = useThemeContext();
  const storedBalance = useMemo(() => {
    const raw = localStorage.getItem("depositBalance");
    const parsed = raw != null ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  // 로그인된 경우에만 미확인 알림 개수 조회
  const unreadQuery = useQuery({
    queryKey: ["notifications", "unreadCount"],
    queryFn: notificationApi.getUnreadCount,
    enabled: isAuthenticated,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const depositQuery = useQuery({
    queryKey: ["deposit", "balance"],
    queryFn: async () => {
      const info = await depositApi.getAccount();
      return info?.balance ?? 0;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    placeholderData: storedBalance ?? undefined,
  });

  const pendingQuery = useQuery({
    queryKey: ["orders", "pendingCount"],
    queryFn: async () => {
      const res = await orderApi.getStatusCount(OrderStatus.UNPAID);
      return typeof res.data === "number" ? res.data : 0;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    if (depositQuery.data == null) return;
    localStorage.setItem("depositBalance", String(depositQuery.data));
  }, [depositQuery.data, isAuthenticated]);

  const handleLogout = () => {
    logout();
    alert("로그아웃 되었습니다.");
  };

  return (
    <AppBar
      position="sticky"
      color="transparent"
      sx={(theme) => ({
        backdropFilter: "blur(14px)",
        backgroundColor:
          theme.palette.mode === "light"
            ? "rgba(248, 250, 252, 0.9)"
            : "rgba(15, 23, 42, 0.9)",
        borderBottom: "1px solid",
        borderColor:
          theme.palette.mode === "light"
            ? "rgba(15, 23, 42, 0.06)"
            : "rgba(148, 163, 184, 0.25)",
      })}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
          {/* 좌측: 로고 + 메뉴 */}
          <Box display="flex" alignItems="center" gap={2}>
            <Box
              component={RouterLink}
              to="/"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: "inherit",
                textDecoration: "none",
                mr: 5,
              }}
            >
              <GavelIcon sx={{ fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                More Auction
              </Typography>
            </Box>
            {isAuthenticated && user && (
              <Typography variant="body1" color="inherit">
                {user?.nickname}님 환영합니다!
              </Typography>
            )}
          </Box>

          {/* 우측: 검색 + 로그인/회원정보 + 테마 토글 */}
          <Box display="flex" alignItems="center" gap={1.5}>
            {isAuthenticated && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  minWidth: 120,
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                예치금{" "}
                {depositQuery.data != null
                  ? formatWon(depositQuery.data)
                  : depositQuery.isLoading
                  ? "불러오는 중"
                  : "-"}
              </Typography>
            )}

            {/* 검색 페이지로 이동 */}
            <Tooltip title="검색하기">
              <IconButton
                component={RouterLink}
                to="/search"
                color="inherit"
                size="small"
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>

            {isAuthenticated ? (
              <>
                {/* 찜화면 아이콘 */}
                <Tooltip title="찜">
                  <IconButton
                    component={RouterLink}
                    to="/wishlist"
                    color="inherit"
                  >
                    <FavoriteBorderIcon />
                  </IconButton>
                </Tooltip>
                {/* 결제대기(주문서) 아이콘 */}
                <Tooltip title="주문서">
                  <IconButton
                    component={RouterLink}
                    to="/orders"
                    color="inherit"
                  >
                    <Badge
                      badgeContent={pendingQuery.data ?? 0}
                      color="error"
                      invisible={(pendingQuery.data ?? 0) === 0}
                    >
                      <ReceiptIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Tooltip title="알림">
                  <IconButton
                    component={RouterLink}
                    to="/notifications"
                    color="inherit"
                  >
                    <Badge
                      badgeContent={unreadQuery.data ?? 0}
                      color="error"
                      invisible={(unreadQuery.data ?? 0) === 0}
                    >
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Tooltip title="마이페이지">
                  <IconButton
                    component={RouterLink}
                    to="/mypage"
                    color="inherit"
                  >
                    <AccountCircle />
                  </IconButton>
                </Tooltip>

                <Tooltip title="다크/라이트 모드 전환">
                  <IconButton
                    size="small"
                    onClick={toggleColorMode}
                    color="inherit"
                  >
                    {mode === "dark" ? <LightIcon /> : <DarkIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="로그아웃">
                  <IconButton color="inherit" onClick={handleLogout}>
                    <LogoutIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip title="다크/라이트 모드 전환">
                  <IconButton
                    size="small"
                    onClick={toggleColorMode}
                    color="inherit"
                  >
                    {mode === "dark" ? <LightIcon /> : <DarkIcon />}
                  </IconButton>
                </Tooltip>
                <Button color="inherit" component={RouterLink} to="/login">
                  로그인
                </Button>
                <Button color="inherit" component={RouterLink} to="/signup">
                  회원가입
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
