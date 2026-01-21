import { Box, Paper, Typography } from "@mui/material";
import React from "react";
import { DepositPaymentList } from "@/features/mypage/components/DepositPaymentList";

export const DepositPaymentHistoryTab: React.FC = () => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        결제 내역
      </Typography>
      <Box>
        <DepositPaymentList />
      </Box>
    </Paper>
  );
};
