import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { categoryApi } from "../apis/categoryApi";
import { fileApi } from "../apis/fileApi";
import { productApi } from "../apis/productApi";
import { useAuth } from "../contexts/AuthContext";
import type {
  ProductCategory,
  ProductCreationRequest,
  ProductUpdateRequest,
} from "../types/product";

interface ProductFormData {
  name: string;
  description: string;
}

const ProductRegistration: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const isEditMode = !!productId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>();

  const [allCategories, setAllCategories] = useState<ProductCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryApi.getCategories();
        setAllCategories(response.data);
      } catch (err) {
        console.error("카테고리 목록 로딩 실패:", err);
        setError("카테고리 목록을 불러오는 데 실패했습니다.");
      }
    };

    const fetchProductData = async () => {
      if (!productId) return;
      setLoading(true);
      try {
        const response = await productApi.getProductByIdWithCategories(
          productId
        );
        const product = response.data;

        if (user?.role !== "ADMIN" && user?.id !== product.sellerId) {
          alert("상품을 수정할 권한이 없습니다.");
          navigate("/");
          return;
        }
        reset({
          name: product.name,
          description: product.description,
        });
        const selectedCategoryIds: string[] =
          product.categories?.map((cat) => {
            // ProductCategory 타입인지 확인
            if (typeof cat === "object" && "id" in cat) {
              return (cat as ProductCategory).id;
            }
            return cat as string;
          }) ?? [];

        setSelectedCategoryIds(selectedCategoryIds);
        // TODO: 기존 이미지 미리보기 설정
      } catch (err) {
        setError("상품 정보를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    if (isEditMode) {
      fetchProductData();
    }
  }, [productId, isEditMode, navigate, reset, user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setFileId(null);
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
    }
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const categoryId = event.target.name;
    if (event.target.checked) {
      setSelectedCategoryIds((prev) => [...prev, categoryId]);
    } else {
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (selectedCategoryIds.length === 0) {
      setError("하나 이상의 카테고리를 선택해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    let uploadedFileId = fileId;

    try {
      if (selectedFile) {
        const fileUploadResponse = await fileApi.uploadFile(selectedFile);
        uploadedFileId = fileUploadResponse.data.id;
        if (!uploadedFileId) {
          throw new Error("파일 ID를 받아오지 못했습니다.");
        }
      }

      if (isEditMode && productId) {
        const productData: ProductUpdateRequest = {
          ...data,
          fileId: uploadedFileId ?? undefined,
          categoryIds: selectedCategoryIds,
          sellerId: user?.id ?? "ADM00000001",
        };
        await productApi.updateProduct(productId, productData);
        alert("상품이 성공적으로 수정되었습니다.");
        navigate(`/products/${productId}`);
      } else {
        const productData: ProductCreationRequest = {
          ...data,
          fileId: uploadedFileId ?? undefined,
          categoryIds: selectedCategoryIds,
          sellerId: user?.id ?? "ADM00000001",
        };
        const productResponse = await productApi.createProduct(productData);
        alert("상품이 성공적으로 등록되었습니다.");
        navigate(`/products/${productResponse.data.id}`);
      }
    } catch (err: any) {
      console.error("상품 처리 실패:", err);
      setError(err.response?.data?.message || "요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "SELLER" && user?.role !== "ADMIN" && !isEditMode) {
    return (
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ my: 4 }}>
          상품 등록
        </Typography>
        <Alert severity="error">
          상품을 등록할 권한이 없습니다. 판매자 또는 관리자만 상품을 등록할 수
          있습니다.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ my: 4 }}>
        {isEditMode ? "상품 수정" : "상품 등록"}
      </Typography>
      <Paper sx={{ p: 4 }}>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ mt: 1 }}
        >
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
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
              {allCategories.map((category) => (
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

          <Button variant="contained" component="label" sx={{ mt: 2, mb: 1 }}>
            이미지 업로드
            <input type="file" hidden onChange={handleFileChange} />
          </Button>

          {preview && (
            <Box sx={{ mt: 2, mb: 2, border: "1px solid #ddd", p: 1 }}>
              <Typography variant="subtitle1">이미지 미리보기:</Typography>
              <img
                src={preview}
                alt="미리보기"
                style={{
                  width: "100%",
                  maxHeight: "300px",
                  objectFit: "contain",
                }}
              />
            </Box>
          )}

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
              "상품 수정하기"
            ) : (
              "상품 등록하기"
            )}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProductRegistration;
