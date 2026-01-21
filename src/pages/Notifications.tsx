import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Chip,
  Box,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { notificationApi } from "../apis/notificationApi";
import type { NotificationInfo } from "../types/notification";

const sortNotifications = (items: NotificationInfo[]) => {
  return [...items].sort((a, b) => {
    if (!!a.readYn === !!b.readYn) {
      const aTime = new Date(a.createdAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? 0).getTime();
      return bTime - aTime;
    }
    return a.readYn ? 1 : -1;
  });
};

const Notifications: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationInfo | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAuthenticated || !user?.userId) {
        setNotifications([]);
        setPage(0);
        setHasMore(true);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // 기본: 첫 페이지 20개만 조회
        const pageRes = await notificationApi.getNotifications({
          userId: user.userId,
          page: 0,
          size: 20,
        });
        setNotifications(sortNotifications(pageRes.content || []));
        setPage(0);
        setHasMore(!pageRes.last);
      } catch (err) {
        console.error("알림 조회 실패:", err);
        setError("알림을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [isAuthenticated, user]);

  const loadMore = async () => {
    if (!isAuthenticated || !user?.userId) return;
    if (!hasMore || loading || loadingMore) return;

    const nextPage = page + 1;
    setLoadingMore(true);
    setError(null);
    try {
      const pageRes = await notificationApi.getNotifications({
        userId: user.userId,
        page: nextPage,
        size: 20,
      });
      const next = pageRes.content || [];
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const merged = [...prev, ...next.filter((n) => !existingIds.has(n.id))];
        return sortNotifications(merged);
      });
      setPage(nextPage);
      setHasMore(!pageRes.last);
    } catch (err) {
      console.error("알림 추가 조회 실패:", err);
      setError("알림을 더 불러오지 못했습니다.");
    } finally {
      setLoadingMore(false);
    }
  };

  const markAsRead = async (notification: NotificationInfo) => {
    if (!notification.id || notification.readYn) return false;
    try {
      await notificationApi.getNotifi(notification.id);
      setNotifications((prev) =>
        sortNotifications(
          prev.map((n) =>
            n.id === notification.id ? { ...n, readYn: true } : n
          )
        )
      );
      window.dispatchEvent(new CustomEvent("notification:read"));
      return true;
    } catch (err) {
      console.error("알림 읽음 처리 실패:", err);
      return false;
    }
  };

  const handleClickNotification = async (notification: NotificationInfo) => {
    const target = notification;
    if (target.id) {
      await markAsRead(target);
    }

    if (target.relatedUrl) {
      navigate(target.relatedUrl);
    } else {
      setSelectedNotification({
        ...target,
        readYn: true,
      });
      setDetailOpen(true);
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const showSkeleton =
    (loading || loadingMore) && notifications.length === 0 && !error;

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          알림
        </Typography>
        <Paper sx={{ p: 2 }}>
          {!showSkeleton && error && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          )}
          {!showSkeleton && !error && notifications.length === 0 && (
            <Alert severity="info" sx={{ width: "100%" }}>
              새로운 알림이 없습니다.
            </Alert>
          )}
          <Box sx={{ maxHeight: "60vh", overflowY: "auto" }}>
            {showSkeleton &&
              Array.from({ length: 6 }).map((_, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    mb: 2,
                    bgcolor: "action.hover",
                  }}
                >
                  <Skeleton width="70%" />
                  <Skeleton width="90%" />
                </Box>
              ))}

            {!showSkeleton &&
              !error &&
              notifications.map((notification, index) => (
                <Box
                  key={notification.id ?? index}
                  onClick={() => handleClickNotification(notification)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    mb: 2,
                    cursor: notification.relatedUrl ? "pointer" : "default",
                    bgcolor: notification.readYn
                      ? "background.paper"
                      : "action.hover",
                    transition: "background-color 0.15s ease",
                    "&:hover": {
                      bgcolor: notification.readYn
                        ? "action.hover"
                        : "action.selected",
                    },
                  }}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 0.5 }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      {!notification.readYn && (
                        <Chip
                          label="NEW"
                          color="primary"
                          size="small"
                          sx={{ mr: 0.5 }}
                        />
                      )}
                      <Typography
                        variant="subtitle1"
                        fontWeight={notification.readYn ? 400 : 600}
                      >
                        {notification.title}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(notification.createdAt)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {notification.content}
                  </Typography>
                </Box>
              ))}

            {!showSkeleton && !error && notifications.length > 0 && hasMore && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                <Button
                  variant="outlined"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? <CircularProgress size={18} /> : "더 보기"}
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
        <Dialog
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          fullWidth
        >
          <DialogTitle>{selectedNotification?.title}</DialogTitle>
          <DialogContent dividers>
            <Typography variant="caption" color="text.secondary">
              받은 시각: {formatDateTime(selectedNotification?.createdAt)}
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, whiteSpace: "pre-line" }}>
              {selectedNotification?.content}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailOpen(false)}>닫기</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Notifications;
