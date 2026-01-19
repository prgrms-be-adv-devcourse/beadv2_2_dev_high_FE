import { Box, Container, Typography } from "@mui/material";
import React from "react";

const ProfileAddresses: React.FC = () => {
  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          주소지 관리
        </Typography>
        <Typography variant="body2" color="text.secondary">
          주소지 관리 화면은 준비 중입니다.
        </Typography>
      </Box>
    </Container>
  );
};

export default ProfileAddresses;
