import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  InputAdornment,
  Pagination,
  Skeleton,
  Stack,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auctionApi } from "@/apis/auctionApi";
import type { AuctionDocument, ProductCategory } from "@moreauction/types";
import { categoryApi } from "@/apis/categoryApi";
import { getAuctionStatusText } from "@moreauction/utils";
import { AuctionStatus } from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import { queryKeys } from "@/shared/queries/queryKeys";
import { ImageWithFallback } from "@/shared/components/common/ImageWithFallback";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

const SearchPage: React.FC = () => {
  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  // URL 쿼리에서 초기 검색 조건 읽기
  const initialKeyword = params.get("keyword") ?? "";
  const initialStatus = params.get("status") ?? "";
  const initialCategoryNames = params.getAll("categories");
  const initialMinStartPrice = params.get("minStartPrice") ?? "";
  const initialMaxStartPrice = params.get("maxStartPrice") ?? "";
  const initialStartFrom = params.get("startFrom") ?? "";
  const initialStartTo = params.get("startTo") ?? "";
  const initialPage = Number(params.get("page") ?? 0);

  // 입력용 상태 (폼에 바인딩)
  const [inputKeyword, setInputKeyword] = useState(initialKeyword);
  const [pendingStatus, setPendingStatus] = useState(initialStatus);
  const [pendingCategoryNames, setPendingCategoryNames] =
    useState<string[]>(initialCategoryNames);
  const [pendingMinStartPrice, setPendingMinStartPrice] =
    useState(initialMinStartPrice);
  const [pendingMaxStartPrice, setPendingMaxStartPrice] =
    useState(initialMaxStartPrice);
  const [pendingStartFrom, setPendingStartFrom] = useState(initialStartFrom);
  const [pendingStartTo, setPendingStartTo] = useState(initialStartTo);

  // 실제 검색에 사용되는 적용 상태
  const [keyword, setKeyword] = useState(initialKeyword);
  const [status, setStatus] = useState(initialStatus);
  const [selectedCategoryNames, setSelectedCategoryNames] =
    useState<string[]>(initialCategoryNames);
  const [minStartPrice, setMinStartPrice] = useState(initialMinStartPrice);
  const [maxStartPrice, setMaxStartPrice] = useState(initialMaxStartPrice);
  const [startFrom, setStartFrom] = useState(initialStartFrom);
  const [startTo, setStartTo] = useState(initialStartTo);
  const [page, setPage] = useState(initialPage >= 0 ? initialPage : 0);

  const hasFilter = useMemo(
    () =>
      !!keyword ||
      !!status ||
      selectedCategoryNames.length > 0 ||
      !!minStartPrice ||
      !!maxStartPrice ||
      !!startFrom ||
      !!startTo,
    [
      keyword,
      status,
      selectedCategoryNames.length,
      minStartPrice,
      maxStartPrice,
      startFrom,
      startTo,
    ]
  );

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const res = await categoryApi.getCategories();
      return res.data as ProductCategory[];
    },
    staleTime: 5 * 60_000,
  });

  // 적용된 검색 조건이 바뀔 때 URL 동기화
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (keyword) newParams.set("keyword", keyword);
    if (status) newParams.set("status", status);
    if (selectedCategoryNames.length > 0) {
      selectedCategoryNames.forEach((name) =>
        newParams.append("categories", name)
      );
    }
    if (minStartPrice) newParams.set("minStartPrice", minStartPrice);
    if (maxStartPrice) newParams.set("maxStartPrice", maxStartPrice);
    if (startFrom) newParams.set("startFrom", startFrom);
    if (startTo) newParams.set("startTo", startTo);

    if (hasFilter) {
      newParams.set("page", String(page));
      newParams.set("size", "8");
      navigate(`/search?${newParams.toString()}`, { replace: true });
    } else {
      navigate("/search", { replace: true });
    }
  }, [
    keyword,
    status,
    selectedCategoryNames,
    minStartPrice,
    maxStartPrice,
    startFrom,
    startTo,
    page,
    navigate,
  ]);

  const searchQuery = useQuery({
    queryKey: queryKeys.search.auctions(
      keyword,
      status,
      selectedCategoryNames.join(","),
      minStartPrice,
      maxStartPrice,
      startFrom,
      startTo,
      page
    ),
    queryFn: async () => {
      const normalizeDateTimeLocal = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
          return `${trimmed}:00`;
        }
        return trimmed;
      };

      const parseOptionalNumber = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const num = Number(trimmed);
        return Number.isFinite(num) ? num : undefined;
      };

      if (!hasFilter) {
        return { totalPages: 0, content: [] as AuctionDocument[] };
      }

      const data = await auctionApi.searchAuctions({
        keyword: keyword || undefined,
        status: status || undefined,
        categories:
          selectedCategoryNames.length > 0 ? selectedCategoryNames : undefined,
        minStartPrice: parseOptionalNumber(minStartPrice),
        maxStartPrice: parseOptionalNumber(maxStartPrice),
        startFrom: normalizeDateTimeLocal(startFrom),
        startTo: normalizeDateTimeLocal(startTo),
        page,
        size: 20,
      });

      return {
        totalPages: data.data.totalPages ?? 0,
        content: data.data.content ?? [],
      };
    },
    enabled: hasFilter,
    staleTime: 30_000,
  });

  const categories = categoriesQuery.data ?? [];
  const categoriesLoading = categoriesQuery.isLoading;
  const result = searchQuery.data ?? { totalPages: 0, content: [] };
  const loading = searchQuery.isLoading;
  const searchErrorMessage = useMemo(() => {
    if (!searchQuery.isError) return null;
    return getErrorMessage(
      searchQuery.error,
      "검색 결과를 불러오는데 실패했습니다."
    );
  }, [searchQuery.error, searchQuery.isError]);

  // 입력 핸들러들 (아직 검색 조건에는 적용하지 않음)
  const handleInputKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputKeyword(e.target.value);
  };

  const handlePendingStatusClick = (value: string) => {
    setPendingStatus((prev) => (prev === value ? "" : value));
  };

  const handlePendingCategoryClick = (name: string) => {
    setPendingCategoryNames((prev) => {
      if (prev.includes(name)) {
        return prev.filter((x) => x !== name);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, name];
    });
  };

  const isCategorySelectionFull = pendingCategoryNames.length >= 3;

  // 검색 버튼 / 폼 제출 시 실제 검색 조건을 적용
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = inputKeyword.trim();
    const hasFilter =
      !!trimmed ||
      !!pendingStatus ||
      pendingCategoryNames.length > 0 ||
      !!pendingMinStartPrice.trim() ||
      !!pendingMaxStartPrice.trim() ||
      !!pendingStartFrom.trim() ||
      !!pendingStartTo.trim();

    if (!hasFilter) {
      // 아무 조건도 없으면 검색하지 않음
      return;
    }

    setKeyword(trimmed);
    setStatus(pendingStatus);
    setSelectedCategoryNames(pendingCategoryNames);
    setMinStartPrice(pendingMinStartPrice.trim());
    setMaxStartPrice(pendingMaxStartPrice.trim());
    setStartFrom(pendingStartFrom.trim());
    setStartTo(pendingStartTo.trim());
    setPage(0);
  };

  const handlePageChange = (
    _: React.ChangeEvent<unknown>,
    value: number
  ): void => {
    setPage(value - 1);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        상품 검색
      </Typography>

      {/* 검색어 + 검색 버튼 */}
      <Box sx={{ mb: 2 }}>
        <form onSubmit={handleSubmit}>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              placeholder="상품명, 설명 등으로 검색해 보세요."
              value={inputKeyword}
              onChange={handleInputKeywordChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              color="primary"
              type="submit"
              sx={{ px: 3, py: 1.25, minWidth: 96 }}
            >
              검색
            </Button>
          </Stack>
        </form>
      </Box>

      {/* 상태 필터 (입력용, 검색 버튼으로 적용) */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip
          label="전체"
          clickable
          color={pendingStatus === "" ? "primary" : "default"}
          onClick={() => handlePendingStatusClick("")}
        />
        <Chip
          label="경매 진행중"
          clickable
          color={
            pendingStatus === AuctionStatus.IN_PROGRESS ? "primary" : "default"
          }
          onClick={() => handlePendingStatusClick(AuctionStatus.IN_PROGRESS)}
        />
        <Chip
          label="경매 대기중"
          clickable
          color={pendingStatus === AuctionStatus.READY ? "primary" : "default"}
          onClick={() => handlePendingStatusClick(AuctionStatus.READY)}
        />
        <Chip
          label="경매 종료"
          clickable
          color={
            pendingStatus === AuctionStatus.COMPLETED ? "primary" : "default"
          }
          onClick={() => handlePendingStatusClick(AuctionStatus.COMPLETED)}
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
        <TextField
          label="시작가 최소"
          type="number"
          value={pendingMinStartPrice}
          onChange={(e) => setPendingMinStartPrice(e.target.value)}
          fullWidth
          slotProps={{ input: { inputProps: { min: 0, step: 100 } } }}
        />
        <TextField
          label="시작가 최대"
          type="number"
          value={pendingMaxStartPrice}
          onChange={(e) => setPendingMaxStartPrice(e.target.value)}
          fullWidth
          slotProps={{ input: { inputProps: { min: 0, step: 100 } } }}
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 3 }}>
        <TextField
          label="시작 시간 From"
          type="datetime-local"
          value={pendingStartFrom}
          onChange={(e) => setPendingStartFrom(e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="시작 시간 To"
          type="datetime-local"
          value={pendingStartTo}
          onChange={(e) => setPendingStartTo(e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      {/* 카테고리 필터 (여러 개 선택 가능, 검색 버튼으로 적용) */}
      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap" }}>
        {categoriesLoading && categories.length === 0
          ? Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton
                key={idx}
                variant="rounded"
                width={80}
                height={32}
                sx={{ borderRadius: 16, mb: 0.5 }}
              />
            ))
          : categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.categoryName}
                clickable
                color={
                  pendingCategoryNames.includes(cat.categoryName)
                    ? "secondary"
                    : "default"
                }
                disabled={
                  isCategorySelectionFull &&
                  !pendingCategoryNames.includes(cat.categoryName)
                }
                onClick={() => handlePendingCategoryClick(cat.categoryName)}
                sx={{ mb: 0.5 }}
              />
            ))}
      </Stack>

      {/* 결과 영역 */}
      {!hasFilter ? (
        <Typography color="text.secondary">
          검색어를 입력하거나 상태/카테고리를 선택한 뒤 검색 버튼을 눌러주세요.
        </Typography>
      ) : searchErrorMessage ? (
        <Typography color="text.secondary">{searchErrorMessage}</Typography>
      ) : loading ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 3,
            mb: 4,
          }}
        >
          {Array.from({ length: 8 }).map((_, idx) => (
            <Card
              key={idx}
              sx={{
                height: 280,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Skeleton variant="rectangular" height={150} />
              <CardContent
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  py: 1.25,
                }}
              >
                <Skeleton variant="text" width="75%" />
                <Skeleton variant="rounded" width="55%" height={28} />
                <Skeleton variant="text" width="55%" />
                <Skeleton variant="text" width="85%" />
                <Box sx={{ mt: "auto", textAlign: "right" }}>
                  <Skeleton variant="text" width="40%" sx={{ ml: "auto" }} />
                  <Skeleton variant="text" width="60%" sx={{ ml: "auto" }} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : result.content.length === 0 ? (
        <Typography color="text.secondary">
          조건에 맞는 상품/경매를 찾지 못했습니다.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 3,
            mb: 4,
          }}
        >
          {result.content.map((doc) => {
            const coverImage = doc.imageUrl || "";
            const emptyImage = "/images/no_image.png";

            return (
              <Card
                key={doc.auctionId}
                sx={{
                  height: 280,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardActionArea
                  component={RouterLink}
                  to={`/products/${doc.productId}`}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  <ImageWithFallback
                    src={coverImage}
                    alt={doc.productName}
                    height={150}
                    loading={loading}
                    emptySrc={emptyImage}
                    sx={{ objectFit: "cover", width: "100%" }}
                    skeletonSx={{ width: "100%" }}
                  />
                  <CardContent
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      py: 1.25,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        mb: 0.5,
                      }}
                    >
                      {doc.productName}
                    </Typography>

                    {(doc.categories?.length ?? 0) > 0 && (
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ mb: 0.75, flexWrap: "wrap" }}
                      >
                        {doc.categories!.slice(0, 2).map((c) => (
                          <Chip
                            key={c}
                            label={c}
                            size="small"
                            variant="outlined"
                            sx={{ mb: 0.5 }}
                          />
                        ))}
                        {doc.categories!.length > 2 && (
                          <Chip
                            label={`+${doc.categories!.length - 2}`}
                            size="small"
                            variant="outlined"
                            sx={{ mb: 0.5 }}
                          />
                        )}
                      </Stack>
                    )}

                    {doc.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          mb: 0.75,
                        }}
                      >
                        {doc.description}
                      </Typography>
                    )}

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      sx={{ mb: 0.25 }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        시작가{" "}
                        {doc.startPrice != null
                          ? formatWon(doc.startPrice)
                          : "-"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        보증금{" "}
                        {doc.depositAmount != null
                          ? formatWon(doc.depositAmount)
                          : "-"}
                      </Typography>
                    </Stack>
                    <Box sx={{ mt: "auto", textAlign: "right" }}>
                      <Typography variant="caption" color="text.secondary">
                        상태: {getAuctionStatusText(doc.status)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {doc.status === AuctionStatus.READY
                          ? `시작시간: ${formatDateTime(doc.auctionStartAt)}`
                          : `종료예정: ${formatDateTime(doc.auctionEndAt)}`}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}

      <Pagination
        count={result.totalPages}
        page={page + 1}
        onChange={handlePageChange}
        sx={{ display: "flex", justifyContent: "center" }}
      />
    </Container>
  );
};

export default SearchPage;
