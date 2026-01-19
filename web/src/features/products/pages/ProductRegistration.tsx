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
import { keyframes } from "@emotion/react";
import {
  AuctionStatus,
  type AiGeneratedProductDetail,
  type AuctionUpdateRequest,
  type FileGroup,
  type Product,
  type ProductCategory,
  type ProductCreationRequest,
  type ProductUpdateRequest,
} from "@moreauction/types";
import { UserRole, hasRole } from "@moreauction/types";
import {
  AddPhotoAlternate,
  Close,
  ExpandMore,
  InfoOutlined,
  AutoAwesome,
  Star,
} from "@mui/icons-material";
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { categoryApi } from "@/apis/categoryApi";
import { fileApi } from "@/apis/fileApi";
import { productApi } from "@/apis/productApi";
import { auctionApi } from "@/apis/auctionApi";
import { useAuth } from "@moreauction/auth";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

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

const scanAnimation = keyframes`
  0% { background-position: 0% 0%; }
  100% { background-position: 0% 200%; }
`;

const MAX_PRODUCT_IMAGES = 10;

const SortableImageItem: React.FC<{
  image: LocalImage;
  isRepresentative: boolean;
  onRemove: () => void;
  showScan: boolean;
  disableRemove: boolean;
}> = ({ image, isRepresentative, onRemove, showScan, disableRemove }) => {
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
      {showScan && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.28)",
            pointerEvents: "none",
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,255,255,0) 0%, rgba(0,255,255,0.6) 45%, rgba(0,255,255,0) 60%, rgba(0,255,255,0) 100%)",
              backgroundSize: "100% 200%",
              animation: `${scanAnimation} 1.6s linear infinite`,
            },
          }}
        />
      )}
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
          if (disableRemove) return;
          onRemove();
        }}
        disabled={disableRemove}
        sx={{
          position: "absolute",
          top: 6,
          right: 6,
          bgcolor: "rgba(0,0,0,0.45)",
          color: "common.white",
          opacity: disableRemove ? 0.5 : 1,
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
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
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
  const [aiDraft, setAiDraft] = useState<AiGeneratedProductDetail | null>(null);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftError, setAiDraftError] = useState<string | null>(null);
  const [aiRetryCount, setAiRetryCount] = useState(0);
  const [applyTitleFromAi, setApplyTitleFromAi] = useState(true);
  const [applyCategoryFromAi, setApplyCategoryFromAi] = useState(true);
  const [aiAppliedImageSignature, setAiAppliedImageSignature] = useState<
    string | null
  >(null);
  const [aiDraftApplied, setAiDraftApplied] = useState(false);

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
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const response = await categoryApi.getCategories();
      return response.data as ProductCategory[];
    },
    staleTime: 5 * 60_000,
  });

  const productDetailQuery = useQuery<Product | null>({
    queryKey: queryKeys.products.detail(productId),
    queryFn: async () => {
      const response = await productApi.getProductById(productId as string);
      const data = response.data as Product | null;
      return data;
    },
    enabled: !!productId,
    staleTime: 30_000,
  });

  const productFileGroupId = productDetailQuery.data?.fileGroupId;
  const fileGroupQuery = useQuery({
    queryKey: queryKeys.files.group(productFileGroupId),
    queryFn: () => fileApi.getFiles(String(productFileGroupId)),
    enabled: !!productFileGroupId,
    staleTime: 30_000,
  });

  const categories = categoriesQuery.data ?? [];
  const categoriesLoading = categoriesQuery.isLoading;
  const categoryError = useMemo(() => {
    const err: any = categoriesQuery.error;
    if (!err) return null;
    return getErrorMessage(err, "카테고리를 불러오지 못했습니다.");
  }, [categoriesQuery.error]);
  const dataError = useMemo(() => {
    const err: any = productDetailQuery.error;
    if (!err) return null;
    return getErrorMessage(err, "데이터를 불러오는 데 실패했습니다.");
  }, [productDetailQuery.error]);
  const pageError = dataError;
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
    const productResponse = productDetailQuery.data;
    if (!productResponse) return;
    const productData = productResponse as Product | undefined;

    if (!productData) {
      setError("상품 정보를 찾을 수 없습니다.");
      navigate("/");
      return;
    }

    if (!user?.userId) {
      return;
    }

    if (user.userId !== productData.sellerId) {
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
    const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - localImages.length);
    if (remainingSlots === 0) {
      setDialogMessage("상품 이미지는 최대 10장까지 업로드할 수 있습니다.");
      setDialogOpen(true);
      event.target.value = "";
      return;
    }
    const nextFiles = files.slice(0, remainingSlots);
    if (nextFiles.length < files.length) {
      setDialogMessage("상품 이미지는 최대 10장까지 업로드할 수 있습니다.");
      setDialogOpen(true);
    }
    setLocalImages((prev) => [
      ...prev,
      ...nextFiles.map((file) => buildLocalImage(file)),
    ]);
    setUseExistingImages(false);
    event.target.value = "";
  };

  const handleDropFiles = (files: File[]) => {
    if (!files.length) return;
    const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - localImages.length);
    if (remainingSlots === 0) {
      setDialogMessage("상품 이미지는 최대 10장까지 업로드할 수 있습니다.");
      setDialogOpen(true);
      return;
    }
    const nextFiles = files.slice(0, remainingSlots);
    if (nextFiles.length < files.length) {
      setDialogMessage("상품 이미지는 최대 10장까지 업로드할 수 있습니다.");
      setDialogOpen(true);
    }
    setLocalImages((prev) => [
      ...prev,
      ...nextFiles.map((file) => buildLocalImage(file)),
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
  const imageSignature = useMemo(
    () =>
      localImages
        .map(
          (img) => `${img.file.name}-${img.file.size}-${img.file.lastModified}`
        )
        .join("|"),
    [localImages]
  );

  useEffect(() => {
    if (aiAppliedImageSignature && aiAppliedImageSignature !== imageSignature) {
      setAiDraftApplied(false);
    }
  }, [aiAppliedImageSignature, imageSignature]);

  useEffect(() => {
    if (aiDraft) {
      setApplyTitleFromAi(true);
      setApplyCategoryFromAi(true);
    }
  }, [aiDraft]);

  useEffect(() => {
    setAiRetryCount(0);
    setAiDraft(null);
    setAiDraftError(null);
  }, [imageSignature]);

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const categoryId = event.target.name;
    if (event.target.checked) {
      setSelectedCategoryIds((prev) => {
        if (prev.length >= 3) {
          return prev;
        }
        return [...prev, categoryId];
      });
    } else {
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
    }
  };

  const isCategorySelectionFull = selectedCategoryIds.length >= 3;

  const updatePendingAuctionsForProduct = async (
    targetProductId: string,
    productName: string
  ) => {
    const formatAuctionDate = (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      const pad = (num: number) => String(num).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
      )} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
    };

    try {
      const auctionsResponse = await auctionApi.getAuctionsByProductId(
        targetProductId
      );
      const auctions = auctionsResponse.data ?? [];
      const pendingAuctions = auctions.filter((auction) => {
        const isDeleted =
          auction.deletedYn === true || auction.deletedYn === "Y";
        return !isDeleted && auction.status === AuctionStatus.READY;
      });

      if (pendingAuctions.length === 0) {
        return;
      }

      const updatedAuctions = await Promise.all(
        pendingAuctions.map(async (auction) => {
          const auctionId = auction.auctionId ?? auction.id;
          if (!auctionId) return null;
          const auctionData: AuctionUpdateRequest = {
            productName,
            startBid: auction.startBid,
            auctionStartAt: formatAuctionDate(auction.auctionStartAt),
            auctionEndAt: formatAuctionDate(auction.auctionEndAt),
          };
          const response = await auctionApi.updateAuction(
            String(auctionId),
            auctionData
          );
          if (response.data) {
            queryClient.setQueryData(
              queryKeys.auctions.detail(auctionId),
              response.data
            );
          }
          return response.data ?? null;
        })
      );

      const updatedMap = new Map(
        updatedAuctions
          .filter(
            (auction): auction is NonNullable<typeof auction> => !!auction
          )
          .map((auction) => [String(auction.auctionId ?? auction.id), auction])
      );

      if (updatedMap.size > 0) {
        queryClient.setQueryData(
          queryKeys.auctions.byProduct(targetProductId),
          (prev?: { data?: typeof auctions } | typeof auctions) => {
            const list = Array.isArray(prev) ? prev : prev?.data ?? [];
            if (list.length === 0) return prev;
            const next = list.map((item) => {
              const id = item.auctionId ?? item.id;
              const updated = updatedMap.get(String(id));
              return updated ? { ...item, ...updated } : item;
            });
            return Array.isArray(prev) ? next : { ...prev, data: next };
          }
        );
        queryClient.setQueriesData(
          { queryKey: queryKeys.auctions.lists() },
          (prev?: { content?: typeof auctions } | typeof auctions) => {
            const list = Array.isArray(prev) ? prev : prev?.content ?? [];
            if (list.length === 0) return prev;
            const next = list.map((item) => {
              const id = item.auctionId ?? item.id;
              const updated = updatedMap.get(String(id));
              return updated ? { ...item, ...updated } : item;
            });
            return Array.isArray(prev) ? next : { ...prev, content: next };
          }
        );
        await queryClient.invalidateQueries({
          queryKey: queryKeys.auctions.lists(),
          refetchType: "none",
        });
      }
    } catch (err) {
      console.error("대기 중 경매 업데이트 실패:", err);
      setDialogMessage("대기 중 경매 상품명 업데이트에 실패했습니다.");
      setDialogOpen(true);
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
    const isClearingImages =
      isEditMode && !useExistingImages && localFiles.length === 0;
    let finalFileGroupId: string | null | undefined = canReuseExistingImages
      ? fileGrpId ?? undefined
      : isClearingImages
      ? null
      : undefined;
    let uploadedFirstFileUrl: string | undefined = canReuseExistingImages
      ? getProductImageUrls(fileGroup)[0]
      : undefined;

    try {
      if (!canReuseExistingImages && localFiles.length > 0) {
        const fileUploadResponse = await fileApi.uploadFiles(localFiles);
        finalFileGroupId = fileUploadResponse.data.fileGroupId;
        uploadedFirstFileUrl = fileUploadResponse.data.files?.[0]?.filePath;

        if (!finalFileGroupId) {
          throw new Error("파일 그룹 ID를 받아오지 못했습니다.");
        }
      }

      if (isEditMode && productId) {
        // 수정 모드
        const productData: ProductUpdateRequest = {
          name: data.name,
          description: data.description,
          fileGrpId:
            finalFileGroupId === undefined ? undefined : finalFileGroupId,
          fileURL: uploadedFirstFileUrl,
          categoryIds: selectedCategoryIds,
        };
        const productResponse = await productApi.updateProduct(
          productId,
          productData
        );

        const createdProduct = productResponse.data;
        if (createdProduct) {
          queryClient.setQueryData(
            queryKeys.products.detail(productId),
            createdProduct
          );
          if (user?.userId) {
            queryClient.setQueryData(
              queryKeys.products.mine(user.userId),
              (prev?: Product[]) => {
                if (!prev) return prev;
                return prev.map((item) =>
                  item.id === createdProduct.id ? createdProduct : item
                );
              }
            );
          }
        }
        await queryClient.invalidateQueries({
          queryKey: queryKeys.products.lists(),
          refetchType: "none",
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.products.mine(user?.userId),
          refetchType: "none",
        });
        if (productId) {
          await updatePendingAuctionsForProduct(productId, data.name);
        }
        alert("상품이 성공적으로 수정되었습니다.");
        navigate(`/products/${createdProduct?.id ?? productId}`);
      } else {
        // 신규 등록 - 상품만 생성
        const productData: ProductCreationRequest = {
          name: data.name,
          description: data.description,
          fileGrpId: finalFileGroupId ?? undefined,
          fileURL: uploadedFirstFileUrl,
          categoryIds: selectedCategoryIds,
        };

        const productResponse = await productApi.createProduct(productData);
        const createdProduct = productResponse.data;
        if (createdProduct?.id) {
          queryClient.setQueryData(
            queryKeys.products.detail(createdProduct.id),
            createdProduct
          );
          if (user?.userId) {
            queryClient.setQueryData(
              queryKeys.products.mine(user.userId),
              (prev?: Product[]) => (prev ? [createdProduct, ...prev] : prev)
            );
          }
        }
        await queryClient.invalidateQueries({
          queryKey: queryKeys.products.lists(),
          refetchType: "none",
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.products.mine(user?.userId),
          refetchType: "none",
        });
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

  const buildAiDescription = (draft: AiGeneratedProductDetail) => {
    const blocks: string[] = [];
    blocks.push("[상품 요약]");
    blocks.push(draft.summary || "");
    blocks.push("");
    blocks.push("[상태]");
    blocks.push(`- 종합: ${draft.condition?.overall ?? ""}`);
    (draft.condition?.details ?? []).forEach((detail) => {
      blocks.push(`- ${detail}`);
    });

    const pushList = (title: string, items: string[]) => {
      if (!items.length) return;
      blocks.push("");
      blocks.push(`[${title}]`);
      items.forEach((item) => blocks.push(`- ${item}`));
    };

    pushList("특징", draft.features ?? []);
    pushList("스펙", draft.specs ?? []);
    pushList("구성품", draft.includedItems ?? []);
    pushList("하자/주의", draft.defects ?? []);
    pushList("추천 대상", draft.recommendedFor ?? []);
    pushList("검색 키워드", draft.searchKeywords ?? []);

    return blocks.join("\n").trim();
  };

  const canGenerateAiDraft = localImages.length > 0 && !useExistingImages;
  const canRegenerateAfterApply =
    !aiDraftApplied || aiAppliedImageSignature !== imageSignature;

  const handleGenerateAiDraft = async () => {
    if (aiDraftApplied && aiAppliedImageSignature === imageSignature) {
      setDialogMessage(
        "적용 후에는 이미지 변경 전까지 다시 생성할 수 없습니다."
      );
      setDialogOpen(true);
      return;
    }
    if (!canGenerateAiDraft || aiDraftLoading) {
      setDialogMessage("AI 초안 생성에는 현재 선택한 이미지가 필요합니다.");
      setDialogOpen(true);
      return;
    }

    setAiDraftLoading(true);
    setAiDraftError(null);
    try {
      const response = await productApi.generateProductDetailDraftFromImages({
        files: localImages.map((img) => img.file),
        retryCount: aiRetryCount,
      });
      setAiDraft(response.data ?? null);
      setAiRetryCount(aiRetryCount + 1);
    } catch (err: any) {
      setAiDraftError(getErrorMessage(err, "AI 상세설명 생성에 실패했습니다."));
    } finally {
      setAiDraftLoading(false);
    }
  };

  const handleApplyAiDraft = () => {
    if (!aiDraft) return;
    setValue("description", buildAiDescription(aiDraft), {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (applyTitleFromAi && aiDraft.title) {
      setValue("name", aiDraft.title, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else if (!applyTitleFromAi) {
      setValue("name", "", { shouldDirty: true, shouldValidate: true });
    }
    if (categories.length > 0) {
      const targetId =
        categories.find((category) => category.id === aiDraft.category?.code)
          ?.id ??
        categories.find(
          (category) => category.categoryName === aiDraft.category?.name
        )?.id ??
        null;
      if (targetId) {
        if (applyCategoryFromAi) {
          setSelectedCategoryIds((prev) =>
            prev.includes(targetId) ? prev : [...prev, targetId]
          );
        } else {
          setSelectedCategoryIds((prev) =>
            prev.filter((id) => id !== targetId)
          );
        }
      } else if (applyCategoryFromAi) {
        setDialogMessage(
          "추천 카테고리를 찾을 수 없어 카테고리는 적용되지 않았습니다."
        );
        setDialogOpen(true);
      }
    }
    setAiDraftApplied(true);
    setAiAppliedImageSignature(imageSignature);
  };

  const existingImageUrls = useMemo(
    () => getProductImageUrls(fileGroup),
    [fileGroup]
  );
  const showExistingImages = isEditMode;

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

            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(59, 130, 246, 0.12)"
                      : "rgba(59, 130, 246, 0.08)",
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(148, 163, 184, 0.3)"
                      : "rgba(59, 130, 246, 0.2)",
                  mb: 2,
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AutoAwesome
                        sx={{
                          fontSize: 22,
                          color: (theme) =>
                            theme.palette.mode === "light"
                              ? "rgba(37, 99, 235, 0.95)"
                              : "rgba(191, 219, 254, 0.95)",
                        }}
                      />
                      <Typography variant="subtitle1" fontWeight={800}>
                        AI 상세설명 초안
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        현재 선택한 이미지 기준으로 생성됩니다.
                      </Typography>
                      {aiDraft && (
                        <Tooltip
                          title="AI 초안은 참고용입니다. 필요한 내용을 보완해 주세요."
                          arrow
                          placement="top"
                          componentsProps={{
                            tooltip: {
                              sx: {
                                bgcolor: "grey.900",
                                color: "common.white",
                                fontSize: 12,
                                borderRadius: 1,
                                px: 1,
                                py: 0.5,
                              },
                            },
                            arrow: {
                              sx: { color: "grey.900" },
                            },
                          }}
                        >
                          <IconButton
                            size="small"
                            aria-label="AI 초안 안내"
                            sx={{ color: "text.secondary" }}
                          >
                            <InfoOutlined fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>
                  <Button
                    variant="contained"
                    onClick={handleGenerateAiDraft}
                    disabled={
                      !canGenerateAiDraft ||
                      aiDraftLoading ||
                      !canRegenerateAfterApply
                    }
                  >
                    {aiDraftLoading
                      ? "이미지 분석 중..."
                      : aiDraft
                      ? "AI 초안 다시 생성"
                      : "AI로 초안 생성"}
                  </Button>
                </Stack>
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.04)"
                      : "grey.50",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  {aiDraftError && (
                    <Alert severity="error" sx={{ mb: 1 }}>
                      {aiDraftError}
                    </Alert>
                  )}

                  {!aiDraft ? (
                    <Typography variant="body2" color="text.secondary">
                      {aiDraftLoading
                        ? "이미지 분석 중입니다. 잠시만 기다려주세요."
                        : "이미지를 선택한 뒤 AI 초안 생성을 눌러주세요."}
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>
                          추천 상품명
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {aiDraft.title || "정보 없음"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>
                          추천 카테고리
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {aiDraft.category?.name ??
                            aiDraft.category?.code ??
                            "정보 없음"}
                          {aiDraft.category?.confidence !== undefined &&
                            ` (신뢰도 ${Math.round(
                              aiDraft.category.confidence * 100
                            )}%)`}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>
                          상세설명 초안
                        </Typography>
                        <Box sx={{ position: "relative", mt: 0.5 }}>
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 1.5,
                              border: "1px solid",
                              borderColor: "divider",
                              bgcolor: "background.paper",
                              whiteSpace: "pre-wrap",
                              fontSize: 14,
                              lineHeight: 1.6,
                              maxHeight: 220,
                              overflow: "auto",
                            }}
                          >
                            {buildAiDescription(aiDraft)}
                          </Box>
                        </Box>
                      </Box>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        sx={{ flexWrap: "wrap" }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={applyTitleFromAi}
                              onChange={(event) =>
                                setApplyTitleFromAi(event.target.checked)
                              }
                            />
                          }
                          label="상품명 적용"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={applyCategoryFromAi}
                              onChange={(event) =>
                                setApplyCategoryFromAi(event.target.checked)
                              }
                            />
                          }
                          label="카테고리 적용"
                        />
                        <Button variant="outlined" onClick={handleApplyAiDraft}>
                          설명에 적용
                        </Button>
                      </Stack>
                    </Stack>
                  )}
                  {aiDraftLoading && aiDraft && (
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 2,
                        bgcolor: "rgba(0,0,0,0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{
                          bgcolor: "rgba(0,0,0,0.55)",
                          color: "common.white",
                          px: 1.5,
                          py: 0.75,
                          borderRadius: 999,
                        }}
                      >
                        <CircularProgress size={16} color="inherit" />
                        <Typography variant="caption">재생성 중</Typography>
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Paper>

              {!canRegenerateAfterApply && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  적용 후에는 이미지 변경 전까지 다시 생성할 수 없습니다.
                </Typography>
              )}
            </Box>

            {/* 이미지 업로드 섹션 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                상품 이미지
              </Typography>

              {showExistingImages && (
                <Stack spacing={1.5} sx={{ mb: 2 }}>
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
                        기존 이미지는 그대로 유지하거나 새 이미지로 덮어쓸 수
                        있어요.
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1}>
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
                        <ToggleButton value="KEEP">
                          기존 이미지 유지
                        </ToggleButton>
                        <ToggleButton value="REPLACE">
                          새 이미지로 덮어쓰기
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Stack>
                  </Stack>

                  <Accordion
                    variant="outlined"
                    defaultExpanded={useExistingImages}
                    disableGutters
                    sx={{
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.04)"
                          : "grey.50",
                      "&::before": { display: "none" },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        기존 이미지 미리보기
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {existingImageUrls.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          등록된 이미지가 없습니다.
                        </Typography>
                      ) : (
                        <Box
                          sx={{
                            display: "grid",
                            gap: 1,
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(120px, 1fr))",
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
                                borderColor:
                                  idx === 0 ? "primary.main" : "divider",
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
                      )}
                    </AccordionDetails>
                  </Accordion>

                  {!useExistingImages && (
                    <Alert severity="warning">
                      새 이미지를 업로드하지 않으면 기존 이미지는 삭제됩니다.
                    </Alert>
                  )}
                </Stack>
              )}

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                      position: "relative",
                      overflow: "hidden",
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
                        disabled={aiDraftLoading}
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
                        position: "relative",
                        zIndex: 0,
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
                              showScan={aiDraftLoading && !useExistingImages}
                              disableRemove={aiDraftLoading}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </Box>
                  </Paper>
                )}

                <Box>
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
                              ? "기존 이미지를 유지합니다"
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
                            ? "저장 시 기존 이미지를 그대로 유지합니다."
                            : "드래그 앤 드롭 또는 파일 선택으로 여러 장 업로드할 수 있어요."}
                        </Typography>
                      </Box>

                      <Button
                        variant="contained"
                        component="label"
                        disabled={useExistingImages}
                        autoFocus
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
                </Box>
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                카테고리
              </Typography>
              <FormControl component="fieldset" fullWidth>
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
                              checked={selectedCategoryIds.includes(
                                category.id
                              )}
                              disabled={
                                isCategorySelectionFull &&
                                !selectedCategoryIds.includes(category.id)
                              }
                            />
                          }
                          label={category.categoryName}
                        />
                      ))}
                </FormGroup>
              </FormControl>
              {categoryError && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  {categoryError}
                </Alert>
              )}
            </Box>

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
              placeholder={`[상품 요약]\n\n[상태]\n- 종합:\n- 상세:\n\n[특징]\n- \n\n[스펙]\n- \n\n[구성품]\n- \n\n[하자/주의]\n- \n\n[추천 대상]\n- \n\n[검색 키워드]\n- `}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              rows={8}
              {...register("description", {
                required: "상품 설명은 필수입니다.",
              })}
              error={!!errors.description}
              helperText={errors.description?.message}
            />

            {error && !dataError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {getErrorMessage(error, "요청에 실패했습니다.")}
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
