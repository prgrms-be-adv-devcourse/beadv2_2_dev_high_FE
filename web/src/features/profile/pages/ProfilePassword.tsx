import { Box, Container, Typography } from "@mui/material";
import React from "react";

const ProfilePassword: React.FC = () => {
  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          비밀번호 변경
        </Typography>
        <Typography variant="body2" color="text.secondary">
          비밀번호 변경 화면은 준비 중입니다.
        </Typography>
      </Box>
    </Container>
  );
};

export default ProfilePassword;
