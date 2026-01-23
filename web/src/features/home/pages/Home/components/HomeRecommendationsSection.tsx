import React from "react";
import type { ProductRecommendationResponse } from "@moreauction/types";
import { AuctionStatus } from "@moreauction/types";
import { getAuctionStatusText } from "@moreauction/utils";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useActivityWishlistRecommendations } from "@/hooks/useActivityWishlistRecommendations";
import { ImageWithFallback } from "@/shared/components/common/ImageWithFallback";

type HomeRecommendationsSectionProps = {
  isAuthenticated: boolean;
  userId?: string | null;
};

const HomeRecommendationsSection: React.FC<HomeRecommendationsSectionProps> = ({
  isAuthenticated,
  userId,
}) => {
  const theme = useTheme();
  const activityRecommendationsQuery = useActivityWishlistRecommendations({
    userId,
    limitPerSource: 5,
  });
  const activityRecommendations =
    activityRecommendationsQuery.data?.items ??
    ([] as ProductRecommendationResponse[]);

  const hasAuctionInfo = (item: ProductRecommendationResponse) =>
    Boolean(item.auctionStartAt || item.auctionEndAt || item.status);

  const getAuctionLabel = (status?: AuctionStatus | null) =>
    getAuctionStatusText(status ?? null);

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              개인 맞춤 추천
            </Typography>
            <Typography variant="body2" color="text.secondary">
              관심 상품과 활동을 바탕으로 상품을 추천합니다.
            </Typography>
          </Box>
          <Button size="small" disabled>
            추천 더 보기 (준비 중)
          </Button>
        </Stack>

        {isAuthenticated ? (
          <>
            {activityRecommendationsQuery.isLoading ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                    lg: "repeat(4, 1fr)",
                  },
                  gap: 4,
                }}
              >
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Card
                    key={`ai-reco-${idx}`}
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor:
                        theme.palette.mode === "light"
                          ? "rgba(15, 23, 42, 0.08)"
                          : "rgba(148, 163, 184, 0.2)",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Skeleton variant="rectangular" height={220} />
                    <CardContent sx={{ display: "grid", gap: 0.5 }}>
                      <Skeleton variant="text" width="80%" />
                      <Skeleton variant="text" width="60%" />
                      <Skeleton variant="text" width="55%" />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : activityRecommendations.length > 0 ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                    lg: "repeat(4, 1fr)",
                  },
                  gap: 4,
                }}
              >
                {activityRecommendations.slice(0, 4).map((item) => {
                  const hasInfo = hasAuctionInfo(item);
                  return (
                    <Card
                      key={item.productId}
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor:
                          theme.palette.mode === "light"
                            ? "rgba(15, 23, 42, 0.08)"
                            : "rgba(148, 163, 184, 0.2)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        bgcolor: "background.paper",
                      }}
                    >
                      <CardActionArea
                        component={RouterLink}
                        to={`/products/${item.productId}`}
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          position: "relative",
                        }}
                      >
                        <ImageWithFallback
                          src={item.imageUrl}
                          alt={item.productName}
                          height={220}
                          sx={{ objectFit: "cover" }}
                        />
                        <Chip
                          size="small"
                          label={
                            hasInfo
                              ? getAuctionLabel(item.status as AuctionStatus)
                              : "경매 미등록"
                          }
                          sx={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            fontWeight: 700,
                            border: "1px solid",
                            borderColor: (theme) =>
                              theme.palette.mode === "light"
                                ? "rgba(15, 23, 42, 0.12)"
                                : "rgba(148, 163, 184, 0.35)",
                            bgcolor: (theme) =>
                              theme.palette.mode === "light"
                                ? "rgba(255, 255, 255, 0.92)"
                                : "rgba(15, 23, 42, 0.8)",
                            color: (theme) =>
                              theme.palette.mode === "light"
                                ? "text.primary"
                                : "rgba(248, 250, 252, 0.95)",
                            backdropFilter: "blur(6px)",
                            boxShadow: (theme) =>
                              theme.palette.mode === "light"
                                ? "0 6px 16px rgba(15, 23, 42, 0.12)"
                                : "0 6px 16px rgba(0, 0, 0, 0.35)",
                          }}
                        />
                        <CardContent
                          sx={{
                            display: "grid",
                            gap: 0.5,
                            width: "100%",
                            flexGrow: 1,
                            minHeight: 96,
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            noWrap
                          >
                            {item.productName}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {(item.categories ?? [])
                              .slice(0, 2)
                              .join(" · ") || "카테고리 없음"}
                          </Typography>
                          {hasInfo ? null : null}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  );
                })}
              </Box>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: "1px dashed",
                  borderColor:
                    theme.palette.mode === "light"
                      ? "rgba(15, 23, 42, 0.25)"
                      : "rgba(148, 163, 184, 0.3)",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, mb: 1 }}
                >
                  활동 기반 추천이 아직 없어요
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  최근 본 상품이나 참여한 경매가 쌓이면 맞춤 추천을
                  보여드릴게요.
                </Typography>
              </Paper>
            )}
          </>
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px dashed",
              borderColor:
                theme.palette.mode === "light"
                  ? "rgba(15, 23, 42, 0.25)"
                  : "rgba(148, 163, 184, 0.3)",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              로그인하고 맞춤 추천을 확인하세요
            </Typography>
            <Typography variant="body2" color="text.secondary">
              로그인하면 나에게 맞는 경매 상품을 더 쉽게 찾을 수 있어요.
            </Typography>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              sx={{ mt: 2 }}
            >
              로그인하기
            </Button>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default HomeRecommendationsSection;
