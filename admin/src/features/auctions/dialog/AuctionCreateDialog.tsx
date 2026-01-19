import { adminAuctionApi } from "@/apis/adminAuctionApi";
import { adminProductApi } from "@/apis/adminProductApi";
import type {
  AuctionCreationRequest,
  AuctionFormData,
  Product,
} from "@moreauction/types";
import { formatDate, toISOString } from "@moreauction/utils";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addHours, format, setMinutes, setSeconds } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";

const AuctionCreateDialog = ({
  createAuctionOpen,
  setCreateAuctionOpen,
}: any) => {
  const queryClient = useQueryClient();
  const now = new Date();

  // 가장 가까운 정각 시간 계산 (분이 0보다 크면 다음 정각)
  const nextHour = now.getMinutes() > 0 ? addHours(now, 1) : now;
  const startTime = setMinutes(setSeconds(nextHour, 0), 0);
  const endTime = addDays(startTime, 3);

  const {
    register,
    handleSubmit,
    watch,

    formState: { errors },
    reset,
  } = useForm<AuctionFormData>({
    defaultValues: {
      startBid: 10000,
      auctionStartAt: format(startTime, "yyyy-MM-dd'T'HH:mm"),
      auctionEndAt: format(endTime, "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const [createAuctionStep, setCreateAuctionStep] = useState<
    "select-product" | "enter-details"
  >("select-product");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const productsWithoutAuctionQuery = useQuery({
    queryKey: ["admin", "products", "without-auction"],
    queryFn: () => adminProductApi.getProducts({}),
    enabled: createAuctionOpen && createAuctionStep === "select-product",
    staleTime: 20_000,
  });
  const createAuctionMutation = useMutation({
    mutationFn: (data: AuctionCreationRequest) =>
      adminAuctionApi.createAuction(data),
    onSuccess: () => {
      setCreateAuctionOpen(false);
      setCreateAuctionStep("select-product");
      setSelectedProduct(null);
      reset();
      queryClient.invalidateQueries({ queryKey: ["admin", "auctions"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "products", "without-auction"],
      });
    },
  });
  return (
    <Dialog
      open={createAuctionOpen}
      onClose={() => {
        setCreateAuctionOpen(false);
        setCreateAuctionStep("select-product");
        setSelectedProduct(null);
        reset();
      }}
      maxWidth={createAuctionStep === "select-product" ? "md" : "sm"}
      fullWidth
    >
      <DialogTitle>
        {createAuctionStep === "select-product" ? "상품 선택" : "경매 등록"}
      </DialogTitle>
      <DialogContent>
        {createAuctionStep === "select-product" ? (
          // 상품 선택 단계
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              경매를 등록할 상품을 선택하세요.
            </Typography>
            {productsWithoutAuctionQuery.isLoading ? (
              <Typography>상품을 불러오는 중...</Typography>
            ) : productsWithoutAuctionQuery.isError ? (
              <Typography color="error">
                상품을 불러오는데 실패했습니다.
              </Typography>
            ) : productsWithoutAuctionQuery.data?.content?.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>상품명</TableCell>
                    <TableCell>판매자</TableCell>
                    <TableCell>선택</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productsWithoutAuctionQuery.data.content.map(
                    (product: Product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.id}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.sellerId || "-"}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setSelectedProduct(product);
                              setCreateAuctionStep("enter-details");
                            }}
                          >
                            선택
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            ) : (
              <Typography>경매를 등록할 수 있는 상품이 없습니다.</Typography>
            )}
          </>
        ) : (
          // 경매 입력 단계
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              선택된 상품: {selectedProduct?.name}
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="시작 가격"
                type="number"
                {...register("startBid", {
                  required: "시작 가격은 필수입니다.",
                  min: {
                    value: 10000,
                    message: "최소 10,000원 이상 입력해주세요.",
                  },
                })}
                error={!!errors.startBid}
                helperText={errors.startBid?.message}
                fullWidth
                required
              />
              <TextField
                label="시작 시간"
                type="datetime-local"
                {...register("auctionStartAt", {
                  required: "시작 시간은 필수입니다.",
                  validate: (value) => {
                    const selectedTime = new Date(value);
                    const now = new Date();
                    if (selectedTime <= now) {
                      return "시작 시간은 현재 시간 이후여야 합니다.";
                    }
                    return true;
                  },
                })}
                error={!!errors.auctionStartAt}
                helperText={errors.auctionStartAt?.message}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="종료 시간"
                type="datetime-local"
                {...register("auctionEndAt", {
                  required: "종료 시간은 필수입니다.",
                  validate: (value) => {
                    const startTime = watch("auctionStartAt");
                    if (startTime && new Date(value) <= new Date(startTime)) {
                      return "종료 시간은 시작 시간 이후여야 합니다.";
                    }
                    return true;
                  },
                })}
                error={!!errors.auctionEndAt}
                helperText={errors.auctionEndAt?.message}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            if (createAuctionStep === "enter-details") {
              setCreateAuctionStep("select-product");
              setSelectedProduct(null);
            } else {
              setCreateAuctionOpen(false);
              setCreateAuctionStep("select-product");
              setSelectedProduct(null);
              reset();
            }
          }}
        >
          {createAuctionStep === "select-product" ? "취소" : "뒤로"}
        </Button>
        {createAuctionStep === "enter-details" && (
          <Button
            variant="contained"
            disabled={createAuctionMutation.isPending}
            onClick={handleSubmit((data) => {
              if (!selectedProduct) return;
              createAuctionMutation.mutate({
                productId: selectedProduct.id,
                startBid: data.startBid,
                auctionStartAt: toISOString(data.auctionStartAt),
                auctionEndAt: toISOString(data.auctionEndAt),
                productName: selectedProduct.name,
                sellerId: selectedProduct.sellerId || "",
              });
            })}
          >
            등록
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AuctionCreateDialog;
