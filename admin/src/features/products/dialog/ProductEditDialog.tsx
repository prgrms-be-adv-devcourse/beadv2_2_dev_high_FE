import { adminProductApi, type ProductAdminRequest } from "@/apis/adminProductApi";
import { categoryApi } from "@/apis/categoryApi";
import { fileApi } from "@/apis/fileApi";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  dialogContentSx,
  dialogPaperSx,
  dialogTitleSx,
} from "@/shared/components/dialogStyles";

type ProductEditFormValues = {
  name: string;
  description: string;
  categoryIds: string[];
};

type ProductEditDialogProps = {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onExited: () => void;
};

const truncateFileName = (name: string, maxLength = 24) => {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, Math.max(0, maxLength - 3))}...`;
};

const ProductEditDialog = ({
  open,
  productId,
  onClose,
  onExited,
}: ProductEditDialogProps) => {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const productQuery = useQuery({
    queryKey: ["admin", "product", productId],
    queryFn: () => (productId ? adminProductApi.getProduct(productId) : null),
    enabled: open && !!productId,
    staleTime: 20_000,
  });

  const product = productQuery.data?.data;
  const fileGroupId = product?.fileGroupId;
  const fileGroupQuery = useQuery({
    queryKey: ["admin", "files", "group", fileGroupId],
    queryFn: () =>
      fileGroupId ? fileApi.getFiles(String(fileGroupId)) : null,
    enabled: open && !!fileGroupId,
    staleTime: 20_000,
  });
  const existingFileUrl = fileGroupQuery.data?.data?.files?.[0]?.filePath;
  const categoryIdsFromProduct = useMemo(() => {
    const categories = product?.categories ?? [];
    return categories
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.id ?? item?.name ?? "";
      })
      .filter(Boolean)
      .map(String);
  }, [product?.categories]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProductEditFormValues>({
    defaultValues: {
      name: "",
      description: "",
      categoryIds: [],
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const response = await categoryApi.getCategories();
      return response.data;
    },
    staleTime: 5 * 60_000,
  });
  const categories = categoriesQuery.data ?? [];
  const categoryError = useMemo(() => {
    const err: any = categoriesQuery.error;
    if (!err) return null;
    return (
      err?.data?.message ??
      err?.response?.data?.message ??
      "카테고리를 불러오지 못했습니다."
    );
  }, [categoriesQuery.error]);
  const categoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category: any) => {
      const id = String(category.id);
      const label =
        category.categoryName ?? category.name ?? category.id ?? "알 수 없음";
      map.set(id, String(label));
    });
    return map;
  }, [categories]);

  useEffect(() => {
    if (!open) return;
    if (!product) return;
    reset({
      name: product.name ?? "",
      description: product.description ?? "",
      categoryIds: categoryIdsFromProduct,
    });
  }, [open, product, categoryIdsFromProduct, reset]);

  const updateMutation = useMutation({
    mutationFn: (payload: ProductAdminRequest) => {
      if (!productId) {
        return Promise.reject(new Error("상품 ID가 없습니다."));
      }
      return adminProductApi.updateProduct(productId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "product", productId],
      });
      onClose();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ??
        error?.data?.message ??
        "상품 수정에 실패했습니다.";
      setSubmitError(message);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
    setFileError(null);
    event.target.value = "";
  };

  const handleFileClear = () => {
    setSelectedFiles([]);
    setFileError(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
      TransitionProps={{
        onExited: () => {
          setSubmitError(null);
          setFileError(null);
          setSelectedFiles([]);
          reset();
          onExited();
        },
      }}
    >
      <DialogTitle sx={dialogTitleSx}>상품 수정</DialogTitle>
      <DialogContent dividers sx={dialogContentSx}>
        <Stack spacing={2}>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          {productQuery.isLoading && (
            <Typography color="text.secondary">
              상품 정보를 불러오는 중...
            </Typography>
          )}
          {productQuery.isError && (
            <Typography color="error">
              상품 정보를 불러오지 못했습니다.
            </Typography>
          )}
          {!productQuery.isLoading && !productQuery.isError && (
            <>
              <TextField
                label="상품명"
                fullWidth
                {...register("name", { required: "상품명을 입력하세요." })}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
              <TextField
                label="상품 설명"
                fullWidth
                multiline
                minRows={3}
                {...register("description", {
                  required: "상품 설명을 입력하세요.",
                })}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
              <Controller
                name="categoryIds"
                control={control}
                rules={{
                  validate: (value) =>
                    value.length > 0 || "카테고리를 1개 이상 선택하세요.",
                }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.categoryIds}>
                    <InputLabel id="product-edit-category-label">
                      카테고리
                    </InputLabel>
                    <Select
                      labelId="product-edit-category-label"
                      multiple
                      value={field.value}
                      label="카테고리"
                      onChange={(event) =>
                        field.onChange(event.target.value as string[])
                      }
                      renderValue={(selected) =>
                        (selected as string[])
                          .map((id) => categoryLabelMap.get(id) ?? id)
                          .join(", ")
                      }
                      disabled={categoriesQuery.isLoading}
                    >
                      {categories.map((category: any) => {
                        const id = String(category.id);
                        const label =
                          category.categoryName ??
                          category.name ??
                          category.id ??
                          "알 수 없음";
                        return (
                          <MenuItem key={id} value={id}>
                            <Checkbox checked={field.value.includes(id)} />
                            <ListItemText primary={label} />
                          </MenuItem>
                        );
                      })}
                    </Select>
                    <FormHelperText>
                      {errors.categoryIds?.message}
                    </FormHelperText>
                  </FormControl>
                )}
              />
              {categoryError && (
                <Alert severity="warning">{categoryError}</Alert>
              )}
              <Stack spacing={1}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Typography variant="subtitle2">상품 이미지</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" component="label">
                      파일 선택
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                      />
                    </Button>
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={handleFileClear}
                      disabled={selectedFiles.length === 0}
                    >
                      선택 해제
                    </Button>
                  </Stack>
                </Stack>
                {selectedFiles.length > 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    title={selectedFiles.map((file) => file.name).join(", ")}
                  >
                    선택된 파일:{" "}
                    {selectedFiles
                      .map((file) => truncateFileName(file.name))
                      .join(", ")}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    선택된 파일이 없습니다. 업로드하지 않으면 기존 이미지를
                    유지합니다.
                  </Typography>
                )}
                {fileError && <Alert severity="warning">{fileError}</Alert>}
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(async (values) => {
            if (updateMutation.isPending) return;
            let fileGrpId: string | undefined;
            let fileURL: string | undefined;
            if (selectedFiles.length > 0) {
              try {
                const uploadResponse = await fileApi.uploadFiles(selectedFiles);
                fileGrpId = uploadResponse.data.fileGroupId;
                fileURL = uploadResponse.data.files?.[0]?.filePath;
                if (!fileGrpId) {
                  throw new Error("파일 그룹 ID를 받아오지 못했습니다.");
                }
              } catch (error: any) {
                setFileError(
                  error?.message ??
                    "이미지 업로드에 실패했습니다. 다시 시도해 주세요."
                );
                return;
              }
            } else if (fileGroupId) {
              fileGrpId = String(fileGroupId);
              fileURL = existingFileUrl;
            }
            updateMutation.mutate({
              name: values.name.trim(),
              description: values.description.trim(),
              categoryIds: values.categoryIds,
              fileGrpId,
              fileURL,
            });
          })}
          disabled={
            updateMutation.isPending || productQuery.isLoading || !productId
          }
        >
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductEditDialog;
