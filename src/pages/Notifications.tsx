import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Chip,
  Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { notificationApi } from "../apis/notificationApi";
import type { NotificationInfo } from "../types/notification";

const Notifications: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAuthenticated || !user?.userId) {
        setNotifications([]);
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
        setNotifications(pageRes.content || []);
      } catch (err) {
        console.error("알림 조회 실패:", err);
        setError("알림을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [isAuthenticated, user]);

  const handleClickNotification = (notification: NotificationInfo) => {
    if (notification.relatedUrl) {
      // 관련 URL이 있으면 해당 화면으로 이동
      navigate(notification.relatedUrl);
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ my: 4 }}>
        알림
      </Typography>
      <Paper>
        <List>
          {loading && (
            <ListItem>
              <ListItemText primary="알림을 불러오는 중입니다..." />
            </ListItem>
          )}
          {!loading && error && (
            <ListItem>
              <ListItemText primary={error} />
            </ListItem>
          )}
          {!loading && !error && notifications.length === 0 && (
            <ListItem>
              <ListItemText primary="새로운 알림이 없습니다." />
            </ListItem>
          )}
          {!loading &&
            !error &&
            notifications.map((notification, index) => (
              <React.Fragment key={notification.id ?? index}>
                <ListItemButton
                  onClick={() => handleClickNotification(notification)}
                  alignItems="flex-start"
                  sx={{
                    backgroundColor: notification.readYn
                      ? "transparent"
                      : "action.hover",
                  }}
                >
                  <ListItemText
                    primary={
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          {!notification.readYn && (
                            <Chip
                              label="NEW"
                              color="primary"
                              size="small"
                              sx={{ mr: 1 }}
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
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {notification.content}
                      </Typography>
                    }
                  />
                </ListItemButton>
                {index < notifications.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
        </List>
      </Paper>
    </Container>
  );
};

export default Notifications;
