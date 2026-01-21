import { Box } from "@mui/material";
import React from "react";
import { Outlet } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import Footer from "./components/Footer";

/**
 * 애플리케이션의 메인 레이아웃 컴포넌트입니다.
 * 모든 페이지에 공통적으로 적용될 헤더(AppBar)와
 * 라우팅된 페이지 컨텐츠가 렌더링될 영역(Outlet)을 포함합니다.
 */
function App() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <AppHeader />
      <Box component="main" sx={{ flexGrow: 1, my: 3 }}>
        <Outlet />
      </Box>
      <Footer />
    </Box>
  );
}

export default App;
