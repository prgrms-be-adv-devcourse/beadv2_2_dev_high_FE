import type { AiProductGenerateRequest } from "@/apis/adminProductApi";
import { categoryApi } from "@/apis/categoryApi";
import {
  Alert,
  Button,
  CircularProgress,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";

type CategoryRow = {
  key: number;
  categoryId: string;
  count: number;
};

type ProductAiGenerateDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: AiProductGenerateRequest) => void;
  pending: boolean;
};

const MAX_TOTAL_COUNT = 10;

const ProductAiGenerateDialog = ({
  open,
  onClose,
  onSubmit,
  pending,
}: ProductAiGenerateDialogProps) => {
  const nextKeyRef = useRef(1);
  const [rows, setRows] = useState<CategoryRow[]>([
    { key: 0, categoryId: "", count: 1 },
  ]);
  const [generateImage, setGenerateImage] = useState(true);

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
  const selectedCategoryIds = useMemo(() => {
    return new Set(rows.map((row) => row.categoryId).filter(Boolean));
  }, [rows]);
  const duplicateCategoryIds = useMemo(() => {
    const countMap = new Map<string, number>();
    rows.forEach((row) => {
      if (!row.categoryId) return;
      countMap.set(row.categoryId, (countMap.get(row.categoryId) ?? 0) + 1);
    });
    return Array.from(countMap.values()).some((count) => count > 1);
  }, [rows]);
  const totalCount = useMemo(() => {
    return rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  }, [rows]);

  const handleClose = () => {
    if (pending) return;
    onClose();
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      { key: nextKeyRef.current++, categoryId: "", count: 1 },
    ]);
  };

  const handleRemoveRow = (key: number) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const handleCategoryChange = (key: number, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.key === key ? { ...row, categoryId: value } : row
      )
    );
  };

  const handleCountChange = (key: number, value: string) => {
    const numericValue = value === "" ? 0 : Number(value);
    setRows((prev) =>
      prev.map((row) =>
        row.key === key
          ? { ...row, count: Number.isNaN(numericValue) ? 0 : numericValue }
          : row
      )
    );
  };

  const hasEmptyCategory = rows.some((row) => !row.categoryId);
  const hasInvalidCount = rows.some(
    (row) => !Number.isFinite(row.count) || row.count < 1
  );
  const totalTooHigh = totalCount > MAX_TOTAL_COUNT;
  const canSubmit =
    rows.length > 0 &&
    !hasEmptyCategory &&
    !hasInvalidCount &&
    !totalTooHigh &&
    !duplicateCategoryIds &&
    !categoriesQuery.isLoading &&
    !pending;

  return (
    <Dialog
      open={open}
        onClose={handleClose}
        disableEscapeKeyDown={pending}
        maxWidth="md"
        fullWidth
        TransitionProps={{
          onExited: () => {
            setRows([{ key: 0, categoryId: "", count: 1 }]);
            nextKeyRef.current = 1;
            setGenerateImage(true);
          },
        }}
      >
      <DialogTitle>AI 상품 생성</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={1}
          >
            <Stack spacing={0.5}>
              <Typography variant="body1">
                카테고리별 생성 수량을 입력해 주세요.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                최대 {MAX_TOTAL_COUNT}개까지 생성할 수 있습니다.
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              onClick={handleAddRow}
              disabled={pending}
            >
              추가
            </Button>
          </Stack>
          {rows.map((row) => (
            <Stack
              key={row.key}
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", md: "flex-start" }}
              sx={{ minHeight: { xs: "auto", md: 72 } }}
            >
              <FormControl
                sx={{ flex: 1, minWidth: { xs: "100%", md: 260 } }}
                error={!row.categoryId}
                disabled={categoriesQuery.isLoading || pending}
              >
                <InputLabel id={`ai-category-label-${row.key}`}>
                  카테고리
                </InputLabel>
                <Select
                  labelId={`ai-category-label-${row.key}`}
                  value={row.categoryId}
                  label="카테고리"
                  onChange={(event) =>
                    handleCategoryChange(row.key, event.target.value as string)
                  }
                >
                  {categories.map((category: any) => {
                    const id = String(category.id);
                    const label =
                      category.categoryName ??
                      category.name ??
                      category.id ??
                      "알 수 없음";
                    const disabled =
                      selectedCategoryIds.has(id) && row.categoryId !== id;
                    return (
                      <MenuItem key={id} value={id} disabled={disabled}>
                        {label}
                      </MenuItem>
                    );
                  })}
                </Select>
                <FormHelperText>
                  {row.categoryId ? " " : "카테고리를 선택하세요."}
                </FormHelperText>
              </FormControl>
              <TextField
                label="수량"
                type="number"
                value={row.count}
                onChange={(event) =>
                  handleCountChange(row.key, event.target.value)
                }
                error={!Number.isFinite(row.count) || row.count < 1}
                helperText={
                  row.count < 1 ? "수량은 1 이상이어야 합니다." : " "
                }
                inputProps={{ min: 1, max: MAX_TOTAL_COUNT }}
                sx={{ width: { xs: "100%", md: 140 } }}
                disabled={pending}
              />
              <Button
                variant="text"
                color="error"
                onClick={() => handleRemoveRow(row.key)}
                disabled={rows.length === 1 || pending}
                sx={{
                  width: { xs: "100%", md: "auto" },
                  alignSelf: { xs: "stretch", md: "flex-start" },
                  height: { xs: "auto", md: 56 },
                }}
              >
                삭제
              </Button>
            </Stack>
          ))}
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2">
              합계: {totalCount}개
            </Typography>
            {totalTooHigh && (
              <Alert severity="warning">
                최대 {MAX_TOTAL_COUNT}개까지 가능합니다.
              </Alert>
            )}
          </Stack>
          {duplicateCategoryIds && (
            <Alert severity="warning">
              중복된 카테고리가 있습니다. 카테고리를 정리해 주세요.
            </Alert>
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={generateImage}
                onChange={(event) => setGenerateImage(event.target.checked)}
                disabled={pending}
              />
            }
            label="이미지 생성 포함"
          />
          {categoryError && <Alert severity="warning">{categoryError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={pending}>
          취소
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            if (!canSubmit) return;
            onSubmit({
              categories: rows.map((row) => ({
                categoryId: row.categoryId,
                count: row.count,
              })),
              generateImage,
            });
            handleClose();
          }}
          disabled={!canSubmit}
          startIcon={
            pending ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
        >
          {pending ? "생성 중" : "생성"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductAiGenerateDialog;
