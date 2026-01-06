import { Box } from "@mui/material";
import React from "react";
import { Outlet } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import Footer from "./components/Footer";

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
