import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { AddPhotoAlternate, Close, Star } from "@mui/icons-material";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addHours,
  format,
  setMilliseconds,
  setMinutes,
  setSeconds,
} from "date-fns";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { auctionApi } from "../apis/auctionApi";
import { categoryApi } from "../apis/categoryApi";
import { fileApi } from "../apis/fileApi";
import { productApi } from "../apis/productApi";
import { useAuth } from "../contexts/AuthContext";
import type { Auction, AuctionUpdateRequest } from "../types/auction";
import { AuctionStatus } from "../types/auction";
import type {
  Product,
  ProductCategory,
  ProductCreationRequest,
  ProductUpdateRequest,
} from "../types/product";
import { ProductStatus } from "../types/product";

import { ko } from "date-fns/locale";
import { UserRole } from "../types/user";
import { getProductImageUrls } from "../utils/images";
import { MoneyInput } from "../components/inputs/MoneyInput";

interface ProductAuctionFormData {
  name: string;
  description: string;
  categoryIds: string[];
  auctionStartAt: string;
  auctionEndAt: string;
  startBid: number;
  fileGroupId?: string;
  auctionId?: string;
}

interface LocalImage {
  id: string;
  file: File;
  preview: string;
}

const SortableImageItem: React.FC<{
  image: LocalImage;
  isRepresentative: boolean;
  onRemove: () => void;
}> = ({ image, isRepresentative, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 2,
        cursor: "grab",
        borderColor: isRepresentative ? "primary.main" : "divider",
        boxShadow: isRepresentative ? 2 : 0,
        opacity: isDragging ? 0.6 : 1,
        userSelect: "none",
        touchAction: "none",
        transform: CSS.Transform.toString(transform),
        transition,
        "&:hover .image-actions": { opacity: 1 },
      }}
      {...attributes}
      {...listeners}
    >
      <Box
        component="img"
        src={image.preview}
        alt="선택한 상품 이미지"
        sx={{
          width: "100%",
          height: 140,
          objectFit: "cover",
          display: "block",
          pointerEvents: "none",
        }}
      />
      {isRepresentative && (
        <Chip
          size="small"
          icon={<Star sx={{ fontSize: 16 }} />}
          label="대표"
          color="primary"
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            fontWeight: 700,
          }}
        />
      )}
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        sx={{
          position: "absolute",
          top: 6,
          right: 6,
          bgcolor: "rgba(0,0,0,0.45)",
          color: "common.white",
          "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
        }}
      >
        <Close fontSize="small" />
      </IconButton>
    </Paper>
  );
};

