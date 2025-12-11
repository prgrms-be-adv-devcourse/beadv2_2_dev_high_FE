import React from "react";
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

const MyPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ my: 4 }}>
        마이페이지
      </Typography>
      <Paper>
        <List>
          <ListItem>
            <ListItemText
              primary="닉네임"
              secondary={user?.nickname || "정보 없음"}
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText
              primary="이름"
              secondary={user?.name || "정보 없음"}
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText
              primary="이메일"
              secondary={user?.email || "정보 없음"}
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText
              primary="역할"
              secondary={user?.role || "정보 없음"}
            />
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
};

export default MyPage;
