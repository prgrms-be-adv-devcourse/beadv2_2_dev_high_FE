import React, { useMemo, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Chip,
  Box,
  Skeleton,
  Alert,
  Button,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useAuth } from "@moreauction/auth";
import { notificationApi } from "@/apis/notificationApi";
import type {
  NotificationInfo,
  PagedNotificationResponse,
} from "@moreauction/types";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

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

  const [showUnreadOnly, setShowUnreadOnly] = useState(true);
  const queryClient = useQueryClient();

  const unreadCountQuery = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationApi.getUnreadCount(),
    enabled: isAuthenticated && !!user?.userId,
    staleTime: 30_000,
  });

  const unreadCount =
    typeof unreadCountQuery.data === "number"
      ? unreadCountQuery.data
      : 0;

  const notificationsQuery = useInfiniteQuery<
    PagedNotificationResponse,
    Error,
    InfiniteData<PagedNotificationResponse, number>,
    QueryKey,
    number
  >({
    queryKey: showUnreadOnly
      ? queryKeys.notifications.unreadList(user?.userId)
      : queryKeys.notifications.list(user?.userId),
    queryFn: async ({ pageParam = 0 }) =>
      showUnreadOnly
        ? notificationApi.getUnreadNotifications({
            page: pageParam,
            size: 20,
          })
        : notificationApi.getNotifications({
            page: pageParam,
            size: 20,
          }),
    initialPageParam: 0,
    enabled:
      isAuthenticated &&
      !!user?.userId &&
      (!showUnreadOnly || (unreadCount ?? 0) > 0),
    getNextPageParam: (lastPage) =>
      lastPage?.last ? undefined : (lastPage?.number ?? 0) + 1,
    staleTime: 30_000,
  });

  const notifications = useMemo(() => {
    const pages = notificationsQuery.data?.pages ?? [];
    const merged = pages.flatMap((page) => page?.content ?? []);
    return sortNotifications(merged);
  }, [notificationsQuery.data?.pages]);

  const visibleNotifications = useMemo(() => {
    if (!showUnreadOnly) return notifications;
    return notifications.filter((item) => !item.readYn);
  }, [notifications, showUnreadOnly]);

  const errorMessage = useMemo(() => {
    if (!notificationsQuery.isError) return null;
    return getErrorMessage(
      notificationsQuery.error,
      "알림을 불러오는데 실패했습니다."
    );
  }, [notificationsQuery.error, notificationsQuery.isError]);

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationApi.getNotifi(notificationId),
    onSuccess: (_, notificationId) => {
      queryClient.setQueriesData(
        { queryKey: queryKeys.notifications.lists() },
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

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.readAll(),
    onSuccess: () => {
      queryClient.setQueriesData(
        { queryKey: queryKeys.notifications.lists() },
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
      queryClient.setQueryData(queryKeys.notifications.unreadCount(), 0);
    },
  });

  const markAsRead = async (notification: NotificationInfo) => {
    if (!notification.id || notification.readYn) return false;
    try {
      await markAsReadMutation.mutateAsync(notification.id);
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
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const showSkeleton =
    (notificationsQuery.isLoading || notificationsQuery.isFetchingNextPage) &&
    notifications.length === 0 &&
    !errorMessage;

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          알림
        </Typography>
        <Paper sx={{ p: 2 }}>
          {!showSkeleton && errorMessage && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {errorMessage}
            </Alert>
          )}
          {!showSkeleton && !errorMessage && (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant={showUnreadOnly ? "contained" : "outlined"}
                  onClick={() => setShowUnreadOnly(true)}
                >
                  안 읽은 알림
                </Button>
                <Button
                  size="small"
                  variant={!showUnreadOnly ? "contained" : "outlined"}
                  onClick={() => setShowUnreadOnly(false)}
                >
                  전체 보기
                </Button>
              </Box>
              <Button
                size="small"
                variant="text"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={
                  markAllAsReadMutation.isPending ||
                  notifications.length === 0 ||
                  notifications.every((n) => n.readYn)
                }
              >
                모두 읽기
              </Button>
            </Box>
          )}
          <Box sx={{ maxHeight: "60vh", overflowY: "auto" }}>
            {!showSkeleton && !errorMessage && notifications.length === 0 && (
              <Alert severity="info" sx={{ width: "100%", mb: 2 }}>
                {showUnreadOnly
                  ? "읽지 않은 알림이 없습니다."
                  : "새로운 알림이 없습니다."}
              </Alert>
            )}
            {!showSkeleton &&
              !errorMessage &&
              notifications.length > 0 &&
              showUnreadOnly &&
              visibleNotifications.length === 0 && (
                <Alert severity="info" sx={{ width: "100%", mb: 2 }}>
                  안 읽은 알림이 없습니다.
                </Alert>
              )}
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
              !errorMessage &&
              visibleNotifications.map((notification, index) => (
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

            {!showSkeleton &&
              !errorMessage &&
              visibleNotifications.length > 0 &&
              notificationsQuery.hasNextPage && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => notificationsQuery.fetchNextPage()}
                    disabled={notificationsQuery.isFetchingNextPage}
                  >
                    {notificationsQuery.isFetchingNextPage ? (
                      <CircularProgress size={18} />
                    ) : (
                      "더 보기"
                    )}
                  </Button>
                </Box>
              )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Notifications;
