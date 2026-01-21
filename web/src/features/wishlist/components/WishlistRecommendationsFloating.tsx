import type { ProductRecommendationResponse } from "@moreauction/types";
import MouseIcon from "@mui/icons-material/Mouse";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ImageWithFallback } from "@/shared/components/common/ImageWithFallback";

type WishlistRecommendationsFloatingProps = {
  summary: string;
  items: ProductRecommendationResponse[];
  isLoading: boolean;
};

const WishlistRecommendationsFloating: React.FC<
  WishlistRecommendationsFloatingProps
> = ({ summary, items, isLoading }) => {
  const [isRecoHover, setIsRecoHover] = useState(false);

  return (
    <Box
      onMouseLeave={() => setIsRecoHover(false)}
      sx={{
        position: "fixed",
        bottom: { xs: 12, sm: 16 },
        left: "50%",
        zIndex: 1200,
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "center",
        gap: 0.4,
        px: 0.4,
        pb: 0.9,
        pt: 0.2,
      }}
    >
      <Paper
        variant="outlined"
        onMouseEnter={() => setIsRecoHover(true)}
        sx={{
          position: "relative",
          px: 1.2,
          py: 0.6,
          borderRadius: 999,
          bgcolor: "background.paper",
          opacity: isRecoHover ? 0 : 0.7,
          transform: isRecoHover ? "translateY(14px)" : "translateY(0)",
          transition: "opacity 300ms ease, transform 350ms ease",
          cursor: "pointer",
          "@keyframes wishlistPulse": {
            "0%": { transform: "scale(0.9)", opacity: 0.6 },
            "70%": { transform: "scale(1.6)", opacity: 0 },
            "100%": { transform: "scale(1.6)", opacity: 0 },
          },
          "&::before": {
            content: '""',
            position: "absolute",
            inset: -4,
            borderRadius: 999,
            border: "1px solid",
            borderColor: "primary.main",
            opacity: isRecoHover ? 0 : 0.35,
            animation: isRecoHover
              ? "none"
              : "wishlistPulse 2.4s ease-out infinite",
          },
        }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center">
          <MouseIcon
            fontSize="small"
            sx={{
              color: "primary.contrastText",
              bgcolor: "primary.main",
              borderRadius: "50%",
              boxShadow: 2,
              p: 0.4,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              opacity: 1,
              whiteSpace: "nowrap",
            }}
          >
            추천 상품 확인
          </Typography>
        </Stack>
      </Paper>
      <Paper
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          backdropFilter: "blur(8px)",
          boxShadow: 4,
          width: { xs: "calc(100vw - 16px)", sm: 560, md: 680 },
          opacity: { xs: 1, sm: isRecoHover ? 1 : 0 },
          transform: {
            xs: "none",
            sm: isRecoHover ? "translateY(16px)" : "translateY(24px)",
          },
          transition: "opacity 450ms ease, transform 350ms ease",
          pointerEvents: isRecoHover ? "auto" : "none",
        }}
      >
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            회원님을 위한 추천
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {summary || "회원님께 어울릴 만한 상품을 추천드려요."}
          </Typography>
        </Box>
        <Box
          sx={{
            maxHeight: { xs: 520, sm: isRecoHover ? 320 : 140 },
            overflow: "hidden",
            transition: "max-height 200ms ease",
          }}
        >
          {isLoading && (
            <Stack direction="row" spacing={1.5} sx={{ overflowX: "auto" }}>
              {Array.from({ length: 3 }).map((_, idx) => (
                <Card
                  key={`wishlist-reco-${idx}`}
                  sx={{
                    minWidth: 180,
                    flex: "0 0 auto",
                    borderRadius: 2.5,
                  }}
                >
                  <Skeleton variant="rectangular" height={110} />
                  <CardContent
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                    }}
                  >
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="60%" />
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
          {!isLoading && items.length === 0 && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                color: "text.secondary",
                textAlign: "center",
              }}
            >
              회원님을 위한 추천을 준비 중이에요.
            </Paper>
          )}
          {!isLoading && items.length > 0 && (
            <Stack direction="row" spacing={1.5} sx={{ overflowX: "auto" }}>
              {items.map((item) => {
                const categoryLabels = (item.categories ?? []).filter(
                  (label): label is string => !!label,
                );
                const primaryCategories = categoryLabels.slice(0, 2);
                const remainingCategoryCount = Math.max(
                  categoryLabels.length - primaryCategories.length,
                  0,
                );
                const auctionDate = item.auctionStartAt
                  ? new Date(item.auctionStartAt).toLocaleDateString()
                  : null;

                return (
                  <Paper
                    key={item.productId}
                    variant="outlined"
                    sx={{
                      minWidth: 200,
                      flex: "0 0 auto",
                      borderRadius: 2.5,
                      overflow: "hidden",
                      bgcolor: "background.paper",
                    }}
                  >
                    <ImageWithFallback
                      src={item.imageUrl}
                      alt={item.productName}
                      height={110}
                      loading={isLoading}
                      sx={{ objectFit: "cover" }}
                    />
                    <Box sx={{ p: 1.25 }}>
                      {primaryCategories.length > 0 ? (
                        <Stack direction="row" spacing={0.5} sx={{ mb: 0.5 }}>
                          <Chip
                            label={primaryCategories[0]}
                            size="small"
                            variant="outlined"
                          />
                          {primaryCategories.length > 1 && (
                            <Chip
                              label={primaryCategories[1]}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {remainingCategoryCount > 0 && (
                            <Chip
                              label={`+${remainingCategoryCount}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      ) : (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mb: 0.5 }}
                        >
                          카테고리 없음
                        </Typography>
                      )}
                      <Typography
                        fontWeight={700}
                        component={RouterLink}
                        to={`/products/${item.productId}`}
                        sx={{
                          textDecoration: "none",
                          color: "inherit",
                          "&:hover": { textDecoration: "underline" },
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.productName}
                      </Typography>
                      {auctionDate && (
                        <Typography variant="caption" color="text.secondary">
                          {auctionDate} 경매 시작
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default WishlistRecommendationsFloating;
