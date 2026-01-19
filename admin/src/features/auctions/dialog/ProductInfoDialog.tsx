import { adminProductApi } from "@/apis/adminProductApi";
import { formatDate } from "@moreauction/utils";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

import { useQuery } from "@tanstack/react-query";

const ProductInfoDialog = ({
  productDetailOpen,
  setProductDetailOpen,
}: any) => {
  const productDetailQuery = useQuery({
    queryKey: ["admin", "products", "detail", productDetailOpen],
    queryFn: () =>
      productDetailOpen ? adminProductApi.getProduct(productDetailOpen) : null,
    enabled: productDetailOpen !== null,
    staleTime: 20_000,
  });
  return (
    <Dialog
      open={!!productDetailOpen}
      onClose={() => setProductDetailOpen(null)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>상품 상세 정보</DialogTitle>
      <DialogContent>
        {productDetailQuery.isLoading && (
          <Typography>불러오는 중...</Typography>
        )}
        {productDetailQuery.isError && (
          <Typography color="error">
            상품 정보를 불러오지 못했습니다.
          </Typography>
        )}
        {productDetailQuery.data && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography>
              <strong>상품 ID:</strong> {productDetailQuery.data.data.id}
            </Typography>
            <Typography>
              <strong>상품명:</strong> {productDetailQuery.data.data.name}
            </Typography>
            <Typography>
              <strong>설명:</strong>{" "}
              {productDetailQuery.data.data.description || "-"}
            </Typography>
            <Typography>
              <strong>판매자:</strong> {productDetailQuery.data.data.sellerId}
            </Typography>
            <Typography>
              <strong>등록일:</strong>{" "}
              {formatDate(productDetailQuery.data.data.createdAt)}
            </Typography>
            <Typography>
              <strong>수정일:</strong>{" "}
              {formatDate(productDetailQuery.data.data.updatedAt)}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setProductDetailOpen(null)}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductInfoDialog;
