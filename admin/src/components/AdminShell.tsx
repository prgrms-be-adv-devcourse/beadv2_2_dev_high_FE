import React from "react";
import { Box } from "@mui/material";
import AdminHeader from "./AdminHeader";

interface AdminShellProps {
  children: React.ReactNode;
  headerTitle?: string;
}

const AdminShell: React.FC<AdminShellProps> = ({
  children,
  headerTitle,
}) => {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AdminHeader title={headerTitle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, md: 4 },
          pt: 10,
          pb: 4,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default AdminShell;
