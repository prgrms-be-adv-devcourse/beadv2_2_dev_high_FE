import React from "react";
import { Container, Typography, Paper, List, ListItem, ListItemText, Divider } from "@mui/material";

const Notifications: React.FC = () => {
  // 나중을 위한 임시 알림 데이터
  const notifications: any[] = [];

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ my: 4 }}>
        알림
      </Typography>
      <Paper>
        <List>
          {notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemText
                    primary={notification.message}
                    secondary={new Date(notification.createdAt).toLocaleString()}
                  />
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))
          ) : (
            <ListItem>
              <ListItemText primary="새로운 알림이 없습니다." />
            </ListItem>
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default Notifications;
