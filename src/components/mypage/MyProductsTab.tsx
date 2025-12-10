import {
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import React from "react";
import type { Product } from "../../types/product";

interface MyProductsTabProps {
  loading: boolean;
  error: string | null;
  products: Product[];
}

export const MyProductsTab: React.FC<MyProductsTabProps> = ({
  loading,
  error,
  products,
}) => {
  return (
    <Paper sx={{ p: 2 }}>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            내 상품 목록
          </Typography>
          {products.length === 0 ? (
            <Typography>등록된 상품이 없습니다.</Typography>
          ) : (
            <List>
              {products.map((product) => (
                <React.Fragment key={product.id}>
                  <ListItem>
                    <ListItemText
                      primary={product.name}
                      secondary={`상태: ${product.status}`}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </>
      )}
    </Paper>
  );
};

