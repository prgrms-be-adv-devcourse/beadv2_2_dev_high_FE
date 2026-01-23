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
import { Link as RouterLink } from "react-router-dom";
import { useThemeContext } from "@moreauction/ui";

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
      sx={(theme) => ({
        borderBottom: "1px solid",
        borderColor:
          theme.palette.mode === "light"
            ? "rgba(15, 23, 42, 0.08)"
            : "rgba(148, 163, 184, 0.3)",
        backgroundColor:
          theme.palette.mode === "light"
            ? "rgba(248, 250, 252, 0.92)"
            : "rgba(15, 23, 42, 0.92)",
        backdropFilter: "blur(14px)",
        color: "text.primary",
        zIndex: theme.zIndex.drawer + 1,
      })}
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
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            fontWeight: 700,
            color: "inherit",
            textDecoration: "none",
          }}
        >
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
