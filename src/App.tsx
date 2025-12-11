import {
  AppBar,
  Badge,
  Box,
  Button,
  Container,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import React from "react";
import { Outlet, Link as RouterLink } from "react-router-dom";

import { useAuth, UserRole } from "./contexts/AuthContext";
import { AppHeader } from "./components/AppHeader";

/**
 * 애플리케이션의 메인 레이아웃 컴포넌트입니다.
 * 모든 페이지에 공통적으로 적용될 헤더(AppBar)와
 * 라우팅된 페이지 컨텐츠가 렌더링될 영역(Outlet)을 포함합니다.
 */
function App() {
  return (
    <React.Fragment>
      <AppHeader />

      {/* 메인 콘텐츠 영역 */}
      <Container
        component="main"
        maxWidth="lg" // 메인 콘텐츠의 최대 너비를 lg로 설정
        sx={{
          mt: 4,
          mb: 4,
        }}
      >
        <Outlet />
      </Container>
    </React.Fragment>
  );
}

export default App;
