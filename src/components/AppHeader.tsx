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
import { useEffect, useState } from "react";
import { notificationApi } from "../apis/notificationApi";
import { depositApi } from "../apis/depositApi";
import { orderApi } from "../apis/orderApi";
import { OrderStatus } from "../types/order";
import { formatWon } from "../utils/money";

export const AppHeader: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { mode, toggleColorMode } = useThemeContext();
  const [unreadCount, setUnreadCount] = useState(0);
  const [depositBalance, setDepositBalance] = useState<number | null>(null);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);

  // 로그인된 경우에만 미확인 알림 개수 조회
  useEffect(() => {
    let cancelled = false;

    const fetchUnreadCount = async () => {
      if (!isAuthenticated || !user?.userId) {
        setUnreadCount(0);
        return;
      }

      try {
        const pageRes = await notificationApi.getNotifications({
          userId: user.userId,
          page: 0,
          size: 50,
        });
        if (cancelled) return;
        const count =
          pageRes.content?.filter((n) => n && n.readYn === false).length ?? 0;
        setUnreadCount(count);
      } catch (err) {
        if (!cancelled) {
          console.error("미확인 알림 개수 조회 실패:", err);
          setUnreadCount(0);
        }
      }
    };

    fetchUnreadCount();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    const handleNotificationRead = () => {
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    };
    window.addEventListener("notification:read", handleNotificationRead);
    return () => {
      window.removeEventListener("notification:read", handleNotificationRead);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchBalance = async () => {
      if (!isAuthenticated || !user?.userId) {
        setDepositBalance(null);
        return;
      }
      try {
        const info = await depositApi.getAccount();
        if (!cancelled) {
          setDepositBalance(info?.balance ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("예치금 잔액 조회 실패:", err);
          setDepositBalance(null);
        }
      }
    };
    fetchBalance();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    let cancelled = false;

    const fetchPendingOrderCount = async () => {
      if (!isAuthenticated || !user?.userId) {
        setPendingOrderCount(0);
        return;
      }
      try {
        const res = await orderApi.getStatusCount(OrderStatus.UNPAID);
        if (cancelled) return;
        setPendingOrderCount(typeof res.data === "number" ? res.data : 0);
      } catch (err) {
        if (!cancelled) {
          console.error("구매 대기 주문 카운트 조회 실패:", err);
          setPendingOrderCount(0);
        }
      }
    };

    fetchPendingOrderCount();

    const handleRefresh = () => fetchPendingOrderCount();
    window.addEventListener("orders:refresh", handleRefresh);
    const handlePendingDecrement = (event: Event) => {
      const delta = (event as CustomEvent<number>).detail ?? 1;
      if (typeof delta !== "number" || Number.isNaN(delta)) return;
      setPendingOrderCount((prev) => Math.max(prev - delta, 0));
    };
    window.addEventListener(
      "orders:pending-decrement",
      handlePendingDecrement as EventListener
    );
    return () => {
      cancelled = true;
      window.removeEventListener("orders:refresh", handleRefresh);
      window.removeEventListener(
        "orders:pending-decrement",
        handlePendingDecrement as EventListener
      );
    };
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    const applyDelta = (delta: number) => {
      setDepositBalance((prev) => {
        const base = typeof prev === "number" ? prev : 0;
        return Math.max(base + delta, 0);
      });
    };

    const handleIncrement = (event: Event) => {
      const delta = (event as CustomEvent<number>).detail ?? 0;
      if (typeof delta !== "number" || Number.isNaN(delta)) return;
      applyDelta(delta);
    };

    const handleDecrement = (event: Event) => {
      const delta = (event as CustomEvent<number>).detail ?? 0;
      if (typeof delta !== "number" || Number.isNaN(delta)) return;
      applyDelta(-delta);
    };

    const handleSet = (event: Event) => {
      const nextBalance = (event as CustomEvent<number>).detail;
      if (typeof nextBalance !== "number" || Number.isNaN(nextBalance)) return;
      setDepositBalance(Math.max(nextBalance, 0));
    };

    window.addEventListener(
      "deposit:increment",
      handleIncrement as EventListener
    );
    window.addEventListener(
      "deposit:decrement",
      handleDecrement as EventListener
    );
    window.addEventListener("deposit:set", handleSet as EventListener);
    return () => {
      window.removeEventListener(
        "deposit:increment",
        handleIncrement as EventListener
      );
      window.removeEventListener(
        "deposit:decrement",
        handleDecrement as EventListener
      );
      window.removeEventListener("deposit:set", handleSet as EventListener);
    };
  }, []);

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
                {depositBalance != null ? formatWon(depositBalance) : "0원"}
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
                      badgeContent={pendingOrderCount}
                      color="error"
                      invisible={pendingOrderCount === 0}
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
                      badgeContent={unreadCount}
                      color="error"
                      invisible={unreadCount === 0}
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
