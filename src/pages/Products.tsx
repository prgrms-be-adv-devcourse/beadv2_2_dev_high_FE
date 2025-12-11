import {
  Button,
  Card,
  CardContent,
  CardMedia,
  Container,
  Box,
  Pagination,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { productApi } from "../apis/productApi";
import type { PagedProductResponse, Product } from "../types/product";

const Products: React.FC = () => {
  const [data, setData] = useState<PagedProductResponse | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await productApi.getProducts({
          page: page - 1, // API는 0-based index
          size: 8,
        });
        const productsWithImages = response.data.content.map((product) => ({
          ...product,
          // TODO: 실제 이미지 URL 필드가 생기면 대체
          imageUrl: `https://picsum.photos/seed/${product.id}/500/400`, // 임시 이미지
        }));
        setData({ ...response.data, content: productsWithImages });
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [page]);

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  return (
    <Container>
      <Typography variant="h4" sx={{ my: 4 }}>
        상품 목록
      </Typography>
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
        {data?.content?.map((product: Product) => (
          <Box key={product.id}>
            <Card
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <CardMedia
                component="img"
                height="200"
                image={product?.imageUrl}
                alt={product.name}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">
                  {product.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {product.description || "상품 설명이 없습니다."}
                </Typography>
                <Typography variant="h6" color="text.primary" sx={{ mt: 2 }}>
                  상태: {product.status}
                </Typography>
              </CardContent>
              <Button
                size="small"
                color="primary"
                component={RouterLink}
                to={`/products/${product.id}`}
                sx={{ m: 1 }}
              >
                자세히 보기
              </Button>
            </Card>
          </Box>
        ))}
      </Box>
      <Pagination
        count={data?.totalPages ?? 0}
        page={page}
        onChange={handlePageChange}
        sx={{ display: "flex", justifyContent: "center", mt: 4 }}
      />
    </Container>
  );
};

export default Products;
