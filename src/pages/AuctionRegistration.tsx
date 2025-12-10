import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { auctionApi } from "../apis/auctionApi";
import { productApi } from "../apis/productApi";
import type { Product } from "../types/product";

interface AuctionFormData {
  startBid: number;
  auctionStartAt: string;
  auctionEndAt: string;
}

const AuctionRegistration: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuctionFormData>();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // 'READY' 상태의 상품만 가져온다고 가정
        const response = await productApi.getMyProducts({ status: "READY" });
        setProducts(response.data);
      } catch (err) {
        setError("상품 목록을 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const onSubmit = async (data: AuctionFormData) => {
    if (!selectedProduct) return;

    setLoading(true);
    setError(null);

    try {
      const auctionData = {
        productId: selectedProduct.id,
        startBid: Number(data.startBid),
        auctionStartAt: new Date(data.auctionStartAt).toISOString(),
        auctionEndAt: new Date(data.auctionEndAt).toISOString(),
      };

      const response = await auctionApi.createAuction(auctionData);
      alert("경매가 성공적으로 등록되었습니다.");
      navigate(`/auctions/${response.data.auctionId}`);
    } catch (err: any) {
      console.error("경매 등록 실패:", err);
      setError(err.response?.data?.message || "경매 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !selectedProduct) {
    return (
      <Container sx={{ textAlign: "center", mt: 5 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      {!selectedProduct ? (
        <>
          <Typography variant="h4" sx={{ my: 4 }}>
            경매에 등록할 상품 선택
          </Typography>
          <Paper>
            <List>
              {products.length > 0 ? (
                products.map((product) => (
                  <React.Fragment key={product.id}>
                    <ListItem
                      secondaryAction={
                        <Button
                          variant="contained"
                          onClick={() => setSelectedProduct(product)}
                        >
                          선택
                        </Button>
                      }
                    >
                      <ListItemText
                        primary={product.name}
                        secondary={product.description}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="경매에 등록할 수 있는 상품이 없습니다." />
                </ListItem>
              )}
            </List>
          </Paper>
        </>
      ) : (
        <>
          <Typography variant="h4" sx={{ my: 4 }}>
            경매 정보 등록
          </Typography>
          <Typography variant="h6">
            선택된 상품: {selectedProduct.name}
          </Typography>
          <Paper sx={{ p: 4, mt: 2 }}>
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              sx={{ mt: 1 }}
            >
              <TextField
                margin="normal"
                required
                fullWidth
                id="startBid"
                label="시작 입찰가"
                type="number"
                {...register("startBid", {
                  required: "시작 입찰가는 필수입니다.",
                  valueAsNumber: true,
                })}
                error={!!errors.startBid}
                helperText={errors.startBid?.message}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="auctionStartAt"
                label="경매 시작 시간"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                {...register("auctionStartAt", {
                  required: "경매 시작 시간은 필수입니다.",
                })}
                error={!!errors.auctionStartAt}
                helperText={
                  errors.auctionStartAt?.message || "예: 2025-12-12T11:00"
                }
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="auctionEndAt"
                label="경매 종료 시간"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                {...register("auctionEndAt", {
                  required: "경매 종료 시간은 필수입니다.",
                })}
                error={!!errors.auctionEndAt}
                helperText={
                  errors.auctionEndAt?.message || "예: 2025-12-12T15:00"
                }
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setSelectedProduct(null)}
                  disabled={loading}
                >
                  상품 다시 선택
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{ py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : "경매 등록하기"}
                </Button>
              </Box>
            </Box>
          </Paper>
        </>
      )}
    </Container>
  );
};

export default AuctionRegistration;
