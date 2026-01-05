import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Box, Button, Paper, Typography } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { hasRole, UserRole } from "@moreauction/types";
import AdminShell from "../components/AdminShell";

/**
 * 인증된 사용자만 접근할 수 있는 페이지를 위한 라우트 컴포넌트입니다.
 * 인증되지 않은 경우, 바로 다른 페이지로 튕기지 않고
 * 현재 위치에서 "로그인이 필요한 서비스" 안내 화면을 보여줍니다.
 */
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <AdminShell headerTitle="Admin Console">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: 6,
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
      </AdminShell>
    );
  }

  if (!hasRole(user?.roles, UserRole.ADMIN)) {
    return (
      <AdminShell headerTitle="Admin Console">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: 6,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 420,
              textAlign: "center",
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              관리자 권한이 필요합니다.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              현재 계정은 관리자 페이지에 접근할 수 없습니다.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate("/login", { replace: true })}
            >
              관리자 계정으로 로그인
            </Button>
          </Paper>
        </Box>
      </AdminShell>
    );
  }

  // 사용자가 인증되었으면 요청된 페이지(Outlet)를 렌더링합니다.
  return <Outlet />;
};

export default ProtectedRoute;
