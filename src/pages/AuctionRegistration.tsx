import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { auctionApi } from "../apis/auctionApi";
import { productApi } from "../apis/productApi";
import { useAuth } from "../contexts/AuthContext";
import type { Auction, AuctionUpdateRequest } from "../types/auction";
import { AuctionStatus } from "../types/auction";
import type { Product } from "../types/product";

import {
  addHours,
  format,
  setMilliseconds,
  setMinutes,
  setSeconds,
} from "date-fns";
import { ko } from "date-fns/locale";
import { UserRole } from "../types/user";

interface AuctionFormData {
  startBid: number;
  auctionStartAt: string;
  auctionEndAt: string;
}

const AuctionRegistration: React.FC = () => {
  const { auctionId, productId } = useParams<{
    auctionId?: string;
    productId?: string;
  }>();
  const { user } = useAuth();
  const isEditMode = !!auctionId;
  const isReregisterMode = !auctionId && !!productId;
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<AuctionFormData>();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        if (user?.role === UserRole.SELLER) {
          const response = await productApi.getMyProducts();
          setProducts(response.data);
        } else {
          const response = await productApi.getProducts();
          setProducts(response.data.content);
        }
      } catch (err) {
        setError("상품 목록을 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    const fetchAuctionData = async () => {
      if (!auctionId) return;
      setLoading(true);
      try {
        const response = await auctionApi.getAuctionDetail(auctionId);
        const auction = response.data;

        if (user?.role === UserRole.USER) {
          alert("경매를 수정할 권한이 없습니다.");
          navigate("/");
          return;
        }

        if (auction.status !== AuctionStatus.READY) {
          alert("대기 중인 경매만 수정할 수 있습니다.");
          navigate(`/auctions/${auctionId}`);
          return;
        }

        setSelectedProduct({
          id: auction.productId,
          name: auction.productName,
          sellerId: auction.sellerId,
          description: auction.description,
          status: "READY",
          deletedYn: "N",
        });

        reset({
          startBid: auction.startBid,
          auctionStartAt: auction.auctionStartAt.slice(0, 16),
          auctionEndAt: auction.auctionEndAt.slice(0, 16),
        });
      } catch (err) {
        setError("경매 정보를 불러오는 데 실패했습니다.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const fetchProductForReregister = async () => {
      if (!productId) return;
      setLoading(true);
      try {
        const productResponse = await productApi.getProductById(productId);
        const product = productResponse.data;

        if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.SELLER) {
          alert("경매를 재등록할 권한이 없습니다.");
          navigate("/");
          return;
        }

        if (
          product.sellerId &&
          user?.userId !== product.sellerId &&
          user.role !== UserRole.ADMIN
        ) {
          alert("본인이 등록한 상품만 경매를 재등록할 수 있습니다.");
          navigate("/");
          return;
        }

        const auctionsResponse = await auctionApi.getAuctionsByProductId(
          productId
        );
        const auctions = Array.isArray(auctionsResponse.data.content)
          ? auctionsResponse.data.content
          : auctionsResponse.data;

        const hasActive = auctions.some(
          (auction: Auction) =>
            auction.status === AuctionStatus.IN_PROGRESS ||
            auction.status === AuctionStatus.READY
        );

        if (hasActive) {
          alert("진행 중 또는 대기 중인 경매가 있어 재등록할 수 없습니다.");
          navigate(`/products/${productId}`);
          return;
        }

        setSelectedProduct(product);
      } catch (err) {
        console.error(err);
        setError("상품 정보를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    const initTimes = () => {
      const nextHour = setMilliseconds(
        setSeconds(setMinutes(addHours(new Date(), 1), 0), 0),
        0
      );

      reset({
        auctionStartAt: format(nextHour, "yyyy-MM-dd HH:mm", { locale: ko }),
        auctionEndAt: format(
          nextHour.setDate(nextHour.getDate() + 1),
          "yyyy-MM-dd HH:mm",
          { locale: ko }
        ),
      });
    };

    if (isEditMode) {
      fetchAuctionData();
    } else if (isReregisterMode && productId) {
      initTimes();
      fetchProductForReregister();
    } else {
      initTimes();
      fetchProducts();
    }
  }, [
    auctionId,
    productId,
    isEditMode,
    isReregisterMode,
    navigate,
    reset,
    user,
  ]);

  const handleProductSelect = async (product: Product) => {
    setLoading(true);
    try {
      const response = await auctionApi.getAuctionsByProductId(product.id);
      const existingAuctions = response.data;

      const conflictingStatuses: AuctionStatus[] = [
        AuctionStatus.READY,
        AuctionStatus.IN_PROGRESS,
        AuctionStatus.COMPLETED,
      ];

      const hasConflict = existingAuctions.some((auction: Auction) =>
        conflictingStatuses.includes(auction.status)
      );

      if (hasConflict) {
        setDialogMessage(
          "이 상품은 이미 대기, 진행 또는 완료 상태의 경매가 존재하여 추가로 등록할 수 없습니다."
        );
        setDialogOpen(true);
      } else {
        setSelectedProduct(product);
      }
    } catch (err) {
      setSelectedProduct(product);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AuctionFormData) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const auctionStart = format(data.auctionStartAt, "yyyy-MM-dd HH:mm:00", {
      locale: ko,
    });

    const auctionEnd = format(data.auctionEndAt, "yyyy-MM-dd HH:mm:00", {
      locale: ko,
    });
    try {
      if (isEditMode && auctionId) {
        const auctionData: AuctionUpdateRequest = {
          startBid: Number(data.startBid),
          auctionStartAt: auctionStart,
          auctionEndAt: auctionEnd,
        };
        const response = await auctionApi.updateAuction(auctionId, auctionData);
        alert("경매가 성공적으로 수정되었습니다.");
        navigate(`/auctions/${response.data.auctionId}`);
      } else if (!isEditMode && selectedProduct) {
        const auctionData = {
          productId: selectedProduct.id,
          startBid: Number(data.startBid),
          auctionStartAt: auctionStart,
          auctionEndAt: auctionEnd,
        };
        const response = await auctionApi.createAuction(auctionData);
        alert("경매가 성공적으로 등록되었습니다.");
        navigate(`/auctions/${response.data.auctionId}`);
      }
    } catch (err: any) {
      console.error("경매 처리 실패:", err);
      setError(err.response?.data?.message || "요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  if (user?.role === UserRole.USER && !isEditMode) {
    return (
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ my: 4 }}>
          경매 등록
        </Typography>
        <Alert severity="error">
          경매를 등록할 권한이 없습니다. 판매자 또는 관리자만 경매를 등록할 수
          있습니다.
        </Alert>
      </Container>
    );
  }

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
          {error && <Alert severity="warning">{error}</Alert>}
          <Paper>
            <List>
              {products.length > 0 ? (
                products.map((product) => (
                  <React.Fragment key={product.id}>
                    <ListItem
                      secondaryAction={
                        <Button
                          variant="contained"
                          onClick={() => handleProductSelect(product)}
                          disabled={loading}
                        >
                          {loading ? (
                            <CircularProgress size={24} color="inherit" />
                          ) : (
                            "선택"
                          )}
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
            {isEditMode ? "경매 정보 수정" : "경매 정보 등록"}
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
                label="시작 입찰가 (100원 단위)"
                type="number"
                {...register("startBid", {
                  required: "시작 입찰가는 필수입니다.",
                  validate: (v) => {
                    if (v <= 0) return "시작 입찰가는 0보다 커야 합니다";
                    if (v % 100 !== 0) return "100원 단위로 입력해주세요";
                    return true;
                  },
                  valueAsNumber: true,
                  setValueAs: (v) => Math.round(Number(v) / 100) * 100,
                })}
                error={!!errors.startBid}
                helperText={errors.startBid?.message}
                slotProps={{
                  input: {
                    inputProps: {
                      min: 0,
                      step: 100,
                    },
                  },
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="auctionStartAt"
                label="경매 시작 시간"
                type="datetime-local"
                {...register("auctionStartAt", {
                  required: "경매 시작 시간은 필수입니다.",
                  validate: (v) => {
                    const date = new Date(v);
                    if (isNaN(date.getTime()))
                      return "올바른 날짜를 입력해주세요";
                    if (date < new Date() && !isEditMode)
                      return "현재 이후 시간만 선택 가능합니다";
                    if (date.getMinutes() !== 0)
                      return "정각 단위로 입력해주세요";
                    return true;
                  },
                })}
                error={!!errors.auctionStartAt}
                helperText={
                  errors.auctionStartAt?.message || "예: 연-월-일 12:00"
                }
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="auctionEndAt"
                label="경매 종료 시간"
                type="datetime-local"
                {...register("auctionEndAt", {
                  required: "경매 종료 시간은 필수입니다.",
                  validate: (v) => {
                    const start = new Date(watch("auctionStartAt"));
                    const end = new Date(v);
                    if (isNaN(end.getTime()))
                      return "올바른 날짜를 입력해주세요";
                    if (end <= start)
                      return "종료 시간은 시작 시간 이후여야 합니다";
                    if (end.getMinutes() !== 0)
                      return "정각 단위로 입력해주세요";
                    return true;
                  },
                })}
                error={!!errors.auctionEndAt}
                helperText={
                  errors.auctionEndAt?.message || "예: 연-월-일 12:00"
                }
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
                {!isEditMode && (
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setSelectedProduct(null)}
                    disabled={loading}
                  >
                    상품 다시 선택
                  </Button>
                )}
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{ py: 1.5 }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : isEditMode ? (
                    "경매 수정하기"
                  ) : (
                    "경매 등록하기"
                  )}
                </Button>
              </Box>
            </Box>
          </Paper>
        </>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>알림</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} autoFocus>
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AuctionRegistration;
