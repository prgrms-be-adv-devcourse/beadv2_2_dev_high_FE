import type {
  AuctionDetailResponse,
  AuctionUpdateRequest,
  Product,
} from "@moreauction/types";
import { AuctionStatus } from "@moreauction/types";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { auctionApi } from "@/apis/auctionApi";
import { productApi } from "@/apis/productApi";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/queries/queryKeys";

import { hasRole, UserRole } from "@moreauction/types";
import {
  addHours,
  format,
  setMilliseconds,
  setMinutes,
  setSeconds,
} from "date-fns";
import { ko } from "date-fns/locale";
import { MoneyInput } from "@/shared/components/inputs/MoneyInput";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
    reset,
  } = useForm<AuctionFormData>();

  const [actionLoading, setActionLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCheckingAuction, setIsCheckingAuction] = useState(false);
  const [registrationBlockedMessage, setRegistrationBlockedMessage] =
    useState<string | null>(null);

  const auctionDetailQuery = useQuery({
    queryKey: queryKeys.auctions.detail(auctionId),
    queryFn: async () => {
      const response = await auctionApi.getAuctionDetail(auctionId as string);
      return response.data;
    },
    enabled: isEditMode && !!auctionId,
    staleTime: 30_000,
  });

  const productForRegisterQuery = useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: async () => {
      const response = await productApi.getProductById(productId as string);
      return response.data;
    },
    enabled: !isEditMode && !!productId,
    staleTime: 30_000,
  });

  const auctionProductId = auctionDetailQuery.data?.productId;
  const productForEditQuery = useQuery({
    queryKey: queryKeys.products.detail(auctionProductId),
    queryFn: async () => {
      const response = await productApi.getProductById(
        auctionProductId as string
      );
      return response.data;
    },
    enabled: isEditMode && !!auctionProductId,
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
  }, [initTimes, isEditMode]);

  useEffect(() => {
    const auction = auctionDetailQuery.data;
    if (!auction) return;

    if (!hasRole(user?.roles, UserRole.SELLER)) {
      alert("경매를 수정할 권한이 없습니다.");
      navigate("/");
      return;
    }

    if (auction.status !== AuctionStatus.READY) {
      alert("대기 중인 경매만 수정할 수 있습니다.");
      navigate(`/auctions/${auctionId}`);
      return;
    }

    const toLocalInput = (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value.slice(0, 16);
      }
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    reset({
      startBid: auction.startBid,
      auctionStartAt: toLocalInput(auction.auctionStartAt),
      auctionEndAt: toLocalInput(auction.auctionEndAt),
    });
  }, [auctionDetailQuery.data, auctionId, navigate, reset, user?.roles]);

  useEffect(() => {
    const productResponse = productForRegisterQuery.data;
    if (!productResponse) return;
    const product = productResponse as Product;

    if (!product) {
      setSubmitError("상품 정보를 찾을 수 없습니다.");
      navigate("/");
      return;
    }

    if (!hasRole(user?.roles, UserRole.SELLER)) {
      alert("경매를 등록할 권한이 없습니다.");
      navigate("/");
      return;
    }

    if (product.sellerId && user?.userId !== product.sellerId) {
      alert("본인이 등록한 상품만 경매를 등록할 수 있습니다.");
      navigate("/");
      return;
    }

    const checkExistingAuctions = async () => {
      setIsCheckingAuction(true);
      try {
        const auctionsResponse = await auctionApi.getAuctionsByProductId(
          product.id
        );
        const auctions = auctionsResponse.data ? auctionsResponse.data : [];
        const hasActive = auctions.some(
          (auction: AuctionDetailResponse) =>
            !auction.deletedYn &&
            (auction.status === AuctionStatus.IN_PROGRESS ||
              auction.status === AuctionStatus.READY)
        );

        if (hasActive) {
          setRegistrationBlockedMessage(
            "진행 중 또는 대기 중인 경매가 있어 등록할 수 없습니다."
          );
          return;
        }
        setRegistrationBlockedMessage(null);
      } catch (err) {
        console.error("경매 상태 확인 실패:", err);
      } finally {
        setIsCheckingAuction(false);
      }
    };

    checkExistingAuctions();
  }, [
    navigate,
    productForRegisterQuery.data,
    productId,
    user?.roles,
    user?.userId,
  ]);

  const isInitialLoading =
    auctionDetailQuery.isLoading ||
    productForRegisterQuery.isLoading ||
    productForEditQuery.isLoading;
  const queryError = useMemo(() => {
    const err: any =
      auctionDetailQuery.error ??
      productForRegisterQuery.error ??
      productForEditQuery.error;
    if (!err) return null;
    return (
      err?.data?.message ?? err?.message ?? "데이터를 불러오는데 실패했습니다."
    );
  }, [
    auctionDetailQuery.error,
    productForRegisterQuery.error,
    productForEditQuery.error,
  ]);

  const selectedProduct = isEditMode
    ? ((productForEditQuery.data ?? null) as Product | null)
    : ((productForRegisterQuery.data ?? null) as Product | null);
  const aiStartBidSuggestion = null as null | {
    min: number;
    max: number;
    median: number;
  };

  const onSubmit = async (data: AuctionFormData) => {
    if (actionLoading || isCheckingAuction) return;
    if (!isEditMode && registrationBlockedMessage) {
      setSubmitError(registrationBlockedMessage);
      return;
    }
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
        const targetAuctionId =
          response.data.auctionId ?? response.data.id ?? auctionId;
        const targetProductId =
          selectedProduct?.id ?? response.data.productId ?? "";
        if (response.data) {
          queryClient.setQueryData(
            queryKeys.auctions.detail(targetAuctionId),
            response.data
          );
        }
        if (targetProductId) {
          queryClient.setQueryData(
            queryKeys.auctions.byProduct(targetProductId),
            (
              prev?:
                | { data?: AuctionDetailResponse[] }
                | AuctionDetailResponse[]
            ) => {
              const list = Array.isArray(prev) ? prev : prev?.data ?? [];
              const next = list.map((item) =>
                item.id === targetAuctionId || item.auctionId === targetAuctionId
                  ? { ...item, ...response.data }
                  : item
              );
              return Array.isArray(prev) ? next : { ...prev, data: next };
            }
          );
        }
        await queryClient.invalidateQueries({
          queryKey: queryKeys.auctions.lists(),
          refetchType: "none",
        });
        if (targetProductId) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.products.detail(targetProductId),
            refetchType: "none",
          });
        }
        alert("경매가 성공적으로 수정되었습니다.");
        if (targetProductId) {
          navigate(`/products/${targetProductId}`);
        } else {
          navigate(`/auctions/${targetAuctionId}`);
        }
      } else if (!isEditMode && selectedProduct) {
        const auctionData = {
          productId: selectedProduct.id,
          startBid: Number(data.startBid),
          auctionStartAt: auctionStart,
          auctionEndAt: auctionEnd,
          sellerId: user?.userId,
        };
        const response = await auctionApi.createAuction(auctionData);
        const createdAuctionId =
          response.data.auctionId ?? response.data.id ?? "";
        if (createdAuctionId) {
          await productApi.updateLatestAuctionId(
            selectedProduct.id,
            createdAuctionId
          );
        }
        if (createdAuctionId) {
          queryClient.setQueryData(
            queryKeys.auctions.detail(createdAuctionId),
            response.data
          );
          queryClient.setQueryData(
            queryKeys.auctions.byProduct(selectedProduct.id),
            (
              prev?:
                | { data?: AuctionDetailResponse[] }
                | AuctionDetailResponse[]
            ) => {
              const list = Array.isArray(prev) ? prev : prev?.data ?? [];
              const next = [response.data, ...list].filter(Boolean);
              return Array.isArray(prev) ? next : { ...prev, data: next };
            }
          );
          queryClient.setQueryData(
            queryKeys.products.detail(selectedProduct.id),
            (prev?: { latestAuctionId?: string | null }) => {
              if (!prev) return prev;
              return { ...prev, latestAuctionId: createdAuctionId };
            }
          );
        }
        await queryClient.invalidateQueries({
          queryKey: queryKeys.auctions.lists(),
          refetchType: "none",
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.products.detail(selectedProduct.id),
          refetchType: "none",
        });
        const targetAuctionId =
          createdAuctionId || response.data.auctionId || response.data.id;
        alert("경매가 성공적으로 등록되었습니다.");
        navigate(`/products/${selectedProduct.id}`);
      }
    } catch (err: any) {
      console.error("경매 처리 실패:", err);
      setSubmitError(err.response?.data?.message || "요청에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  if (!hasRole(user?.roles, UserRole.SELLER) && !isEditMode) {
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

  if (!isEditMode && !productId) {
    return (
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ my: 4 }}>
          경매 등록
        </Typography>
        <Alert severity="error">상품 ID가 필요합니다.</Alert>
      </Container>
    );
  }

  if (isInitialLoading && !selectedProduct) {
    return (
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ my: 4 }}>
          {isEditMode ? "경매 정보 수정" : "경매 정보 등록"}
        </Typography>
        <Paper>
          <Box sx={{ p: 3 }}>
            <Skeleton height={32} width="40%" />
            <Skeleton height={24} width="60%" />
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      {selectedProduct ? (
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
                        const next =
                          Math.round(Number(field.value ?? 0) / 100) * 100;
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
                <Paper
                  variant="outlined"
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: (theme) =>
                      theme.palette.mode === "light"
                        ? "rgba(59, 130, 246, 0.06)"
                        : "rgba(59, 130, 246, 0.12)",
                    borderColor: (theme) =>
                      theme.palette.mode === "light"
                        ? "rgba(59, 130, 246, 0.3)"
                        : "rgba(148, 163, 184, 0.25)",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        AI 시작가 추천
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        유사 경매 데이터로 적정 시작가를 안내할 예정입니다.
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!aiStartBidSuggestion}
                      onClick={() => {
                        if (!aiStartBidSuggestion) return;
                        setValue("startBid", aiStartBidSuggestion.median, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                    >
                      추천가 적용
                    </Button>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    {aiStartBidSuggestion ? (
                      <Typography variant="body2">
                        추천 범위: {aiStartBidSuggestion.min}원 ~{" "}
                        {aiStartBidSuggestion.max}원 (중앙값{" "}
                        {aiStartBidSuggestion.median}원)
                      </Typography>
                    ) : (
                      <>
                        <Skeleton width="65%" height={22} />
                        <Skeleton width="45%" height={20} />
                      </>
                    )}
                  </Box>
                </Paper>
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
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={actionLoading || isCheckingAuction}
                    sx={{ py: 1.5 }}
                  >
                    {actionLoading || isCheckingAuction ? (
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
      ) : (
        <>
          <Typography variant="h4" sx={{ my: 4 }}>
            {isEditMode ? "경매 정보 수정" : "경매 정보 등록"}
          </Typography>
          {(queryError || submitError) && (
            <Alert severity="warning">{queryError ?? submitError}</Alert>
          )}
        </>
      )}
    </Container>
  );
};

export default AuctionRegistration;
