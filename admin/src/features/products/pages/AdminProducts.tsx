import {
  adminProductApi,
  type ProductAdminSearchFilter,
} from "@/apis/adminProductApi";
import { type Product } from "@moreauction/types";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import AuctionInfoDialog from "../dialog/AuctionInfoDialog";
import ProductDeleteDialog from "../dialog/ProductDeleteDialog";
import ProductCreateDialog from "../dialog/ProductCreateDialog";
import ProductEditDialog from "../dialog/ProductEditDialog";
import ProductAiGenerateDialog from "../dialog/ProductAiGenerateDialog";
import ProductInfoDialog from "@/features/auctions/dialog/ProductInfoDialog";
import { PAGE_SIZE } from "@/shared/constant/const";
import { useAiProductGenerate } from "@/shared/contexts/AiProductGenerateContext";

const deletedOptions = [
  { value: "all", label: "삭제 여부 전체" },
  { value: "N", label: "삭제 안됨" },
  { value: "Y", label: "삭제됨" },
];

const AdminProducts = () => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [deletedFilter, setDeletedFilter] = useState("all");
  const [filters, setFilters] = useState<ProductAdminSearchFilter>({});
  const [draftFilters, setDraftFilters] = useState<ProductAdminSearchFilter>(
    {},
  );
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [auctionListOpen, setAuctionListOpen] = useState<string | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState<boolean>(false);
  const [openAiGenerateDialog, setOpenAiGenerateDialog] =
    useState<boolean>(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const { pending: aiGeneratePending, startGenerate } = useAiProductGenerate();
  const [productDetail, setProductDetail] = useState<{
    id?: string;
    name?: string;
    sellerId?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    fileGroupId?: string | number | null;
    categories?: Array<{ id?: string; name?: string }> | string[];
  } | null>(null);
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const productsQuery = useQuery({
    queryKey: ["admin", "products", page, deletedFilter, filters],
    queryFn: () =>
      adminProductApi.getProducts({
        page: page - 1,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
        deletedYn:
          deletedFilter === "all" ? undefined : (deletedFilter as "Y" | "N"),
        filter: filters,
      }),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
  const deleteMutation = useMutation({
    mutationFn: (productId: string) => adminProductApi.deleteProduct(productId),
    onSuccess: (_response, productId) => {
      queryClient.setQueryData(
        ["admin", "products", page, deletedFilter, filters],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            content: oldData.content.map((product: Product) =>
              product.id === productId
                ? { ...product, deletedYn: "Y" as const }
                : product,
            ),
          };
        },
      );
      setDeleteTarget(null);
    },
  });

  const products = productsQuery.data?.content ?? [];
  const totalPages = productsQuery.data?.totalPages ?? 1;

  const handleSearch = () => {
    setFilters({ ...draftFilters });
    setPage(1);
  };

  const handleReset = () => {
    setDraftFilters({});
    setFilters({});
    setDeletedFilter("all");
    setPage(1);
  };
  const handleCreateOpen = () => {
    setOpenCreateDialog(true);
  };
  const handleAiGenerateOpen = () => {
    if (aiGeneratePending) return;
    setOpenAiGenerateDialog(true);
  };
  const handleEditOpen = (productId: string) => {
    setEditProductId(productId);
  };
  const handleEditClose = () => {
    setEditProductId(null);
  };
  const showEmpty =
    !productsQuery.isLoading && !productsQuery.isError && products.length === 0;
  const errorMessage = useMemo(() => {
    if (!productsQuery.isError) return null;
    return "상품 목록을 불러오지 못했습니다.";
  }, [productsQuery.isError]);
  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            상품 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            상품 정보를 확인하고 관리합니다.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <Button
            variant="outlined"
            onClick={handleAiGenerateOpen}
            disabled={aiGeneratePending}
            startIcon={
              aiGeneratePending ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {aiGeneratePending ? "생성 중" : "AI 상품 생성"}
          </Button>
          <Button variant="contained" onClick={handleCreateOpen}>
            상품 등록
          </Button>

          <Select
            size="small"
            value={deletedFilter}
            onChange={(event) => {
              setPage(1);
              setDeletedFilter(event.target.value);
            }}
          >
            {deletedOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            필터
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="상품명"
              size="small"
              value={draftFilters.name ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="설명"
              size="small"
              value={draftFilters.description ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="판매자 ID"
              size="small"
              value={draftFilters.sellerId ?? ""}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  sellerId: event.target.value,
                }))
              }
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" variant="outlined" onClick={handleReset}>
              초기화
            </Button>
            <Button size="small" variant="contained" onClick={handleSearch}>
              필터 적용
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">상품 ID</TableCell>
              <TableCell align="center">상품명</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="center">경매 보기</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody
            sx={{
              "& tr:last-child td, & tr:last-child th": { borderBottom: 0 },
            }}
          >
            {productsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">
                    상품 목록을 불러오는 중...
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {errorMessage && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Alert severity="error">{errorMessage}</Alert>
                </TableCell>
              </TableRow>
            )}
            {products.map((product) => (
              <TableRow
                key={product.id}
                hover
                sx={{ height: 56, cursor: "pointer" }}
                onClick={() => {
                  setProductDetail({
                    id: product.id,
                    name: product.name,
                    sellerId: product.sellerId ?? "-",
                    description: product.description,
                    createdAt: product.createdAt,
                    updatedAt: product.updatedAt,
                    fileGroupId: product.fileGroupId ?? null,
                    categories: product.categories ?? [],
                  });
                  setProductDetailOpen(true);
                }}
              >
                <TableCell align="center">{product.id}</TableCell>
                <TableCell align="center">{product.name}</TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={product.deletedYn === "Y" ? "삭제됨" : "활성"}
                    color={product.deletedYn === "Y" ? "default" : "success"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(event) => {
                      event.stopPropagation();
                      setAuctionListOpen(product.id);
                    }}
                  >
                    경매 보기
                  </Button>
                </TableCell>
                <TableCell align="center">
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Button
                      size="small"
                      color="info"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEditOpen(product.id);
                      }}
                    >
                      수정
                    </Button>
                    <Divider orientation="vertical" flexItem />

                    <Button
                      size="small"
                      color="error"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget(product);
                      }}
                      disabled={
                        deleteMutation.isPending ||
                        !!product.latestAuctionId ||
                        product.deletedYn === "Y"
                      }
                    >
                      삭제
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {showEmpty && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">
                    조건에 해당하는 경매가 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>
      <ProductCreateDialog
        openCreateDialog={openCreateDialog}
        setOpenCreateDialog={setOpenCreateDialog}
      />
      <ProductAiGenerateDialog
        open={openAiGenerateDialog}
        onClose={() => setOpenAiGenerateDialog(false)}
        onSubmit={startGenerate}
        pending={aiGeneratePending}
      />
      <ProductDeleteDialog
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        deleteMutation={deleteMutation}
      />
      <ProductEditDialog
        open={editProductId !== null}
        productId={editProductId}
        onClose={handleEditClose}
        onExited={handleEditClose}
      />

      <AuctionInfoDialog
        auctionListOpen={auctionListOpen}
        setAuctionListOpen={setAuctionListOpen}
      />
      <ProductInfoDialog
        open={productDetailOpen}
        product={productDetail}
        onClose={() => setProductDetailOpen(false)}
        onExited={() => setProductDetail(null)}
      />
    </Box>
  );
};

export default AdminProducts;
