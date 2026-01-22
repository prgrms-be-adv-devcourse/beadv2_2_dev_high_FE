import React from "react";
import { Box, Button, Container, Stack, Typography, useTheme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const HomeHowItWorksSection: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: { xs: 4, md: 5 },
        position: "relative",
        overflow: "hidden",
        "--howitworks-ink": theme.palette.mode === "light" ? "#0f172a" : "#e2e8f0",
        "--howitworks-muted":
          theme.palette.mode === "light" ? "rgba(15, 23, 42, 0.55)" : "rgba(226, 232, 240, 0.6)",
        "--howitworks-accent": theme.palette.mode === "light" ? "#f97316" : "#fb923c",
        "--howitworks-border":
          theme.palette.mode === "light" ? "rgba(15, 23, 42, 0.08)" : "rgba(148, 163, 184, 0.25)",
        background:
          theme.palette.mode === "light"
            ? "linear-gradient(120deg, rgba(255, 247, 237, 0.8), rgba(255, 255, 255, 0.9))"
            : "linear-gradient(120deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.8))",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "-20% -10% auto auto",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background:
            theme.palette.mode === "light"
              ? "radial-gradient(circle, rgba(253, 186, 116, 0.35), transparent 70%)"
              : "radial-gradient(circle, rgba(251, 146, 60, 0.25), transparent 70%)",
          filter: "blur(4px)",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          inset: "auto auto -24% -12%",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            theme.palette.mode === "light"
              ? "radial-gradient(circle, rgba(99, 102, 241, 0.18), transparent 70%)"
              : "radial-gradient(circle, rgba(94, 234, 212, 0.18), transparent 70%)",
          filter: "blur(10px)",
        },
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={1.2} alignItems="center" sx={{ position: "relative", zIndex: 1 }}>
          <Typography
            variant="overline"
            sx={{
              letterSpacing: "0.35em",
              color: "var(--howitworks-muted)",
              fontFamily: '"Space Grotesk", "Pretendard", "Apple SD Gothic Neo", sans-serif',
            }}
          >
            HOW IT WORKS
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              textAlign: "center",
              color: "var(--howitworks-ink)",
              fontFamily: '"Bodoni Moda", "Playfair Display", "Times New Roman", serif',
            }}
          >
            More Auction 이용 가이드
          </Typography>
          <Box
            sx={{
              mt: { xs: 1.5, md: 2 },
              px: { xs: 2, md: 2.5 },
              py: { xs: 1.8, md: 2 },
              borderRadius: 999,
              border: "1px solid var(--howitworks-border)",
              bgcolor:
                theme.palette.mode === "light"
                  ? "rgba(255, 255, 255, 0.7)"
                  : "rgba(15, 23, 42, 0.5)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "var(--howitworks-muted)",
                fontFamily: '"Space Grotesk", "Pretendard", "Apple SD Gothic Neo", sans-serif',
              }}
            >
              구매자·판매자 흐름을 한 장으로 정리했어요.
            </Typography>
            <Button
              component={RouterLink}
              to="/guide"
              variant="contained"
              size="small"
              sx={{
                borderRadius: 999,
                px: 2.5,
                bgcolor: "var(--howitworks-accent)",
                color: "#0f172a",
                fontWeight: 700,
                textTransform: "none",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: "var(--howitworks-accent)",
                  opacity: 0.9,
                  boxShadow: "none",
                },
              }}
            >
              이용 가이드 보기
            </Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default HomeHowItWorksSection;
