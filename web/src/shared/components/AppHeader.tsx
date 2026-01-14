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
  Close as CloseIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "@moreauction/auth";
import { useThemeContext } from "@moreauction/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/apis/notificationApi";
import { orderApi } from "@/apis/orderApi";
import { depositApi } from "@/apis/depositApi";
import { userApi } from "@/apis/userApi";
import { OrderStatus, type NotificationInfo } from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import { useNavigate } from "react-router-dom";
import { queryKeys } from "@/shared/queries/queryKeys";
import { useNotificationSse } from "@/features/notifications/hooks/useNotificationSse";

export const AppHeader: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { mode, toggleColorMode } = useThemeContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toastQueue, setToastQueue] = useState<NotificationInfo[]>([]);
  const [toastNotification, setToastNotification] =
    useState<NotificationInfo | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const toastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimingsRef = useRef({ hideMs: 4200, exitMs: 260 });
  const [now, setNow] = useState(() => Date.now());
  const handleIncomingNotification = useCallback(
    (payload: NotificationInfo) => {
      setToastQueue((prev) => [...prev, payload]);
    },
    []
  );
  useNotificationSse({ onNotification: handleIncomingNotification });
  const [notificationAnchorEl, setNotificationAnchorEl] =
    useState<HTMLElement | null>(null);
  const [accountAnchorEl, setAccountAnchorEl] = useState<HTMLElement | null>(
    null
  );
  const isNotificationOpen = Boolean(notificationAnchorEl);
  const storedBalance = useMemo(() => {
    const raw = localStorage.getItem("depositBalance");
    const parsed = raw != null ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  // 로그인된 경우에만 미확인 알림 개수 조회
  const unreadQuery = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationApi.getUnreadCount(),
    enabled: isAuthenticated && !!user?.userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.headerList(user?.userId, "unread"),
    queryFn: () =>
      notificationApi.getUnreadNotifications({ page: 0, size: 50 }),
    enabled:
      isAuthenticated &&
      !!user?.userId &&
      isNotificationOpen &&
      (unreadQuery.data ?? 0) > 0,
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

  const unreadCount =
    typeof unreadQuery.data === "number"
      ? unreadQuery.data
      : unreadNotifications.length;

  const visibleNotifications = unreadNotifications;

  const depositQuery = useQuery({
    queryKey: queryKeys.deposit.balance(),
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
    queryKey: queryKeys.orders.pendingCount(),
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
        queryKeys.notifications.list(user?.userId),
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
      queryClient.setQueriesData(
        { queryKey: queryKeys.notifications.headerListBase(user?.userId) },
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
        queryKeys.notifications.unreadCount(),
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
    navigate("/notifications");
  };

  const safeText = (value?: unknown) =>
    typeof value === "string" ? value : "";

  const formatNotificationTime = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    const time = date.getTime();
    if (Number.isNaN(time)) return value;
    const diffMinutes = Math.floor((now - time) / 60000);
    if (diffMinutes < 1) return "방금 전";
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    if (toastNotification || toastQueue.length === 0) return;
    const [next, ...rest] = toastQueue;
    setToastNotification(next);
    setToastQueue(rest);
    setToastOpen(true);
  }, [toastNotification, toastQueue]);

  useEffect(() => {
    return () => {
      if (toastHideTimerRef.current) {
        clearTimeout(toastHideTimerRef.current);
      }
      if (toastExitTimerRef.current) {
        clearTimeout(toastExitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!toastNotification || !toastOpen) return;
    if (toastHideTimerRef.current) {
      clearTimeout(toastHideTimerRef.current);
    }
    toastHideTimerRef.current = setTimeout(() => {
      setToastOpen(false);
      toastHideTimerRef.current = null;
    }, toastTimingsRef.current.hideMs);
  }, [toastNotification, toastOpen]);

  useEffect(() => {
    if (toastOpen || !toastNotification) return;
    if (toastExitTimerRef.current) {
      clearTimeout(toastExitTimerRef.current);
    }
    toastExitTimerRef.current = setTimeout(() => {
      setToastQueue((prev) => {
        if (prev.length === 0) {
          setToastNotification(null);
          return prev;
        }
        const [next, ...rest] = prev;
        setToastNotification(next);
        setToastOpen(true);
        return rest;
      });
      toastExitTimerRef.current = null;
    }, toastTimingsRef.current.exitMs);
  }, [toastOpen, toastNotification]);

  const handleToastClick = async () => {
    const target = toastNotification;
    if (!target) return;
    setToastOpen(false);
    if (target.id && !target.readYn) {
      try {
        await markAsReadMutation.mutateAsync(target.id);
      } catch (error) {
        console.error("알림 읽음 처리 실패:", error);
      }
    }
    if (target.relatedUrl) {
      navigate(target.relatedUrl);
      return;
    }
    navigate("/notifications");
  };

  const formatRelativeTime = (value?: string) => {
    if (!value) return "";
    const time = new Date(value);
    if (Number.isNaN(time.getTime())) return "";
    const diffMs = now - time.getTime();
    if (diffMs < 60_000) return "방금 전";
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.readAll();
    } catch (error) {
      console.error("알림 전체 읽음 처리 실패:", error);
    }
    queryClient.setQueriesData(
      { queryKey: queryKeys.notifications.headerListBase(user?.userId) },
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
      queryKeys.notifications.list(user?.userId),
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
    queryClient.setQueryData(queryKeys.notifications.unreadCount(), 0);
  };

  const handleViewAllNotifications = () => {
    handleCloseNotifications();
    navigate("/notifications");
  };

  const handleOpenAccountMenu = (event: React.MouseEvent<HTMLElement>) => {
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
                  : depositQuery.isError
                  ? "조회 실패"
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
                  <IconButton
                    color="inherit"
                    onClick={() => {
                      if (window.confirm("로그아웃하시겠습니까?")) {
                        logout();
                      }
                    }}
                  >
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
        PaperProps={{
          sx: {
            width: 380,
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
            boxShadow:
              "0 14px 32px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.12)",
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: (theme) =>
              theme.palette.mode === "light"
                ? "rgba(59, 130, 246, 0.08)"
                : "rgba(59, 130, 246, 0.16)",
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              읽지 않은 알림
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {unreadCount}건
            </Typography>
          </Box>
          <Button
            size="small"
            variant="text"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            모두읽기
          </Button>
        </Box>
        <Divider />
        <Box sx={{ maxHeight: 320, overflowY: "auto", px: 2, py: 1.5 }}>
          {notificationsQuery.isLoading &&
            Array.from({ length: 3 }).map((_, idx) => (
              <Box key={idx} sx={{ mb: 1.5 }}>
                <Skeleton width="65%" />
                <Skeleton width="85%" />
              </Box>
            ))}
          {!notificationsQuery.isLoading &&
            visibleNotifications.length === 0 && (
              <Box
                sx={{
                  py: 4,
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  새로운 알림이 없습니다.
                </Typography>
              </Box>
            )}
          {!notificationsQuery.isLoading && visibleNotifications.length > 0 && (
            <List disablePadding sx={{ display: "grid", gap: 1.25 }}>
              {visibleNotifications.map((notification) => (
                <ListItemButton
                  key={notification.id ?? notification.createdAt}
                  onClick={() => handleClickNotification(notification)}
                  sx={{
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: notification.readYn
                      ? "divider"
                      : "rgba(59, 130, 246, 0.35)",
                    bgcolor: notification.readYn
                      ? "background.paper"
                      : "rgba(59, 130, 246, 0.08)",
                    alignItems: "flex-start",
                    gap: 1.5,
                    transition:
                      "background-color 160ms ease, border-color 160ms ease",
                    "&:hover": {
                      bgcolor: notification.readYn
                        ? "action.hover"
                        : "rgba(59, 130, 246, 0.14)",
                    },
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight={notification.readYn ? 600 : 700}
                        sx={{ minWidth: 0 }}
                        noWrap
                      >
                        {safeText(notification.title)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatNotificationTime(notification.createdAt)}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                      noWrap
                    >
                      {safeText(notification.content)}
                    </Typography>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
        <Divider />
        <Box
          display="flex"
          justifyContent="flex-end"
          gap={1}
          sx={{ px: 2, py: 1.5 }}
        >
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
      {toastNotification && (
        <Box
          sx={(theme) => ({
            position: "fixed",
            top: 32,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: theme.zIndex.snackbar,
            pointerEvents: "none",
            width: "min(440px, calc(100vw - 32px))",
          })}
        >
          <Box sx={{ position: "relative" }}>
            {toastQueue.slice(0, 2).map((item, index) => (
              <Box
                key={`${item.id}-${index}`}
                sx={(theme) => ({
                  position: "absolute",
                  inset: 0,
                  borderRadius: 2,
                  bgcolor:
                    theme.palette.mode === "light" ? "#f8fafc" : "#111827",
                  border: "1px solid",
                  borderColor:
                    theme.palette.mode === "light"
                      ? "rgba(15, 23, 42, 0.12)"
                      : "rgba(148, 163, 184, 0.4)",
                  boxShadow:
                    theme.palette.mode === "light"
                      ? "0 12px 26px rgba(15, 23, 42, 0.15)"
                      : "0 18px 34px rgba(0, 0, 0, 0.55)",
                  transform: `translateY(${(index + 1) * 12}px) scale(${
                    1 - (index + 1) * 0.018
                  })`,
                  opacity: 0.68 - index * 0.18,
                  zIndex: 1,
                })}
              />
            ))}
            {toastNotification && (
              <Box
                onClick={handleToastClick}
                sx={(theme) => ({
                  pointerEvents: "auto",
                  cursor: "pointer",
                  position: "relative",
                  borderRadius: 2,
                  bgcolor:
                    theme.palette.mode === "light" ? "#ffffff" : "#0f172a",
                  border: "1px solid",
                  borderColor:
                    theme.palette.mode === "light"
                      ? "rgba(15, 23, 42, 0.14)"
                      : "rgba(148, 163, 184, 0.4)",
                  borderLeft: "4px solid",
                  borderLeftColor: theme.palette.primary.main,
                  boxShadow:
                    theme.palette.mode === "light"
                      ? "0 18px 36px rgba(15, 23, 42, 0.2)"
                      : "0 20px 40px rgba(0, 0, 0, 0.55)",
                  p: 2,
                  width: "100%",
                  minHeight: 72,
                  maxWidth: 440,
                  zIndex: 3,
                  opacity: toastOpen ? 1 : 0,
                  transform: toastOpen
                    ? "translateY(0) scale(1)"
                    : "translateY(-10px) scale(0.97)",
                  transition:
                    "opacity 260ms ease, transform 260ms ease, box-shadow 260ms ease",
                })}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>
                      {safeText(toastNotification?.title) || "새 알림"}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                      sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {safeText(toastNotification?.content)}
                    </Typography>
                    {!!toastNotification?.createdAt && (
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeTime(toastNotification.createdAt)}
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      setToastOpen(false);
                    }}
                    aria-label="알림 닫기"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </AppBar>
  );
};
