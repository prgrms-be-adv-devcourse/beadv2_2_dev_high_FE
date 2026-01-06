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
  Menu,
  MenuItem,
  Popover,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Settings as SettingsIcon,
  ManageAccounts as ManageAccountsIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useThemeContext } from "../contexts/ThemeProvider";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../apis/notificationApi";
import { orderApi } from "../apis/orderApi";
import { depositApi } from "../apis/depositApi";
import { userApi } from "../apis/userApi";
import { OrderStatus, type NotificationInfo } from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import { useNavigate } from "react-router-dom";

export const AppHeader: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { mode, toggleColorMode } = useThemeContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notificationAnchorEl, setNotificationAnchorEl] =
    useState<HTMLElement | null>(null);
  const [accountAnchorEl, setAccountAnchorEl] =
    useState<HTMLElement | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationInfo | null>(null);
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

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "list", "header", user?.userId],
    queryFn: () =>
      notificationApi.getNotifications({
        userId: user?.userId,
        page: 0,
        size: 50,
      }),
    enabled: isAuthenticated && !!user?.userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const unreadNotifications = useMemo(() => {
    const items = notificationsQuery.data?.content ?? [];
    return items
      .filter((notification) => !notification.readYn)
      .sort((a, b) => {
        const aTime = new Date(a.createdAt ?? 0).getTime();
        const bTime = new Date(b.createdAt ?? 0).getTime();
        return bTime - aTime;
      });
  }, [notificationsQuery.data?.content]);

  const depositQuery = useQuery({
    queryKey: ["deposit", "balance"],
    queryFn: async () => {
      const info = await depositApi.getAccount();
      return info?.data?.balance ?? 0;
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

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationApi.getNotifi(notificationId),
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData(
        ["notifications", "list", "header", user?.userId],
        (oldData: any) => {
          if (!oldData?.content) return oldData;
          return {
            ...oldData,
            content: oldData.content.map((n: NotificationInfo) =>
              n.id === notificationId ? { ...n, readYn: true } : n
            ),
          };
        }
      );
      queryClient.setQueryData(
        ["notifications", "list", user?.userId],
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              content: (page.content ?? []).map((n: NotificationInfo) =>
                n.id === notificationId ? { ...n, readYn: true } : n
              ),
            })),
          };
        }
      );
      queryClient.setQueryData(
        ["notifications", "unreadCount"],
        (prev: number | undefined) =>
          Math.max((typeof prev === "number" ? prev : 0) - 1, 0)
      );
    },
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    if (depositQuery.data == null) return;
    localStorage.setItem("depositBalance", String(depositQuery.data));
  }, [depositQuery.data, isAuthenticated]);

  const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleCloseNotifications = () => {
    setNotificationAnchorEl(null);
  };

  const handleClickNotification = async (notification: NotificationInfo) => {
    if (notification.id && !notification.readYn) {
      await markAsReadMutation.mutateAsync(notification.id);
    }
    handleCloseNotifications();

    if (notification.relatedUrl) {
      navigate(notification.relatedUrl);
      return;
    }

    setSelectedNotification({
      ...notification,
      readYn: true,
    });
    setDetailOpen(true);
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const handleMarkAllRead = () => {
    queryClient.setQueryData(
      ["notifications", "list", "header", user?.userId],
      (oldData: any) => {
        if (!oldData?.content) return oldData;
        return {
          ...oldData,
          content: oldData.content.map((n: NotificationInfo) => ({
            ...n,
            readYn: true,
          })),
        };
      }
    );
    queryClient.setQueryData(
      ["notifications", "list", user?.userId],
      (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            content: (page.content ?? []).map((n: NotificationInfo) => ({
              ...n,
              readYn: true,
            })),
          })),
        };
      }
    );
    queryClient.setQueryData(["notifications", "unreadCount"], 0);
  };

  const handleViewAllNotifications = () => {
    handleCloseNotifications();
    navigate("/notifications");
  };

  const handleLogout = async () => {
    try {
      await userApi.logout();
    } catch (err) {
      console.warn("로그아웃 API 실패(무시):", err);
    } finally {
      logout();
      alert("로그아웃 되었습니다.");
    }
  };

  const handleOpenAccountMenu = (
    event: React.MouseEvent<HTMLElement>
  ) => {
    setAccountAnchorEl(event.currentTarget);
  };

  const handleCloseAccountMenu = () => {
    setAccountAnchorEl(null);
  };

  const handleGoAccount = (path: string) => {
    navigate(path);
    handleCloseAccountMenu();
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
                  <IconButton color="inherit" onClick={handleOpenNotifications}>
                    <Badge
                      badgeContent={unreadQuery.data ?? 0}
                      color="error"
                      invisible={(unreadQuery.data ?? 0) === 0}
                    >
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Tooltip title="설정">
                  <IconButton color="inherit" onClick={handleOpenAccountMenu}>
                    <ManageAccountsIcon />
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
      <Popover
        open={Boolean(notificationAnchorEl)}
        anchorEl={notificationAnchorEl}
        onClose={handleCloseNotifications}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: 360, p: 2 } }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" fontWeight={700}>
            읽지 않은 알림
          </Typography>
          <Button
            size="small"
            onClick={handleMarkAllRead}
            disabled={unreadNotifications.length === 0}
          >
            모두읽기
          </Button>
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ maxHeight: 320, overflowY: "auto" }}>
          {notificationsQuery.isLoading &&
            Array.from({ length: 3 }).map((_, idx) => (
              <Box key={idx} sx={{ mb: 1.5 }}>
                <Skeleton width="80%" />
                <Skeleton width="95%" />
              </Box>
            ))}
          {!notificationsQuery.isLoading && unreadNotifications.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              새로운 알림이 없습니다.
            </Typography>
          )}
          {!notificationsQuery.isLoading &&
            unreadNotifications.length > 0 && (
              <List disablePadding>
                {unreadNotifications.map((notification) => (
                  <ListItemButton
                    key={notification.id ?? notification.createdAt}
                    onClick={() => handleClickNotification(notification)}
                  >
                    <ListItemText
                      primary={notification.title}
                      secondary={notification.content}
                      primaryTypographyProps={{ fontWeight: 600 }}
                      secondaryTypographyProps={{
                        noWrap: true,
                        color: "text.secondary",
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Box display="flex" justifyContent="flex-end" gap={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleViewAllNotifications}
          >
            전체알림보기
          </Button>
        </Box>
      </Popover>
      <Menu
        open={Boolean(accountAnchorEl)}
        anchorEl={accountAnchorEl}
        onClose={handleCloseAccountMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 180,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            boxShadow:
              "0 10px 30px rgba(15, 23, 42, 0.15), 0 2px 8px rgba(15, 23, 42, 0.08)",
          },
        }}
      >
        <MenuItem
          onClick={() => handleGoAccount("/mypage")}
          sx={{ px: 2, py: 1.25, fontWeight: 600, gap: 1 }}
        >
          <AccountCircle fontSize="small" />
          마이페이지
        </MenuItem>
        <MenuItem
          onClick={() => handleGoAccount("/settings")}
          sx={{ px: 2, py: 1.25, fontWeight: 600, gap: 1 }}
        >
          <SettingsIcon fontSize="small" />
          설정
        </MenuItem>
      </Menu>
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth>
        <DialogTitle>{selectedNotification?.title}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary">
            받은 시각: {formatDateTime(selectedNotification?.createdAt)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedNotification?.content}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};
