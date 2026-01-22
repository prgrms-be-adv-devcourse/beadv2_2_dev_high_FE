import React from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const Guide: React.FC = () => {
  const theme = useTheme();
  const buyerSteps = [
    {
      title: "경매 탐색 & 찜",
      body: "진행 중/예정 경매를 둘러보고 관심 상품을 찜해 두세요.",
    },
    {
      title: "보증금 납부 후 입찰",
      body: "입찰 시 추가 결제는 없습니다. 최소 보증금만 내면 자유롭게 입찰할 수 있어요.",
    },
    {
      title: "낙찰 후 결제",
      body: "낙찰되면 결제기한 내에 결제를 완료합니다.",
    },
    {
      title: "미결제 시 취소",
      body: "기한 내 미결제 시 구매가 취소되며 보증금은 환급되지 않습니다.",
    },
  ];

  const sellerSteps = [
    {
      title: "판매자 승인 신청",
      body: "간단한 신청 후 승인을 받으면 판매자로 활동할 수 있습니다.",
    },
    {
      title: "상품 등록",
      body: "상품 정보와 경매 조건을 입력해 경매를 등록합니다.",
    },
    {
      title: "경매 종료 및 낙찰",
      body: "경매 종료 시 최고입찰자가 낙찰자로 확정됩니다.",
    },
    {
      title: "구매 확정 및 정산",
      body: "구매 확정 건을 기준으로 지정일에 정산이 진행됩니다.",
    },
  ];

  return (
    <Box
      sx={{
        py: { xs: 6, md: 8 },
        position: "relative",
        overflow: "hidden",
        "--guide-ink": theme.palette.mode === "light" ? "#0f172a" : "#e2e8f0",
        "--guide-muted":
          theme.palette.mode === "light" ? "rgba(15, 23, 42, 0.6)" : "rgba(226, 232, 240, 0.65)",
        "--guide-accent": theme.palette.mode === "light" ? "#fb923c" : "#fdba74",
        "--guide-surface":
          theme.palette.mode === "light" ? "rgba(255, 255, 255, 0.92)" : "rgba(15, 23, 42, 0.7)",
        "--guide-border":
          theme.palette.mode === "light" ? "rgba(15, 23, 42, 0.12)" : "rgba(148, 163, 184, 0.35)",
        background:
          theme.palette.mode === "light"
            ? "linear-gradient(140deg, rgba(254, 243, 199, 0.8), rgba(255, 255, 255, 0.95))"
            : "linear-gradient(140deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "-25% auto auto -10%",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            theme.palette.mode === "light"
              ? "radial-gradient(circle, rgba(251, 146, 60, 0.25), transparent 70%)"
              : "radial-gradient(circle, rgba(251, 146, 60, 0.2), transparent 70%)",
          filter: "blur(6px)",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          inset: "auto -10% -30% auto",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background:
            theme.palette.mode === "light"
              ? "radial-gradient(circle, rgba(56, 189, 248, 0.16), transparent 70%)"
              : "radial-gradient(circle, rgba(14, 116, 144, 0.25), transparent 70%)",
          filter: "blur(10px)",
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Stack spacing={1.5} alignItems="flex-start" sx={{ mb: { xs: 4, md: 5 } }}>
          <Chip
            label="GUIDE"
            sx={{
              bgcolor: "transparent",
              border: "1px solid var(--guide-border)",
              fontWeight: 700,
              letterSpacing: "0.3em",
              color: "var(--guide-muted)",
            }}
          />
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: "var(--guide-ink)",
              fontFamily: '"Bodoni Moda", "Playfair Display", "Times New Roman", serif',
            }}
          >
            More Auction 이용 가이드
          </Typography>
          <Typography
            variant="body1"
            sx={{
              maxWidth: 720,
              color: "var(--guide-muted)",
              fontFamily: '"Space Grotesk", "Pretendard", "Apple SD Gothic Neo", sans-serif',
            }}
          >
            구매자·판매자 흐름을 한눈에 정리했습니다.
          </Typography>
          <Button
            component={RouterLink}
            to="/search"
            variant="contained"
            sx={{
              borderRadius: 999,
              px: 3,
              bgcolor: "var(--guide-accent)",
              color: theme.palette.mode === "light" ? "#0f172a" : "#0f172a",
              textTransform: "none",
              "&:hover": {
                bgcolor: "var(--guide-accent)",
                opacity: 0.9,
              },
            }}
          >
            경매 둘러보기
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2.5}>
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: { xs: 2.5, md: 3 },
              borderRadius: 4,
              border: "1px solid var(--guide-border)",
              background: "var(--guide-surface)",
            }}
          >
            <Stack spacing={2.2}>
              <Stack spacing={0.6}>
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: "0.25em",
                    color: "var(--guide-muted)",
                    fontWeight: 700,
                  }}
                >
                  BUYER FLOW
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "var(--guide-ink)",
                    fontFamily: '"Bodoni Moda", "Playfair Display", "Times New Roman", serif',
                  }}
                >
                  구매자 이용 방법
                </Typography>
              </Stack>
              <Stack spacing={1.8}>
                {buyerSteps.map((step, index) => (
                  <Box
                    key={step.title}
                    sx={{
                      p: 1.6,
                      borderRadius: 2.5,
                      border: "1px solid var(--guide-border)",
                      bgcolor:
                        theme.palette.mode === "light"
                          ? "rgba(255, 255, 255, 0.7)"
                          : "rgba(15, 23, 42, 0.4)",
                    }}
                  >
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: 10,
                          bgcolor:
                            theme.palette.mode === "light"
                              ? "rgba(15, 23, 42, 0.1)"
                              : "rgba(226, 232, 240, 0.12)",
                          color: "var(--guide-ink)",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 700,
                          color: "var(--guide-ink)",
                          fontFamily:
                            '"Space Grotesk", "Pretendard", "Apple SD Gothic Neo", sans-serif',
                        }}
                      >
                        {step.title}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.8,
                        color: "var(--guide-muted)",
                        fontFamily:
                          '"Space Grotesk", "Pretendard", "Apple SD Gothic Neo", sans-serif',
                      }}
                    >
                      {step.body}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: { xs: 2.5, md: 3 },
              borderRadius: 4,
              border: "1px solid var(--guide-border)",
              background:
                theme.palette.mode === "light"
                  ? "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 237, 213, 0.88))"
                  : "linear-gradient(135deg, rgba(15, 23, 42, 0.75), rgba(30, 41, 59, 0.9))",
            }}
          >
            <Stack spacing={2.2}>
              <Stack spacing={0.6}>
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: "0.25em",
                    color: "var(--guide-muted)",
                    fontWeight: 700,
                  }}
                >
                  SELLER FLOW
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "var(--guide-ink)",
                    fontFamily: '"Bodoni Moda", "Playfair Display", "Times New Roman", serif',
                  }}
                >
                  판매자 이용 방법
                </Typography>
              </Stack>
              <Stack spacing={1.8}>
                {sellerSteps.map((step, index) => (
                  <Box
                    key={step.title}
                    sx={{
                      p: 1.6,
                      borderRadius: 2.5,
                      border: "1px solid var(--guide-border)",
                      bgcolor:
                        theme.palette.mode === "light"
                          ? "rgba(255, 255, 255, 0.7)"
                          : "rgba(15, 23, 42, 0.4)",
                    }}
                  >
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: 10,
                          bgcolor:
                            theme.palette.mode === "light"
                              ? "rgba(15, 23, 42, 0.1)"
                              : "rgba(226, 232, 240, 0.12)",
                          color: "var(--guide-ink)",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 700,
                          color: "var(--guide-ink)",
                          fontFamily:
                            '"Space Grotesk", "Pretendard", "Apple SD Gothic Neo", sans-serif',
                        }}
                      >
                        {step.title}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.8,
                        color: "var(--guide-muted)",
                        fontFamily:
                          '"Space Grotesk", "Pretendard", "Apple SD Gothic Neo", sans-serif',
                      }}
                    >
                      {step.body}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Paper>
        </Stack>

        <Stack spacing={2.5} sx={{ mt: { xs: 4, md: 5 } }}>
          <Divider sx={{ borderColor: "var(--guide-border)" }} />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: { xs: 2, md: 2.5 },
                borderRadius: 3,
                border: "1px solid var(--guide-border)",
                background: "var(--guide-surface)",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  color: "var(--guide-ink)",
                  mb: 0.8,
                }}
              >
                보증금 규칙
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--guide-muted)" }}>
                보증금은 입찰 참여를 위한 최소 요건이며, 낙찰되지 않으면 환불됩니다.
                낙찰 후 미결제 시 보증금은 환급되지 않습니다. 낙찰되면 보증금을
                돌려받을 수 없으니 신중하게 구매할 상품에만 참여해 주세요.
              </Typography>
            </Paper>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: { xs: 2, md: 2.5 },
                borderRadius: 3,
                border: "1px solid var(--guide-border)",
                background: "var(--guide-surface)",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  color: "var(--guide-ink)",
                  mb: 0.8,
                }}
              >
                결제 & 정산
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--guide-muted)" }}>
                결제는 낙찰 후에 진행됩니다. 판매자 정산은 구매 확정 건을
                기준으로 지정일에 처리됩니다.
              </Typography>
            </Paper>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default Guide;
