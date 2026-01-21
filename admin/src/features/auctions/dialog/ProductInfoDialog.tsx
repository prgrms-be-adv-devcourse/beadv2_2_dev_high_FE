import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  Box,
} from "@mui/material";
import { formatDate } from "@moreauction/utils";
import {
  dialogContentSx,
  dialogPaperSx,
  dialogTitleSx,
} from "@/shared/components/dialogStyles";

import { useQuery } from "@tanstack/react-query";
import { fileApi } from "@/apis/fileApi";

type ProductInfoDialogData = {
  id?: string;
  name?: string;
  sellerId?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  fileGroupId?: string | number | null;
  categories?: Array<{ id?: string; name?: string }> | string[];
};

type ProductInfoDialogProps = {
  open: boolean;
  product: ProductInfoDialogData | null;
  onClose: () => void;
  onExited: () => void;
};

const ProductInfoDialog = ({
  open,
  product,
  onClose,
  onExited,
}: ProductInfoDialogProps) => {
  const normalizedGroupId =
    product?.fileGroupId != null ? String(product.fileGroupId) : null;
  const productDetailQuery = useQuery({
    queryKey: ["admin", "files", "group", normalizedGroupId],
    queryFn: () =>
      normalizedGroupId ? fileApi.getFiles(normalizedGroupId) : null,
    enabled: open && normalizedGroupId !== null,
    staleTime: 20_000,
  });
  const files = productDetailQuery.data?.data?.files ?? [];
  const categoryText = (() => {
    const categories = product?.categories ?? [];
    if (categories.length === 0) return "-";
    return categories
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.name ?? item?.id ?? "-";
      })
      .join(", ");
  })();
  const createdAtText = product?.createdAt
    ? formatDate(product.createdAt)
    : "-";
  const updatedAtText = product?.updatedAt
    ? formatDate(product.updatedAt)
    : "-";
  const descriptionText = product?.description?.trim() || "-";
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
      TransitionProps={{ onExited }}
    >
      <DialogTitle sx={dialogTitleSx}>상품 정보</DialogTitle>
      <DialogContent dividers sx={dialogContentSx}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            기본 정보
          </Typography>
          <Stack spacing={1}>
            <Typography>
              <strong>상품 ID:</strong> {product?.id ?? "-"}
            </Typography>
            <Typography>
              <strong>상품명:</strong> {product?.name ?? "-"}
            </Typography>
            <Typography>
              <strong>판매자 ID:</strong> {product?.sellerId ?? "-"}
            </Typography>
            <Typography>
              <strong>카테고리:</strong> {categoryText}
            </Typography>
            <Stack spacing={0.5}>
              <Typography sx={{ fontWeight: 600 }}>설명</Typography>
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  padding: 1.5,
                  backgroundColor: "background.default",
                  whiteSpace: "pre-line",
                  color: "text.primary",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {descriptionText}
                </Typography>
              </Box>
            </Stack>
            <Typography>
              <strong>등록일:</strong> {createdAtText}
            </Typography>
            <Typography>
              <strong>수정일:</strong> {updatedAtText}
            </Typography>
          </Stack>
        </Stack>
        <Stack spacing={2} sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            이미지
          </Typography>
          {!normalizedGroupId && (
            <Typography color="text.secondary">
              이미지가 연결되어 있지 않습니다.
            </Typography>
          )}
          {productDetailQuery.isLoading && (
            <Typography>불러오는 중...</Typography>
          )}
          {productDetailQuery.isError && (
            <Typography color="error">
              상품 이미지를 불러오지 못했습니다.
            </Typography>
          )}
          {normalizedGroupId &&
            !productDetailQuery.isLoading &&
            files.length === 0 && (
              <Typography color="text.secondary">
                등록된 이미지가 없습니다.
              </Typography>
            )}
          {files.length > 0 && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                파일 그룹 ID: {normalizedGroupId} · 이미지 {files.length}개
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 1.5,
                }}
              >
                {files.map((file) => (
                  <Box
                    key={file.id}
                    sx={{
                      borderRadius: 1.5,
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: "background.default",
                      aspectRatio: "1 / 1",
                    }}
                  >
                    <Box
                      component="img"
                      src={file.filePath}
                      alt={file.fileName ?? "상품 이미지"}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductInfoDialog;
