import {
  Alert,
  Chip,
  ListItemButton,
  Skeleton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import type { Product, ProductAndAuction } from "@moreauction/types";
import { getCommonStatusText } from "@moreauction/utils";
import { formatWon } from "@moreauction/utils";

interface MyProductsTabProps {
  loading: boolean;
  error: string | null;
  products: ProductAndAuction[];
}

export const MyProductsTab: React.FC<MyProductsTabProps> = ({
  loading,
  error,
  products,
}) => {
  const showSkeleton = loading && !error && products.length === 0;

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          내 상품 목록
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  const formatPriceInfo = (product: Product) => {
    if (product.startBid != null) {
      const highest =
        product.currentBid != null && product.currentBid > 0
          ? formatWon(product.currentBid)
          : "-";
      return `최고입찰가 ${highest} · 시작가 ${formatWon(product.startBid)}`;
    }
    return null;
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        내 상품 목록
      </Typography>
      {showSkeleton ? (
        <List sx={{ maxHeight: "60vh", overflowY: "auto" }}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <React.Fragment key={idx}>
              <ListItem>
                <ListItemText
                  primary={<Skeleton width="60%" />}
                  secondary={<Skeleton width="40%" />}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      ) : products?.length === 0 ? (
        <Alert severity="info">등록된 상품이 없습니다.</Alert>
      ) : (
        <List sx={{ maxHeight: "60vh", overflowY: "auto" }}>
          {products.map(({ product, auctions }) => {
            const priceInfo = formatPriceInfo(product);
            const statusText = getCommonStatusText(product.status);
            return (
              <React.Fragment key={product.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to={`/products/${product.id}`}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight={600}>
                          {product.name}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            상태: {statusText}
                          </Typography>
                          {priceInfo && (
                            <Typography variant="body2" color="text.secondary">
                              {priceInfo}
                            </Typography>
                          )}
                        </>
                      }
                    />
                    <Chip label="상세보기" size="small" />
                  </ListItemButton>
                </ListItem>
                <Divider />
              </React.Fragment>
            );
          })}
        </List>
      )}
    </Paper>
  );
};