const ProductRegistration: React.FC = () => {
  const { productId, auctionId } = useParams<{
    productId?: string;
    auctionId?: string;
  }>();
  const isEditMode = !!(productId || auctionId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
    reset,
  } = useForm<ProductAuctionFormData>();

  const [allCategories, setAllCategories] = useState<ProductCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [useExistingImages, setUseExistingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [currentAuction, setCurrentAuction] = useState<Auction | null>(null);
  const [productDeleteLoading, setProductDeleteLoading] = useState(false);
  const [auctionDeleteLoading, setAuctionDeleteLoading] = useState(false);
  const [hasActiveAuction, setHasActiveAuction] = useState(false);
  const deletableAuctionStatuses: AuctionStatus[] = [
    AuctionStatus.READY,
    AuctionStatus.FAILED,
    AuctionStatus.CANCELLED,
  ];
  const deletableProductStatuses: ProductStatus[] = [
    ProductStatus.READY,
    ProductStatus.FAILED,
    ProductStatus.CANCELLED,
  ];

  const localImagesRef = useRef<LocalImage[]>([]);

  useEffect(() => {
    localImagesRef.current = localImages;
  }, [localImages]);

  useEffect(() => {
    return () => {
      localImagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.preview)
      );
    };
  }, []);

  const clearLocalImages = () => {
    setLocalImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.preview));
      return [];
    });
  };

  const handleRemoveLocalImage = (id: string) => {
    setLocalImages((prev) => {
      const target = prev.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((image) => image.id !== id);
    });
  };

  const buildLocalImage = (file: File): LocalImage => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
      .toString(36)
      .slice(2, 9)}`,
    file,
    preview: URL.createObjectURL(file),
  });

  const handleExistingImageModeChange = (next: boolean) => {
    setUseExistingImages(next);
    if (next) {
      clearLocalImages();
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await categoryApi.getCategories();
        setAllCategories(response.data);
      } catch (err) {
        console.error("카테고리 목록 로딩 실패:", err);
        setError("카테고리 목록을 불러오는 데 실패했습니다.");
      } finally {
        setCategoriesLoading(false);
      }
    };

    const fetchData = async () => {
      if (!productId && !auctionId) {
        // 신규 등록 - 기본 시간 설정
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
        setHasActiveAuction(false);
        setUseExistingImages(false);
        clearLocalImages();
        return;
      }

      setLoading(true);
      try {
        let productData: Product | null = null;
        let auctionData: Auction | null = null;

        // 상품 ID로 조회
        if (productId) {
          const productResponse = await productApi.getProductById(productId);
          productData = productResponse.data.product;
          const auctions = productResponse.data.auctions || [];
          // 상품의 경매 목록 조회

          // 수정 가능한 경매 찾기 (READY 상태)
          auctionData =
            auctions.find(
              (auction: Auction) => auction.status === AuctionStatus.READY
            ) || null;

          const blockingAuctionExists = auctions.some(
            (auction: Auction) => auction.status === AuctionStatus.READY
          );
          setHasActiveAuction(blockingAuctionExists);
        }

        // 권한 체크
        if (user?.userId !== productData?.sellerId) {
          if (user?.role !== "ADMIN") {
            alert("수정할 권한이 없습니다.");
            navigate(-1);

            return;
          }
        }

        // 경매 상태 체크 (수정 모드에서만)
        if (auctionData && auctionData.status !== AuctionStatus.READY) {
          alert("대기 중인 경매만 수정할 수 있습니다.");
          navigate(-1);
          return;
        }
        console.log(productData, auctionData);
        // 폼 데이터 설정
        reset({
          name: productData?.name,
          description: productData?.description,
          startBid: auctionData?.startBid,
          categoryIds: (productData?.categories ?? [])?.map((c) =>
            typeof c === "string" ? c : String(c.id)
          ),
          auctionStartAt:
            auctionData?.auctionStartAt.slice(0, 16) ||
            format(
              setMilliseconds(
                setSeconds(setMinutes(addHours(new Date(), 1), 0), 0),
                0
              ),
              "yyyy-MM-dd HH:mm",
              { locale: ko }
            ),
          auctionEndAt:
            auctionData?.auctionEndAt.slice(0, 16) ||
            format(
              setMilliseconds(
                setSeconds(setMinutes(addHours(new Date(), 25), 0), 0),
                0
              ),
              "yyyy-MM-dd HH:mm",
              { locale: ko }
            ),
        });

        // 카테고리 설정
        const selectedCategoryIds: string[] = (
          productData?.categories ?? []
        )?.map((c) => (typeof c === "string" ? c : String(c.id) ?? []));
        setSelectedCategoryIds(selectedCategoryIds);
        setCurrentProduct(productData);
        setCurrentAuction(auctionData);
        const hasExistingImages =
          (productData?.fileGroup?.files?.length ?? 0) > 0 ||
          (productData?.images?.length ?? 0) > 0 ||
          !!productData?.imageUrl;
        setUseExistingImages(hasExistingImages);
      } catch (err) {
        setError("데이터를 불러오는 데 실패했습니다.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    fetchData();
  }, [productId, auctionId, navigate, reset, user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    if (!files.length) return;
    setLocalImages((prev) => [
      ...prev,
      ...files.map((file) => buildLocalImage(file)),
    ]);
    setUseExistingImages(false);
    event.target.value = "";
  };

  const handleDropFiles = (files: File[]) => {
    if (!files.length) return;
    setLocalImages((prev) => [
      ...prev,
      ...files.map((file) => buildLocalImage(file)),
    ]);
    setUseExistingImages(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const imageIds = useMemo(
    () => localImages.map((img) => img.id),
    [localImages]
  );

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const categoryId = event.target.name;
    if (event.target.checked) {
      setSelectedCategoryIds((prev) => [...prev, categoryId]);
    } else {
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
    }
  };

  const onSubmit = async (data: ProductAuctionFormData) => {
    if (loading) return;

    setLoading(true);
    setError(null);
    const localFiles = localImages.map((image) => image.file);
    const fileGrpId = currentProduct?.fileGroup?.fileGroupId;
    const canReuseExistingImages =
      isEditMode &&
      useExistingImages &&
      (fileGrpId ?? null) &&
      localFiles.length === 0;
    let finalFileGroupId: number | string | undefined = canReuseExistingImages
      ? fileGrpId ?? undefined
      : undefined;

    try {
      if (!canReuseExistingImages && localFiles.length > 0) {
        const fileUploadResponse = await fileApi.uploadFiles(localFiles);
        finalFileGroupId = fileUploadResponse.data.fileGroupId;

        if (!finalFileGroupId) {
          throw new Error("파일 그룹 ID를 받아오지 못했습니다.");
        }
      }

      const auctionStart = format(data.auctionStartAt, "yyyy-MM-dd HH:mm:00", {
        locale: ko,
      });
      const auctionEnd = format(data.auctionEndAt, "yyyy-MM-dd HH:mm:00", {
        locale: ko,
      });

      if (isEditMode && productId) {
        // 수정 모드
        // 상품 ID로 수정 - 상품과 경매 모두 수정 또는 재등록
        const auctionsResponse = await auctionApi.getAuctionsByProductId(
          productId
        );
        const auctions = Array.isArray(auctionsResponse.data.content)
          ? auctionsResponse.data.content
          : auctionsResponse.data;

        const readyAuction = auctions.find(
          (auction: Auction) => auction.status === AuctionStatus.READY
        );

        const hasActiveAuctionInList = auctions.some(
          (auction: Auction) =>
            auction.status === AuctionStatus.IN_PROGRESS ||
            auction.status === AuctionStatus.READY
        );

        // 진행 중인데 대기 경매가 없는 경우 수정 불가
        if (!readyAuction && hasActiveAuctionInList) {
          alert("진행 중인 경매가 있어 상품/경매를 수정할 수 없습니다.");
          navigate(`/products/${productId}`);
          return;
        }

        const productData: ProductUpdateRequest & AuctionUpdateRequest = {
          name: data.name,
          description: data.description,
          fileGrpId: finalFileGroupId ?? undefined,
          categoryIds: selectedCategoryIds,
          startBid: Number(data.startBid),
          auctionStartAt: auctionStart,
          auctionEndAt: auctionEnd,
          auctionId: readyAuction?.auctionId,
        };
        const productResponse = await productApi.updateProduct(
          productId,
          productData
        );

        const createdProduct = productResponse.data.product;
        alert("상품과 경매가 성공적으로 수정되었습니다.");
        navigate(`/products/${createdProduct?.id}`);
      } else {
        // 신규 등록 - 상품과 경매 함께 생성
        const productData: ProductCreationRequest & AuctionUpdateRequest = {
          name: data.name,
          description: data.description,
          fileGrpId: finalFileGroupId ?? undefined,
          categoryIds: selectedCategoryIds,
          startBid: Number(data.startBid),
          auctionStartAt: auctionStart,
          auctionEndAt: auctionEnd,
        };

        const productResponse = await productApi.createProduct(productData);
        const createdProduct = productResponse.data.product;

        console.log(createdProduct, "<<<<<");

        // 상품 생성 후 경매 생성

        alert("상품과 경매가 성공적으로 등록되었습니다.");
        navigate(`/products/${createdProduct?.id}`);
      }
    } catch (err: any) {
      console.error("처리 실패:", err);
      setError(err.response?.data?.message || "요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!currentProduct?.id) {
      alert("상품 정보를 찾을 수 없습니다.");
      return;
    }
    if (hasActiveAuction) {
      alert("대기 중인 경매를 먼저 삭제한 뒤 상품을 삭제할 수 있습니다.");
      return;
    }
    const sellerIdForDeletion = currentProduct.sellerId ?? user?.userId;
    if (!sellerIdForDeletion) {
      alert("상품 삭제 권한이 없습니다.");
      return;
    }
    if (
      !window.confirm(
        "상품을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다."
      )
    ) {
      return;
    }
    try {
      setProductDeleteLoading(true);
      await productApi.deleteProduct(currentProduct.id, sellerIdForDeletion);
      alert("상품이 삭제되었습니다.");
      navigate("/products");
    } catch (err: any) {
      console.error("상품 삭제 실패:", err);
      alert(err?.response?.data?.message ?? "상품 삭제에 실패했습니다.");
    } finally {
      setProductDeleteLoading(false);
    }
  };

  const handleDeleteAuction = async () => {
    if (
      !currentAuction?.auctionId ||
      !deletableAuctionStatuses.includes(currentAuction.status)
    ) {
      alert("삭제할 수 있는 경매 정보를 찾을 수 없습니다.");
      return;
    }
    if (
      !window.confirm(
        "경매를 삭제하시겠습니까? 삭제된 경매는 복구되지 않습니다."
      )
    ) {
      return;
    }
    try {
      setAuctionDeleteLoading(true);
      await auctionApi.removeAuction(currentAuction.auctionId);
      alert("경매가 삭제되었습니다.");
      setCurrentAuction(null);
      setHasActiveAuction(false);
    } catch (err: any) {
      console.error("경매 삭제 실패:", err);
      alert(err?.response?.data?.message ?? "경매 삭제에 실패했습니다.");
    } finally {
      setAuctionDeleteLoading(false);
    }
  };

  if (user?.role !== "SELLER" && user?.role !== "ADMIN" && !isEditMode) {
    return (
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ my: 4 }}>
          상품 및 경매 등록
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          상품과 경매를 등록할 권한이 없습니다. 판매자 또는 관리자만 등록할 수
          있습니다.
        </Alert>
        <Button
          variant="contained"
          color="primary"
          component={RouterLink}
          to="/seller/register"
        >
          판매자 등록하러 가기
        </Button>
      </Container>
    );
  }

  const canDeleteProduct = !!(
    isEditMode &&
    currentProduct &&
    (user?.role === UserRole.ADMIN ||
      user?.userId === currentProduct.sellerId) &&
    deletableProductStatuses.includes(currentProduct.status) &&
    !hasActiveAuction
  );

  const canDeleteAuction = !!(
    currentProduct &&
    currentAuction &&
    (user?.role === UserRole.ADMIN ||
      user?.userId === currentProduct.sellerId) &&
    deletableAuctionStatuses.includes(currentAuction.status)
  );

  const existingImageUrls = useMemo(
    () => getProductImageUrls(currentProduct),
    [currentProduct]
  );
  const showExistingImages = isEditMode && existingImageUrls.length > 0;

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Typography variant="h4">
            {isEditMode ? "상품 및 경매 수정" : "상품 및 경매 등록"}
          </Typography>
          {isEditMode && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: { xs: "flex-start", md: "flex-end" },
                gap: 1,
                maxWidth: { xs: "100%", md: "auto" },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                {canDeleteAuction && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDeleteAuction}
                    disabled={auctionDeleteLoading}
                  >
                    {auctionDeleteLoading ? "경매 삭제 중..." : "경매 삭제"}
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDeleteProduct}
                  disabled={productDeleteLoading || !canDeleteProduct}
                >
                  {productDeleteLoading
                    ? "상품 삭제 중..."
                    : hasActiveAuction
                    ? "상품 삭제 (대기 경매 존재)"
                    : "상품 삭제"}
                </Button>
              </Stack>
              {hasActiveAuction && (
                <Typography
                  variant="body2"
                  color="warning.main"
                  sx={{ textAlign: { xs: "left", md: "right" } }}
                >
                  대기 중인 경매를 먼저 삭제해야 상품을 삭제할 수 있습니다.
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </Box>
      <Paper sx={{ p: 4, boxShadow: 2 }}>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ mt: 1 }}
        >
          <Box
            component="fieldset"
            disabled={loading}
            sx={{ border: 0, p: 0, m: 0, minInlineSize: 0 }}
          >
          {/* 상품 정보 섹션 */}
          <Typography
            variant="h6"
            sx={{ mb: 3, fontWeight: "bold", color: "primary.main" }}
          >
            상품 정보
          </Typography>

          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
            label="상품명"
            autoFocus
            {...register("name", { required: "상품명은 필수입니다." })}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="description"
            label="상품 설명"
            multiline
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
            rows={4}
            {...register("description", {
              required: "상품 설명은 필수입니다.",
            })}
            error={!!errors.description}
            helperText={errors.description?.message}
          />

          <FormControl component="fieldset" margin="normal" fullWidth>
            <FormLabel component="legend">카테고리</FormLabel>
            <FormGroup row>
              {categoriesLoading && allCategories.length === 0
                ? Array.from({ length: 6 }).map((_, idx) => (
                    <FormControlLabel
                      key={idx}
                      control={<Checkbox disabled />}
                      label={<Skeleton width={80} />}
                    />
                  ))
                : allCategories?.map((category) => (
                    <FormControlLabel
                      key={category.id}
                      control={
                        <Checkbox
                          onChange={handleCategoryChange}
                          name={category.id}
                          checked={selectedCategoryIds.includes(category.id)}
                        />
                      }
                      label={category.categoryName}
                    />
                  ))}
            </FormGroup>
          </FormControl>

          {/* 이미지 업로드 섹션 */}
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold" }}>
              상품 이미지
            </Typography>

            {showExistingImages && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.04)"
                      : "grey.50",
                }}
              >
                <Stack spacing={1.5}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          현재 등록된 이미지
                        </Typography>
                        <Chip
                          size="small"
                          label={`${existingImageUrls.length}장`}
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        기존 이미지는 유지하거나, 새 이미지로 한 번에 교체할 수
                        있어요.
                      </Typography>
                    </Box>

                    <ToggleButtonGroup
                      size="small"
                      color="primary"
                      value={useExistingImages ? "KEEP" : "REPLACE"}
                      exclusive
                      onChange={(_, v: "KEEP" | "REPLACE" | null) => {
                        if (!v) return;
                        handleExistingImageModeChange(v === "KEEP");
                      }}
                    >
                      <ToggleButton value="KEEP">유지</ToggleButton>
                      <ToggleButton value="REPLACE">교체</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gap: 1,
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(120px, 1fr))",
                      opacity: useExistingImages ? 1 : 0.55,
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    {existingImageUrls.map((url, idx) => (
                      <Paper
                        key={`${url}-${idx}`}
                        variant="outlined"
                        sx={{
                          position: "relative",
                          overflow: "hidden",
                          borderRadius: 2,
                          borderColor: idx === 0 ? "primary.main" : "divider",
                        }}
                      >
                        <Box
                          component="img"
                          src={url}
                          alt={`등록된 이미지 ${idx + 1}`}
                          sx={{
                            width: "100%",
                            height: 120,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        {idx === 0 && (
                          <Chip
                            size="small"
                            icon={<Star sx={{ fontSize: 16 }} />}
                            label="대표"
                            color="primary"
                            sx={{
                              position: "absolute",
                              top: 8,
                              left: 8,
                              fontWeight: 700,
                            }}
                          />
                        )}
                      </Paper>
                    ))}
                  </Box>

                  {!useExistingImages && (
                    <Alert severity="warning">
                      새 이미지를 업로드하면 기존 이미지가 모두 대체됩니다.
                    </Alert>
                  )}
                </Stack>
              </Paper>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Paper
                variant="outlined"
                sx={{
                  borderStyle: "dashed",
                  borderWidth: 2,
                  borderColor: useExistingImages ? "divider" : "grey.400",
                  borderRadius: 2,
                  p: 2,
                  bgcolor: useExistingImages
                    ? "action.disabledBackground"
                    : "background.paper",
                  transition:
                    "border-color 0.15s ease, background-color 0.15s ease",
                  "&:hover": useExistingImages
                    ? undefined
                    : {
                        borderColor: "primary.main",
                        bgcolor: "action.hover",
                      },
                }}
                onDragOver={(e) => {
                  if (useExistingImages) return;
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  if (useExistingImages) return;
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files || []).filter(
                    (f) => f.type.startsWith("image/")
                  );
                  handleDropFiles(dropped);
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AddPhotoAlternate
                        color={useExistingImages ? "disabled" : "primary"}
                      />
                      <Typography variant="subtitle1" fontWeight={700}>
                        {useExistingImages
                          ? "기존 이미지 유지 중"
                          : localImages.length > 0
                          ? "이미지를 추가로 선택"
                          : "상품 이미지 업로드"}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {useExistingImages
                        ? "기존 이미지를 유지하려면 그대로 저장하세요. 교체하려면 ‘이미지 교체하기’를 눌러주세요."
                        : "드래그 앤 드롭 또는 파일 선택으로 여러 장 업로드할 수 있어요."}
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    component="label"
                    disabled={useExistingImages}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    파일 선택
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                    />
                  </Button>
                </Stack>
              </Paper>

              {localImages.length > 0 && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.04)"
                        : "grey.50",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        선택한 이미지 {localImages.length}장
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        드래그해서 순서를 바꿀 수 있어요. 첫 번째 이미지가
                        대표로 사용됩니다.
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      color="inherit"
                      onClick={clearLocalImages}
                    >
                      전체 제거
                    </Button>
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gap: 1,
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(140px, 1fr))",
                    }}
                  >
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        setLocalImages((prev) => {
                          const oldIndex = prev.findIndex(
                            (img) => img.id === active.id
                          );
                          const newIndex = prev.findIndex(
                            (img) => img.id === over.id
                          );
                          if (oldIndex < 0 || newIndex < 0) return prev;
                          return arrayMove(prev, oldIndex, newIndex);
                        });
                      }}
                    >
                      <SortableContext
                        items={imageIds}
                        strategy={rectSortingStrategy}
                      >
                        {localImages.map((image, idx) => (
                          <SortableImageItem
                            key={image.id}
                            image={image}
                            isRepresentative={idx === 0}
                            onRemove={() => handleRemoveLocalImage(image.id)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </Box>
                </Paper>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* 경매 정보 섹션 */}
          <Typography
            variant="h6"
            sx={{ mb: 2, mt: 4, fontWeight: "bold", color: "primary.main" }}
          >
            경매 정보
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                    inputLabel: {
                      shrink: true,
                    },
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
                  if (isNaN(end.getTime())) return "올바른 날짜를 입력해주세요";
                  if (end <= start)
                    return "종료 시간은 시작 시간 이후여야 합니다";
                  if (end.getMinutes() !== 0) return "정각 단위로 입력해주세요";
                  return true;
                },
              })}
              error={!!errors.auctionEndAt}
              helperText={errors.auctionEndAt?.message || "예: 연-월-일 12:00"}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : isEditMode ? (
              "상품 및 경매 수정하기"
            ) : (
              "상품 및 경매 등록하기"
            )}
          </Button>
          </Box>
        </Box>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>알림</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} autoFocus>
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProductRegistration;
