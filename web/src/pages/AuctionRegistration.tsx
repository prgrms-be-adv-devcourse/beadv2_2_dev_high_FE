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
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auctionApi } from "../apis/auctionApi";
import { productApi } from "../apis/productApi";
import { useAuth } from "../contexts/AuthContext";
import type { Auction, AuctionUpdateRequest } from "@moreauction/types";
import { AuctionStatus } from "@moreauction/types";
import type { Product, ProductAndAuction } from "@moreauction/types";

import {
  addHours,
  format,
  setMilliseconds,
  setMinutes,
  setSeconds,
} from "date-fns";
import { ko } from "date-fns/locale";
import { UserRole } from "@moreauction/types";
import { MoneyInput } from "../components/inputs/MoneyInput";

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
    control,
    formState: { errors },
    reset,
  } = useForm<AuctionFormData>();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const productsQuery = useQuery({
    queryKey: ["products", "auctionRegistration", user?.role, user?.userId],
    queryFn: async () => {
      if (user?.role === UserRole.SELLER) {
        const response = await productApi.getMyProducts();
        return response.data as ProductAndAuction[];
      }
      const response = await productApi.getProducts();
      return response.data.content as ProductAndAuction[];
    },
    enabled: !isEditMode && !isReregisterMode,
    staleTime: 30_000,
  });

  const auctionDetailQuery = useQuery({
    queryKey: ["auctions", "detail", auctionId],
    queryFn: () => auctionApi.getAuctionDetail(auctionId as string),
    enabled: isEditMode && !!auctionId,
    staleTime: 30_000,
  });

  const productForReregisterQuery = useQuery({
    queryKey: ["products", "detail", productId],
    queryFn: () => productApi.getProductById(productId as string),
    enabled: isReregisterMode && !!productId,
    staleTime: 30_000,
  });

  const initTimes = useMemo(
    () => () => {
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
    },
    [reset]
  );

  useEffect(() => {
    if (!isEditMode) {
      initTimes();
    }
  }, [initTimes, isEditMode, isReregisterMode]);

  useEffect(() => {
    const auction = auctionDetailQuery.data?.data;
    if (!auction) return;

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
  }, [auctionDetailQuery.data, auctionId, navigate, reset, user?.role]);

  useEffect(() => {
    const productResponse = productForReregisterQuery.data?.data;
    if (!productResponse) return;
    const { product, auctions = [] } = productResponse;

    if (!product) {
      setSubmitError("상품 정보를 찾을 수 없습니다.");
      navigate("/");
      return;
    }

    if (user?.role !== UserRole.SELLER) {
      alert("경매를 재등록할 권한이 없습니다.");
      navigate("/");
      return;
    }

    if (product.sellerId && user?.userId !== product.sellerId) {
      alert("본인이 등록한 상품만 경매를 재등록할 수 있습니다.");
      navigate("/");
      return;
    }

    const hasActive = (Array.isArray(auctions) ? auctions : []).some(
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
  }, [navigate, productForReregisterQuery.data, productId, user?.role, user?.userId]);

  const products = productsQuery.data ?? [];
  const isInitialLoading =
    productsQuery.isLoading ||
    auctionDetailQuery.isLoading ||
    productForReregisterQuery.isLoading;
  const queryError = useMemo(() => {
    const err: any =
      auctionDetailQuery.error ??
      productForReregisterQuery.error ??
      productsQuery.error;
    if (!err) return null;
    return err?.data?.message ?? err?.message ?? "데이터를 불러오는데 실패했습니다.";
  }, [
    auctionDetailQuery.error,
    productForReregisterQuery.error,
    productsQuery.error,
  ]);

  const handleProductSelect = async (data: ProductAndAuction) => {
    setActionLoading(true);
    const { product, auctions } = data;
    try {
      const conflictingStatuses: AuctionStatus[] = [
        AuctionStatus.READY,
        AuctionStatus.IN_PROGRESS,
        AuctionStatus.COMPLETED,
      ];

      const hasConflict = auctions?.some((auction: Auction) =>
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
      setActionLoading(false);
    }
  };

  const onSubmit = async (data: AuctionFormData) => {
    if (actionLoading) return;
    setActionLoading(true);
    setSubmitError(null);

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
          sellerId: user?.userId,
        };
        const response = await auctionApi.createAuction(auctionData);
        alert("경매가 성공적으로 등록되었습니다.");
        navigate(`/auctions/${response.data.auctionId}`);
      }
    } catch (err: any) {
      console.error("경매 처리 실패:", err);
      setSubmitError(err.response?.data?.message || "요청에 실패했습니다.");
    } finally {
      setActionLoading(false);
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
          경매를 등록할 권한이 없습니다. 판매자만 경매를 등록할 수 있습니다.
        </Alert>
      </Container>
    );
  }

  if (isInitialLoading && !selectedProduct) {
    return (
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ my: 4 }}>
          {isEditMode ? "경매 정보 수정" : "경매에 등록할 상품 선택"}
        </Typography>
        <Paper>
          <List>
            {Array.from({ length: 4 }).map((_, idx) => (
              <React.Fragment key={idx}>
                <ListItem
                  secondaryAction={
                    <Button variant="contained" disabled>
                      <Skeleton variant="rounded" width={60} height={32} />
                    </Button>
                  }
                >
                  <ListItemText
                    primary={<Skeleton width="60%" />}
                    secondary={<Skeleton width="80%" />}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </Paper>
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
          {(queryError || submitError) && (
            <Alert severity="warning">{queryError ?? submitError}</Alert>
          )}
          <Paper>
            <List>
              {products.length > 0 ? (
                products.map((data) => {
                  const { product } = data;
                  return (
                    <React.Fragment key={product.id}>
                      <ListItem
                        secondaryAction={
                        <Button
                          variant="contained"
                          onClick={() => handleProductSelect(data)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? (
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
                  );
                })
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
              <Box
                component="fieldset"
                disabled={actionLoading}
                sx={{ border: 0, p: 0, m: 0, minInlineSize: 0 }}
              >
              <Controller
                name="startBid"
                control={control}
                rules={{
                  required: "시작 입찰가는 필수입니다.",
                  validate: (v) => {
                    if (v <= 0) return "시작 입찰가는 0보다 커야 합니다";
                    if (v % 100 !== 0) return "100원 단위로 입력해주세요";
                    return true;
                  },
                }}
                render={({ field }) => (
                  <MoneyInput
                    margin="normal"
                    required
                    fullWidth
                    id="startBid"
                    label="시작 입찰가 (100원 단위)"
                    value={field.value != null ? String(field.value) : ""}
                    onChangeValue={(digits) => {
                      const num = digits ? Number(digits) : 0;
                      field.onChange(Number.isFinite(num) ? num : 0);
                    }}
                    onBlur={() => {
                      field.onBlur();
                      const next = Math.round(Number(field.value ?? 0) / 100) * 100;
                      field.onChange(Number.isFinite(next) ? next : 0);
                    }}
                    error={!!errors.startBid}
                    helperText={errors.startBid?.message}
                    InputProps={{ endAdornment: "원" }}
                    slotProps={{
                      input: {
                        inputProps: {
                          "aria-label": "시작 입찰가",
                        },
                      },
                      inputLabel: { shrink: true },
                    }}
                  />
                )}
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

              {submitError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {submitError}
                </Alert>
              )}

              <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
                {!isEditMode && (
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setSelectedProduct(null)}
                    disabled={actionLoading}
                  >
                    상품 다시 선택
                  </Button>
                )}
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={actionLoading}
                  sx={{ py: 1.5 }}
                >
                  {actionLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : isEditMode ? (
                    "경매 수정하기"
                  ) : (
                    "경매 등록하기"
                  )}
                </Button>
              </Box>
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
