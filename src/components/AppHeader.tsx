import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Badge,
  Container,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  AccountCircle,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  FavoriteBorder as FavoriteBorderIcon, // 찜화면 아이콘 추가
  Receipt as ReceiptIcon, // 결제대기(주문서) 아이콘 추가
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types/user";
import { useThemeContext } from "../contexts/ThemeProvider";

export const AppHeader: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { mode, toggleColorMode } = useThemeContext();

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
            {isAuthenticated && user && (
              <Typography variant="body1" color="inherit">
                {user?.nickname}님 환영합니다!
              </Typography>
            )}
          </Box>

          {/* 우측: 테마 토글 + 로그인/회원정보 */}
          <Box display="flex" alignItems="center" gap={2}>
            {/* 테마 토글 */}
            <IconButton size="small" onClick={toggleColorMode}>
              {mode === "dark" ? <LightIcon /> : <DarkIcon />}
            </IconButton>

            {isAuthenticated ? (
              <>
                {/* 찜화면 아이콘 */}
                <IconButton
                  component={RouterLink}
                  to="/wishlist"
                  color="inherit"
                >
                  <FavoriteBorderIcon />
                </IconButton>
                {/* 결제대기(주문서) 아이콘 */}
                <IconButton
                  component={RouterLink}
                  to="/pending-orders"
                  color="inherit"
                >
                  <ReceiptIcon />
                </IconButton>

                <IconButton
                  component={RouterLink}
                  to="/notifications"
                  color="inherit"
                >
                  {/* TODO: 안읽은 알림 몇개인지  */}
                  <Badge badgeContent={0} color="error">
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
                {(user?.role === UserRole.SELLER ||
                  user?.role === UserRole.ADMIN) && (
                  <Button
                    color="inherit"
                    component={RouterLink}
                    to="/products/new"
                  >
                    상품 등록
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
