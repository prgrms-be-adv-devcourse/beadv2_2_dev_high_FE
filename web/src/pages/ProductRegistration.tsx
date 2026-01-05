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
import type {
  FileGroup,
  Product,
  ProductCategory,
  ProductCreationRequest,
  ProductUpdateRequest,
} from "@moreauction/types";
import { UserRole, hasRole } from "@moreauction/types";
import { AddPhotoAlternate, Close, Star } from "@mui/icons-material";
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
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { categoryApi } from "../apis/categoryApi";
import { fileApi } from "../apis/fileApi";
import { productApi } from "../apis/productApi";
import { useAuth } from "../contexts/AuthContext";

import { getProductImageUrls } from "@moreauction/utils";

interface ProductFormData {
  name: string;
  description: string;
  categoryIds: string[];
  fileGroupId?: string;
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
  const { productId } = useParams<{
    productId?: string;
  }>();
  const isEditMode = !!productId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>();

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [useExistingImages, setUseExistingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [fileGroup, setFileGroup] = useState<FileGroup | null>(null);
  const [productDeleteLoading, setProductDeleteLoading] = useState(false);

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

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await categoryApi.getCategories();
      return response.data as ProductCategory[];
    },
    staleTime: 5 * 60_000,
  });

  const productDetailQuery = useQuery({
    queryKey: ["products", "detail", productId],
    queryFn: () => productApi.getProductById(productId as string),
    enabled: !!productId,
    staleTime: 30_000,
  });

  const productFileGroupId = productDetailQuery.data?.data?.fileGroupId;
  const fileGroupQuery = useQuery({
    queryKey: ["files", "group", productFileGroupId],
    queryFn: () => fileApi.getFiles(String(productFileGroupId)),
    enabled: !!productFileGroupId,
    staleTime: 30_000,
  });

  const categories = categoriesQuery.data ?? [];
  const categoriesLoading = categoriesQuery.isLoading;
  const dataError = useMemo(() => {
    const err: any = categoriesQuery.error ?? productDetailQuery.error;
    if (!err) return null;
    return (
      err?.data?.message ?? err?.message ?? "데이터를 불러오는 데 실패했습니다."
    );
  }, [categoriesQuery.error, productDetailQuery.error]);
  const pageError = dataError ?? error;
  const formLoading = loading || productDetailQuery.isLoading;

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
    if (productId) return;
    setUseExistingImages(false);
    clearLocalImages();
  }, [productId]);

  useEffect(() => {
    const productResponse = productDetailQuery.data?.data;
    if (!productResponse) return;
    const productData = productResponse as Product | undefined;

    if (!productData) {
      setError("상품 정보를 찾을 수 없습니다.");
      navigate("/");
      return;
    }

    if (user?.userId !== productData.sellerId) {
      alert("수정할 권한이 없습니다.");
      navigate(-1);
      return;
    }

    reset({
      name: productData.name,
      description: productData.description,
      categoryIds: (productData.categories ?? []).map((c: any) =>
        typeof c === "string" ? c : String(c.id)
      ),
    });

    const nextCategoryIds: string[] = (productData.categories ?? []).map(
      (c: any) => (typeof c === "string" ? c : String(c.id))
    );
    setSelectedCategoryIds(nextCategoryIds);
    setCurrentProduct(productData);
  }, [navigate, productDetailQuery.data, reset, user?.userId]);

  useEffect(() => {
    const group = fileGroupQuery.data?.data ?? null;
    setFileGroup(group);
  }, [fileGroupQuery.data]);

  useEffect(() => {
    if (!isEditMode) return;
    const hasExistingImages = (fileGroup?.files?.length ?? 0) > 0;
    setUseExistingImages(hasExistingImages);
  }, [fileGroup, isEditMode]);

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

  const onSubmit = async (data: ProductFormData) => {
    if (formLoading) return;

    setLoading(true);
    setError(null);
    const localFiles = localImages.map((image) => image.file);
    const fileGrpId = currentProduct?.fileGroupId;
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

      if (isEditMode && productId) {
        // 수정 모드
        const productData: ProductUpdateRequest = {
          name: data.name,
          description: data.description,
          fileGrpId: finalFileGroupId ?? undefined,
          categoryIds: selectedCategoryIds,
        };
        const productResponse = await productApi.updateProduct(
          productId,
          productData
        );

        const createdProduct = productResponse.data;
        alert("상품이 성공적으로 수정되었습니다.");
        navigate(`/products/${createdProduct?.id ?? productId}`);
      } else {
        // 신규 등록 - 상품만 생성
        const productData: ProductCreationRequest = {
          name: data.name,
          description: data.description,
          fileGrpId: finalFileGroupId ?? undefined,
          categoryIds: selectedCategoryIds,
        };

        const productResponse = await productApi.createProduct(productData);
        const createdProduct = productResponse.data;
        alert("상품이 성공적으로 등록되었습니다.");
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

  if (!hasRole(user?.roles, UserRole.SELLER) && !isEditMode) {
    return (
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ my: 4 }}>
          상품 등록
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          상품을 등록할 권한이 없습니다. 판매자만 등록할 수 있습니다.
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
    user?.userId === currentProduct.sellerId
  );

  const existingImageUrls = useMemo(
    () => getProductImageUrls(fileGroup),
    [fileGroup]
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
            {isEditMode ? "상품 수정" : "상품 등록"}
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
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDeleteProduct}
                  disabled={productDeleteLoading || !canDeleteProduct}
                >
                  {productDeleteLoading ? "상품 삭제 중..." : "상품 삭제"}
                </Button>
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>
      <Paper sx={{ p: 4, boxShadow: 2 }}>
        {pageError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {pageError}
          </Alert>
        )}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ mt: 1 }}
        >
          <Box
            component="fieldset"
            disabled={formLoading}
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
                {categoriesLoading && categories.length === 0
                  ? Array.from({ length: 6 }).map((_, idx) => (
                      <FormControlLabel
                        key={idx}
                        control={<Checkbox disabled />}
                        label={<Skeleton width={80} />}
                      />
                    ))
                  : categories.map((category) => (
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
              <Typography
                variant="subtitle1"
                sx={{ mb: 2, fontWeight: "bold" }}
              >
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
                          기존 이미지는 유지하거나, 새 이미지로 한 번에 교체할
                          수 있어요.
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
                    const dropped = Array.from(
                      e.dataTransfer.files || []
                    ).filter((f) => f.type.startsWith("image/"));
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

            {error && !dataError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={formLoading}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : isEditMode ? (
                "상품 수정하기"
              ) : (
                "상품 등록하기"
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
