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
import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@moreauction/types";
import { productApi } from "@/apis/productApi";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/queries/queryKeys";
import { getErrorMessage } from "@/utils/getErrorMessage";

export const MyProductsTab: React.FC = () => {
  const { user } = useAuth();
  const productsQuery = useQuery({
    queryKey: queryKeys.products.mine(user?.userId),
    queryFn: async () => {
      if (!user?.userId) return [];
      const response = await productApi.getMyProducts(user.userId);
      return response.data as Product[];
    },
    staleTime: 30_000,
  });

  const products = productsQuery.data ?? [];
  const errorMessage = useMemo(() => {
    if (!productsQuery.isError) return null;
    return getErrorMessage(
      productsQuery.error,
      "내 상품 목록을 불러오지 못했습니다."
    );
  }, [productsQuery.error, productsQuery.isError]);
  const showSkeleton =
    productsQuery.isLoading && !errorMessage && products.length === 0;

  if (errorMessage) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          내 상품 목록
        </Typography>
        <Alert severity="error">{errorMessage}</Alert>
      </Paper>
    );
  }

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
          {products.map((product) => {
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
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {product.description || "상품 설명이 없습니다."}
                          </Typography>
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
