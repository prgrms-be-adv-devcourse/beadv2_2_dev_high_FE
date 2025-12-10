import React from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        mt: 8,
      }}
    >
      <Typography variant="h3" component="h1" gutterBottom>
        프로젝트에 오신 것을 환영합니다
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph>
        {/* 아래 링크를 통해 원하시는 기능으로 이동할 수 있습니다. */}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        <Button
          component={RouterLink}
          to="/login"
          variant="outlined"
          size="large"
        >
          로그인
        </Button>
        <Button
          component={RouterLink}
          to="/signup"
          variant="outlined"
          size="large"
        >
          회원가입
        </Button>
        <Button
          component={RouterLink}
          to="/seller/register"
          variant="contained"
          color="secondary"
          size="large"
        >
          판매자 등록
        </Button>
        <Button
          component={RouterLink}
          to="/product/new"
          variant="contained"
          color="primary"
          size="large"
        >
          상품 등록
        </Button>
        <Button
          component={RouterLink}
          to="/auction/new"
          variant="contained"
          color="primary"
          size="large"
        >
          경매 등록
        </Button>
        <Button
          component={RouterLink}
          to="/products"
          variant="contained"
          size="large"
        >
          상품 목록
        </Button>
        <Button
          component={RouterLink}
          to="/auctions"
          variant="contained"
          size="large"
        >
          경매 목록
        </Button>
      </Stack>
      <Stack></Stack>
    </Box>
  );
};

export default Home;
