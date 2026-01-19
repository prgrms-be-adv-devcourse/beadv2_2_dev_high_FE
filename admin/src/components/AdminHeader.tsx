import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  Menu as MenuIcon,
} from "@mui/icons-material";
import React from "react";
import { useThemeContext } from "../contexts/ThemeProvider";

interface AdminHeaderProps {
  title?: string;
  userEmail?: string;
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  title = "Admin Console",
  userEmail,
  showMenuButton = false,
  onMenuClick,
}) => {
  const { mode, toggleColorMode } = useThemeContext();

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        {showMenuButton && (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMenuClick}
            sx={{ display: { xs: "inline-flex", md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {userEmail && (
            <Typography variant="body2" color="text.secondary">
              {userEmail}
            </Typography>
          )}
          <IconButton size="small" onClick={toggleColorMode} color="inherit">
            {mode === "dark" ? <LightIcon /> : <DarkIcon />}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AdminHeader;
