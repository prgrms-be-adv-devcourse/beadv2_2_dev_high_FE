import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Badge,
  Container,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  AccountCircle,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth, UserRole } from "../contexts/AuthContext";

export const AppHeader: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    alert("로그아웃 되었습니다.");
  };

  return (
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
                <IconButton
                  component={RouterLink}
                  to="/notifications"
                  color="inherit"
                >
                  <Badge badgeContent={3} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
                <IconButton component={RouterLink} to="/mypage" color="inherit">
                  <AccountCircle />
                </IconButton>
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
  );
};
