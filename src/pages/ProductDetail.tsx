import React, { useEffect, useState } from "react";
import {
  Typography,
  Container,
  CircularProgress,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
} from "@mui/material";
import { useParams, Link as RouterLink } from "react-router-dom";
import { productApi } from "../apis/productApi";
import { auctionApi } from "../apis/auctionApi";
import type { Product } from "../types/product";
import { AuctionStatus, type Auction } from "../types/auction";
import { useAuth } from "../contexts/AuthContext";

const auctionStatusMap: Record<AuctionStatus, string> = {
  READY: "대기 중",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  FAILED: "유찰",
  CANCELLED: "취소됨",
};

const ProductDetail: React.FC = () => {
  const { id: productId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!productId) {
        setError("Product ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const productResponse = await productApi.getProductById(productId);
        setProduct(productResponse.data);

        const auctionsResponse = await auctionApi.getAuctionsByProductId(
          productId
        );

        let auctionData: Auction[] = [];
        if (
          auctionsResponse.data &&
          Array.isArray(auctionsResponse.data.content)
        ) {
          auctionData = auctionsResponse.data.content;
        } else if (Array.isArray(auctionsResponse.data)) {
          auctionData = auctionsResponse.data;
        }
        setAuctions(auctionData);
      } catch (err) {
        console.error("Error fetching product details or auctions:", err);
        setError("Failed to load product details or auctions.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  const canEditProduct =
    user &&
    product &&
    (user.role === "ADMIN" || user.id === product.sellerId) &&
    product.status === "READY";

  if (loading) {
    return (
      <Container sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography>상품을 찾을 수 없습니다.</Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h4" sx={{ my: 4 }}>
        상품 상세: {product.name}
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" gutterBottom>
            상품 정보
          </Typography>
          {canEditProduct && (
            <Button
              variant="contained"
              color="secondary"
              component={RouterLink}
              to={`/products/edit/${product.id}`}
            >
              상품 수정
            </Button>
          )}
        </Box>
        <Typography variant="body1">
          <strong>이름:</strong> {product.name}
        </Typography>
        <Typography variant="body1">
          <strong>설명:</strong> {product.description || "설명 없음"}
        </Typography>
        <Typography variant="body1">
          <strong>상태:</strong> {product.status}
        </Typography>
      </Box>

      <Typography variant="h5" sx={{ my: 4 }}>
        연관 경매 목록
      </Typography>
      {auctions.length > 0 ? (
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
          {auctions.map((auction: Auction) => (
            <Box key={auction.auctionId}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2">
                    {auction.productName}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    상태: {auctionStatusMap[auction.status]}
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    textAlign={"right"}
                  >
                    {Math.max(
                      auction?.currentBid ?? 0,
                      auction.startBid
                    ).toLocaleString()}
                    ₩
                  </Typography>
                </CardContent>
                <Box sx={{ display: "flex", justifyContent: "center", m: 1 }}>
                  <Button
                    size="small"
                    color="primary"
                    component={RouterLink}
                    to={`/auctions/${auction.auctionId}`}
                  >
                    자세히 보기
                  </Button>
                  {auction.status === AuctionStatus.READY &&
                    user &&
                    (user.role === "ADMIN" || user.id === product.sellerId) && (
                      <Button
                        size="small"
                        color="secondary"
                        component={RouterLink}
                        to={`/auction/edit/${auction.auctionId}`}
                      >
                        수정
                      </Button>
                    )}
                </Box>
              </Card>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography>연관된 경매가 없습니다.</Typography>
      )}
    </Container>
  );
};

export default ProductDetail;
