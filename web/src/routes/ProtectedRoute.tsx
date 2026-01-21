import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Box, Button, Paper, Typography } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

/**
 * 인증된 사용자만 접근할 수 있는 페이지를 위한 라우트 컴포넌트입니다.
 * 인증되지 않은 경우, 바로 다른 페이지로 튕기지 않고
 * 현재 위치에서 "로그인이 필요한 서비스" 안내 화면을 보여줍니다.
 */
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mt: 8,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 400,
            textAlign: "center",
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            로그인이 필요한 서비스입니다.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            보안을 위해 로그인 상태가 해제되었을 수 있습니다. 로그인 후 다시
            이용해 주세요.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() =>
              navigate("/login", {
                state: { from: location.pathname + location.search },
                replace: true,
              })
            }
          >
            로그인 하러 가기
          </Button>
        </Paper>
      </Box>
    );
  }

  // 사용자가 인증되었으면 요청된 페이지(Outlet)를 렌더링합니다.
  return <Outlet />;
};

export default ProtectedRoute;
