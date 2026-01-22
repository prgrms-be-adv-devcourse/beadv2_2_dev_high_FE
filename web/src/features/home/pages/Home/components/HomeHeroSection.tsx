import React from "react";
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { ArrowForward as ArrowForwardIcon, Gavel as GavelIcon } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import TopAuctionsCarousel from "@/features/home/components/TopAuctionsCarousel";

type HomeHeroSectionProps = {
  secondaryLabel: string;
  secondaryTo: string;
};

const HomeHeroSection: React.FC<HomeHeroSectionProps> = ({
  secondaryLabel,
  secondaryTo,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: { xs: 5, md: 6 },
        background: (t) =>
          t.palette.mode === "light"
            ? "radial-gradient(circle at 12% 12%, rgba(59, 130, 246, 0.32) 0, rgba(147, 197, 253, 0.55) 28%, rgba(224, 231, 255, 0.85) 55%, rgba(248, 250, 252, 0.98) 100%)"
            : "radial-gradient(circle at 12% 12%, rgba(51, 65, 85, 0.95) 0, rgba(15, 23, 42, 0.98) 45%, rgba(2, 6, 23, 1) 100%)",
        borderBottom: "1px solid",
        borderColor:
          theme.palette.mode === "light"
            ? "rgba(15, 23, 42, 0.06)"
            : "rgba(148, 163, 184, 0.25)",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems="center"
          spacing={4}
        >
          <Box flex={1}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                mb: 2,
                letterSpacing: "-0.03em",
              }}
            >
              실시간 경매로
              <br />
              원하는 상품을 만나보세요.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              판매자는 손쉽게 상품을 등록하고, 구매자는 진행 중인 경매를
              한눈에 확인할 수 있습니다. 지금 바로 경매를 시작해 보세요.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                component={RouterLink}
                to="/search?page=0&size=20"
                startIcon={<GavelIcon />}
              >
                상품 둘러보기
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                size="large"
                component={RouterLink}
                to={secondaryTo}
              >
                {secondaryLabel}
              </Button>
            </Stack>
            <Button
              component={RouterLink}
              to="/guide"
              variant="text"
              endIcon={<ArrowForwardIcon fontSize="small" />}
              sx={{
                mt: 1.5,
                px: 1.5,
                py: 0.6,
                borderRadius: 999,
                textTransform: "none",
                color: "text.primary",
                fontWeight: 700,
                alignSelf: "flex-start",
                border: "1px solid",
                borderColor:
                  theme.palette.mode === "light"
                    ? "rgba(15, 23, 42, 0.12)"
                    : "rgba(148, 163, 184, 0.4)",
                backgroundColor:
                  theme.palette.mode === "light"
                    ? "rgba(255, 255, 255, 0.7)"
                    : "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(6px)",
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "light"
                      ? "rgba(255, 255, 255, 0.9)"
                      : "rgba(15, 23, 42, 0.8)",
                },
              }}
            >
              이용 가이드 보기
            </Button>
          </Box>
          <Box flex={1}>
            <TopAuctionsCarousel />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default HomeHeroSection;
