import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { formatWon } from "@moreauction/utils";
import type {
  AuctionDetailResponse,
  Product,
  SimilarProductResponse,
} from "@moreauction/types";
import { ImageWithFallback } from "@/shared/components/common/ImageWithFallback";

type SimilarAuctionsSectionProps = {
  items: SimilarProductResponse[];
  loading: boolean;
  auctionsById: Map<string, AuctionDetailResponse>;
  productsById: Map<string, Product>;
  showHeader?: boolean;
};

export const SimilarAuctionsSection = ({
  items,
  loading,
  auctionsById,
  productsById,
  showHeader = true,
}: SimilarAuctionsSectionProps) => {
  return (
    <Box>
      {showHeader && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              비슷한 경매
            </Typography>
            <Typography variant="body2" color="text.secondary">
              이 경매와 비슷한 항목을 추천해 드려요.
            </Typography>
          </Box>
          <Button size="small" disabled>
            더 보기 (준비 중)
          </Button>
        </Stack>
      )}
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
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <Card
              key={`similar-auction-${idx}`}
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <Skeleton variant="rectangular" height={200} />
              <CardContent
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  mt: 1,
                }}
              >
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="50%" />
              </CardContent>
            </Card>
          ))
        ) : items.length === 0 ? (
          <Box sx={{ gridColumn: "1 / -1", py: 4 }}>
            <Typography color="text.secondary">추천 경매가 없어요.</Typography>
          </Box>
        ) : (
          items.map((item, idx) => {
            const hasAuction = !!item.auctionId;
            const auctionDetail = item.auctionId
              ? auctionsById.get(item.auctionId)
              : undefined;
            const product = productsById.get(item.productId);
            const title =
              auctionDetail?.productName ??
              product?.name ??
              item.productId;
            const targetPath = hasAuction
              ? `/auctions/${item.auctionId}`
              : `/products/${item.productId}`;
            const cardBody = (
              <>
                <ImageWithFallback
                  src={item.imageUrl}
                  alt="유사 경매 이미지"
                  height={200}
                  sx={{ objectFit: "cover", width: "100%" }}
                />
                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                    mt: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    유사도 {Math.round(item.score * 100)}%
                  </Typography>
                  {auctionDetail && (
                    <Typography variant="caption" color="text.secondary">
                      현재가 {formatWon(auctionDetail.currentBid)} · 상태{" "}
                      {auctionDetail.status}
                    </Typography>
                  )}
                  {!hasAuction && (
                    <Typography variant="caption" color="text.secondary">
                      진행 중 경매 없음
                    </Typography>
                  )}
                </CardContent>
              </>
            );

            return (
              <Card
                key={`similar-auction-${item.productId}-${idx}`}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardActionArea
                  component={RouterLink}
                  to={targetPath}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                  }}
                >
                  {cardBody}
                </CardActionArea>
              </Card>
            );
          })
        )}
      </Box>
    </Box>
  );
};
