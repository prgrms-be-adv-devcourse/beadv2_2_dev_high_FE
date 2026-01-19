import { Box } from "@mui/material";
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppHeader } from "@/shared/components/AppHeader";
import Footer from "@/shared/components/Footer";
import { ChatWidget } from "@/features/chat/components/ChatWidget";

function App() {
  const location = useLocation();
  const isPopup =
    typeof window !== "undefined" && !!window.opener && !window.opener.closed;
  const isOAuthRoute = location.pathname.startsWith("/oauth");
  const hideChrome = isPopup && isOAuthRoute;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      {!hideChrome && <AppHeader />}
      <Box component="main" sx={{ flexGrow: 1, my: hideChrome ? 0 : 3 }}>
        <Outlet />
      </Box>
      {!hideChrome && <Footer />}
      {!hideChrome && <ChatWidget />}
    </Box>
  );
}

export default App;
