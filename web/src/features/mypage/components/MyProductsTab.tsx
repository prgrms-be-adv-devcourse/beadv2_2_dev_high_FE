import {
  Alert,
  Box,
  Chip,
  ListItemButton,
  Pagination,
  Skeleton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@moreauction/types";
import { productApi } from "@/apis/productApi";
import { useAuth } from "@moreauction/auth";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const MyProductsTab: React.FC = () => {
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const { user } = useAuth();
  const productsQuery = useQuery({
    queryKey: [...queryKeys.products.mine(user?.userId), page, pageSize],
    queryFn: async () => {
      if (!user?.userId) return { content: [] };
      const response = await productApi.getMyProducts(user.userId, {
        page,
        size: pageSize,
        sort: ["createdAt,DESC"],
      });
      const payload: any = response.data;
      if (payload?.content) return payload;
      if (payload?.data?.content) return payload.data;
      return payload ?? { content: [] };
    },
    staleTime: 30_000,
  });

  const products = (productsQuery.data as any)?.content ?? [];
  const totalPages = (productsQuery.data as any)?.totalPages ?? 0;
  const currentPage = (productsQuery.data as any)?.number ?? page;
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
        <>
          <List sx={{ maxHeight: "60vh", overflowY: "auto" }}>
            {products.map((product: Product) => {
              return (
                <React.Fragment key={product.id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      component={RouterLink}
                      to={`/products/${product.id}`}
                    >
                      <ListItemText
                        primary={product.name}
                        primaryTypographyProps={{
                          variant: "subtitle1",
                          fontWeight: 600,
                        }}
                        secondaryTypographyProps={{ component: "div" }}
                        secondary={
                          <Box
                            sx={{ display: "flex", flexDirection: "column" }}
                          >
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
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              등록일: {formatDateTime(product.createdAt)} ·
                              수정일: {formatDateTime(product.updatedAt)}
                            </Typography>
                          </Box>
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
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Pagination
                count={totalPages}
                page={currentPage + 1}
                onChange={(_, nextPage) => setPage(nextPage - 1)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};
