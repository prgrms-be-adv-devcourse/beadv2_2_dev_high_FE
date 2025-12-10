import { Box, Container, Link, Stack, Typography } from "@mui/material";
import React from "react";

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: "auto", // 내용이 적을 때 푸터를 하단에 고정
        backgroundColor: (theme) =>
          theme.palette.mode === "light"
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Shrimp Project. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={3}>
            <Link
              href="#"
              variant="body2"
              color="text.secondary"
              onClick={(e) => e.preventDefault()}
            >
              서비스 이용약관
            </Link>
            <Link
              href="#"
              variant="body2"
              color="text.secondary"
              onClick={(e) => e.preventDefault()}
            >
              개인정보 처리방침
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;