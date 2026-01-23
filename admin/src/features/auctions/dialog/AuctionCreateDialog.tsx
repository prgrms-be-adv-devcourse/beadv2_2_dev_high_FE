import { adminAuctionApi } from "@/apis/adminAuctionApi";
import { adminProductApi } from "@/apis/adminProductApi";
import type {
  AuctionCreationRequest,
  AuctionFormData,
  Product,
} from "@moreauction/types";
import { AuctionStatus } from "@moreauction/types";
import { toISOString } from "@moreauction/utils";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Pagination,
} from "@mui/material";
import DialogTable from "@/shared/components/DialogTable";
import {
  dialogContentSx,
  dialogPaperSx,
  dialogTitleSx,
} from "@/shared/components/dialogStyles";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { addDays, addHours, format, setMinutes, setSeconds } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";

const AuctionCreateDialog = ({
  createAuctionOpen,
  setCreateAuctionOpen,
}: any) => {
  const PRODUCT_PAGE_SIZE = 10;
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
  const [productPage, setProductPage] = useState(1);

  const productsWithoutAuctionQuery = useQuery({
    queryKey: ["admin", "products", "without-auction", productPage],
    queryFn: () =>
      adminProductApi.getProducts({
        page: productPage - 1,
        size: PRODUCT_PAGE_SIZE,
        sort: "createdAt,desc",
      }),
    enabled: createAuctionOpen && createAuctionStep === "select-product",
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
  const productSelectMutation = useMutation({
    mutationFn: (product: Product) =>
      adminAuctionApi.getAuctionsByProductId(product.id),
    onSuccess: (response, product) => {
      const auctions = response.data ? response.data : [];
      const activeAuctions = auctions.filter((auction) => {
        const isDeleted =
          auction.deletedYn === true || auction.deletedYn === "Y";
        return !isDeleted;
      });
      const hasBlockedAuction = activeAuctions.some(
        (auction) =>
          auction.status === AuctionStatus.READY ||
          auction.status === AuctionStatus.IN_PROGRESS ||
          auction.status === AuctionStatus.COMPLETED
      );
      if (hasBlockedAuction) {
        alert(
          "이미 진행 중이거나 종료된 경매가 존재합니다. 새 경매를 등록할 수 없습니다."
        );
        return;
      }
      setSelectedProduct(product);
      setCreateAuctionStep("enter-details");
    },
    onError: () => {
      alert("상품 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.");
    },
  });
  const createAuctionMutation = useMutation({
    mutationFn: (data: AuctionCreationRequest) =>
      adminAuctionApi.createAuction(data),
    onSuccess: () => {
      setCreateAuctionOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "auctions"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "products", "without-auction"],
      });
    },
  });
  const handleSelectProduct = (product: Product) => {
    productSelectMutation.mutate(product);
  };
  const productsContent = productsWithoutAuctionQuery.data?.content ?? [];
  const totalElements = productsWithoutAuctionQuery.data?.totalElements ?? 0;
  const totalPagesFromElements =
    totalElements > 0 ? Math.ceil(totalElements / PRODUCT_PAGE_SIZE) : 0;
  const isClientPaged = productsContent.length > PRODUCT_PAGE_SIZE;
  const pagedProducts = isClientPaged
    ? productsContent.slice(
        (productPage - 1) * PRODUCT_PAGE_SIZE,
        productPage * PRODUCT_PAGE_SIZE
      )
    : productsContent;
  const productTotalPages = isClientPaged
    ? Math.ceil(productsContent.length / PRODUCT_PAGE_SIZE)
    : totalPagesFromElements ||
      productsWithoutAuctionQuery.data?.totalPages ||
      1;
  return (
    <Dialog
      open={createAuctionOpen}
      onClose={() => setCreateAuctionOpen(false)}
      maxWidth={createAuctionStep === "select-product" ? "md" : "sm"}
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
      TransitionProps={{
        onExited: () => {
          setCreateAuctionStep("select-product");
          setSelectedProduct(null);
          setProductPage(1);
          reset();
        },
      }}
    >
      <DialogTitle sx={dialogTitleSx}>
        {createAuctionStep === "select-product" ? "상품 선택" : "경매 등록"}
      </DialogTitle>
      <DialogContent dividers sx={dialogContentSx}>
        {createAuctionStep === "select-product" ? (
          // 상품 선택 단계
          <>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                경매를 등록할 상품을 선택하세요.
              </Typography>
            {productsWithoutAuctionQuery.isLoading ? (
              <Typography>상품을 불러오는 중...</Typography>
            ) : productsWithoutAuctionQuery.isError ? (
              <Typography color="error">
                상품을 불러오는데 실패했습니다.
              </Typography>
            ) : productsWithoutAuctionQuery.data?.content?.length ? (
              <>
                <DialogTable>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">ID</TableCell>
                      <TableCell align="center">상품명</TableCell>
                      <TableCell align="center">판매자</TableCell>
                      <TableCell align="center">선택</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedProducts.map((product: Product) => (
                      <TableRow key={product.id}>
                        <TableCell align="center">{product.id}</TableCell>
                        <TableCell align="center">{product.name}</TableCell>
                        <TableCell align="center">
                          {product.sellerId || "-"}
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleSelectProduct(product)}
                            disabled={productSelectMutation.isPending}
                          >
                            선택
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DialogTable>
                <Pagination
                  count={Math.max(productTotalPages, 1)}
                  page={productPage}
                  onChange={(_, value) => setProductPage(value)}
                  disabled={productTotalPages === 0}
                  size="small"
                  sx={{ display: "flex", justifyContent: "center" }}
                />
              </>
            ) : (
              <Typography>경매를 등록할 수 있는 상품이 없습니다.</Typography>
            )}
            </Stack>
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
              <Typography variant="caption" color="text.secondary">
                보증금은 시작 가격의 5%로 자동 책정됩니다.
              </Typography>
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
              setProductPage(1);
            } else {
              setCreateAuctionOpen(false);
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
