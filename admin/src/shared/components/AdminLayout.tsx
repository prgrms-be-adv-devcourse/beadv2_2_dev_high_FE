import {
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import {
  DashboardCustomize as DashboardIcon,
  People as PeopleIcon,
  Gavel as GavelIcon,
  Inventory2 as InventoryIcon,
  ReceiptLong as OrdersIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AccountBalanceWallet as SettlementIcon,
  Payment as PaymentsIcon,
} from "@mui/icons-material";
import React, { useMemo, useState } from "react";
import { Link as RouterLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@moreauction/auth";
import AdminHeader from "./AdminHeader";
import { AiProductGenerateProvider } from "@/shared/contexts/AiProductGenerateContext";

const drawerWidth = 240;

const navItems = [
  { label: "대시보드", to: "/", icon: <DashboardIcon /> },
  { label: "회원 관리", to: "/users", icon: <PeopleIcon /> },
  { label: "경매 관리", to: "/auctions", icon: <GavelIcon /> },
  { label: "상품 관리", to: "/products", icon: <InventoryIcon /> },
  { label: "구매 관리", to: "/orders", icon: <OrdersIcon /> },
  { label: "정산 관리", to: "/settlements", icon: <SettlementIcon /> },
  { label: "결제 관리", to: "/payments", icon: <PaymentsIcon /> },

  { label: "설정", to: "/settings", icon: <SettingsIcon /> },
];

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activePath = useMemo(() => {
    const match = navItems.find((item) => item.to === location.pathname);
    return match?.to ?? "/";
  }, [location.pathname]);

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Admin Console
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          More Auction
        </Typography>
      </Box>
      <List sx={{ flexGrow: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={RouterLink}
            to={item.to}
            selected={activePath === item.to}
            sx={{ borderRadius: 1, mx: 1, my: 0.5 }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ px: 2, pb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {user?.nickname ?? "관리자"}
        </Typography>
        <Button
          startIcon={<LogoutIcon />}
          onClick={() => {
            logout();
            alert("로그아웃 되었습니다.");
          }}
          sx={{ mt: 1 }}
          fullWidth
          variant="outlined"
        >
          로그아웃
        </Button>
      </Box>
    </Box>
  );

  return (
    <AiProductGenerateProvider>
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <AdminHeader
          userEmail={user?.email ?? ""}
          showMenuButton
          onMenuClick={() => setMobileOpen(true)}
        />

        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              bgcolor: "background.paper",
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              bgcolor: "background.paper",
              boxSizing: "border-box",
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            px: { xs: 2, md: 4 },
            pt: 10,
            pb: 4,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </AiProductGenerateProvider>
  );
};

export default AdminLayout;
