import {
  AppBar,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
} from "@mui/material";
import React from "react";
import { Outlet, Link as RouterLink } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { UserRole } from "./contexts/AuthContext";

/**
 * 애플리케이션의 메인 레이아웃 컴포넌트입니다.
 * 모든 페이지에 공통적으로 적용될 헤더(AppBar)와
 * 라우팅된 페이지 컨텐츠가 렌더링될 영역(Outlet)을 포함합니다.
 */
function App() {
  const { isAuthenticated, user, logout } = useAuth(); // useAuth 훅 사용

  const handleLogout = () => {
    logout();
    alert("로그아웃 되었습니다.");
  };

  return (
    <React.Fragment>
      <AppBar position="static">
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
            {/* 좌측: 로고 + 메뉴 */}
            <Box display="flex" alignItems="center" gap={2}>
              <Typography
                variant="h6"
                component={RouterLink}
                to="/"
                sx={{ color: "inherit", textDecoration: "none", mr: 5 }}
              >
                Project
              </Typography>
              <Button color="inherit" component={RouterLink} to="/products">
                상품
              </Button>
              <Button color="inherit" component={RouterLink} to="/auctions">
                경매
              </Button>
            </Box>

            {/* 우측: 로그인/회원정보 */}
            <Box display="flex" alignItems="center" gap={2}>
              {isAuthenticated ? (
                <>
                  <Typography variant="body1" color="inherit">
                    {user?.nickname}님 환영합니다!
                  </Typography>
                  {user?.role === UserRole.USER && (
                    <Button
                      color="inherit"
                      component={RouterLink}
                      to="/seller/register"
                    >
                      판매자 등록
                    </Button>
                  )}
                  <Button color="inherit" onClick={handleLogout}>
                    로그아웃
                  </Button>
                </>
              ) : (
                <>
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
      {/* 메인 콘텐츠 영역 */}
      <Container
        component="main"
        maxWidth="lg" // 메인 콘텐츠의 최대 너비를 lg로 설정
        sx={{
          mt: 4,
          mb: 4,
          // display, flexDirection, alignItems, justifyContent는 Outlet 콘텐츠에 직접 적용되지 않으므로 제거
        }}
      >
        {/* 라우터에 의해 선택된 자식 컴포넌트가 이곳에 렌더링됩니다. */}
        <Outlet />
      </Container>
    </React.Fragment>
  );
}

export default App;
