import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  CircularProgress,
  Divider,
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
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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

  const readSearchParams = (search: string) => {
    const params = new URLSearchParams(search);
    return {
      keyword: params.get("keyword") ?? "",
      status: params.get("status") ?? "",
      categories: params.getAll("categories"),
      minStartPrice: params.get("minStartPrice") ?? "",
      maxStartPrice: params.get("maxStartPrice") ?? "",
      startFrom: params.get("startFrom") ?? "",
      startTo: params.get("startTo") ?? "",
      page: Number(params.get("page") ?? 0),
    };
  };

  // URL 쿼리에서 초기 검색 조건 읽기
  const initialParams = readSearchParams(location.search);
  const initialKeyword = initialParams.keyword;
  const initialStatus = initialParams.status;
  const initialCategoryNames = initialParams.categories;
  const initialMinStartPrice = initialParams.minStartPrice;
  const initialMaxStartPrice = initialParams.maxStartPrice;
  const initialStartFrom = initialParams.startFrom;
  const initialStartTo = initialParams.startTo;
  const initialPage = initialParams.page;

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

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const res = await categoryApi.getCategories();
      return res.data as ProductCategory[];
    },
    staleTime: 5 * 60_000,
  });

  const buildSearchUrl = (next: {
    keyword: string;
    status: string;
    categories: string[];
    minStartPrice: string;
    maxStartPrice: string;
    startFrom: string;
    startTo: string;
    page: number;
  }) => {
    const newParams = new URLSearchParams();
    if (next.keyword) newParams.set("keyword", next.keyword);
    if (next.status) newParams.set("status", next.status);
    if (next.categories.length > 0) {
      next.categories.forEach((name) => newParams.append("categories", name));
    }
    if (next.minStartPrice) newParams.set("minStartPrice", next.minStartPrice);
    if (next.maxStartPrice) newParams.set("maxStartPrice", next.maxStartPrice);
    if (next.startFrom) newParams.set("startFrom", next.startFrom);
    if (next.startTo) newParams.set("startTo", next.startTo);
    newParams.set("page", String(next.page));
    newParams.set("size", "20");
    const search = newParams.toString();
    return `/search${search ? `?${search}` : ""}`;
  };

  const navigateToSearch = (next: {
    keyword: string;
    status: string;
    categories: string[];
    minStartPrice: string;
    maxStartPrice: string;
    startFrom: string;
    startTo: string;
    page: number;
  }) => {
    const nextPath = buildSearchUrl(next);
    if (`${location.pathname}${location.search}` !== nextPath) {
      navigate(nextPath);
    }
  };

  // URL 쿼리 변경 시 상태 동기화 (뒤로가기/앞으로가기 대응)
  useEffect(() => {
    const nextParams = readSearchParams(location.search);
    setInputKeyword(nextParams.keyword);
    setPendingStatus(nextParams.status);
    setPendingCategoryNames(nextParams.categories);
    setPendingMinStartPrice(nextParams.minStartPrice);
    setPendingMaxStartPrice(nextParams.maxStartPrice);
    setPendingStartFrom(nextParams.startFrom);
    setPendingStartTo(nextParams.startTo);
    setKeyword(nextParams.keyword);
    setStatus(nextParams.status);
    setSelectedCategoryNames(nextParams.categories);
    setMinStartPrice(nextParams.minStartPrice);
    setMaxStartPrice(nextParams.maxStartPrice);
    setStartFrom(nextParams.startFrom);
    setStartTo(nextParams.startTo);
    setPage(nextParams.page >= 0 ? nextParams.page : 0);
  }, [location.search]);

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
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const categories = categoriesQuery.data ?? [];
  const categoriesLoading = categoriesQuery.isLoading;
  const result = searchQuery.data ?? { totalPages: 0, content: [] };
  const loading = searchQuery.isLoading && result.content.length === 0;
  const isFetching = searchQuery.isFetching;
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const searchErrorMessage = useMemo(() => {
    if (!searchQuery.isError) return null;
    return getErrorMessage(
      searchQuery.error,
      "검색 결과를 불러오는데 실패했습니다."
    );
  }, [searchQuery.error, searchQuery.isError]);

  useEffect(() => {
    let timer: number | undefined;
    if (isFetching) {
      timer = window.setTimeout(() => {
        setShowLoadingOverlay(true);
      }, 200);
    } else {
      setShowLoadingOverlay(false);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isFetching]);

  // 입력 핸들러들 (아직 검색 조건에는 적용하지 않음)
  const handleInputKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputKeyword(e.target.value);
  };

  const handlePendingStatusClick = (value: string) => {
    setPendingStatus((prev) => {
      const next = prev === value ? "" : value;
      setStatus(next);
      setPage(0);
      navigateToSearch({
        keyword,
        status: next,
        categories: selectedCategoryNames,
        minStartPrice,
        maxStartPrice,
        startFrom,
        startTo,
        page: 0,
      });
      return next;
    });
  };

  const handlePendingCategoryClick = (name: string) => {
    setPendingCategoryNames((prev) => {
      let next = prev;
      if (prev.includes(name)) {
        next = prev.filter((x) => x !== name);
      } else if (prev.length < 3) {
        next = [...prev, name];
      }
      setSelectedCategoryNames(next);
      setPage(0);
      navigateToSearch({
        keyword,
        status,
        categories: next,
        minStartPrice,
        maxStartPrice,
        startFrom,
        startTo,
        page: 0,
      });
      return next;
    });
  };

  const isCategorySelectionFull = pendingCategoryNames.length >= 3;

  // 검색 버튼 / 폼 제출 시 실제 검색 조건을 적용
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = inputKeyword.trim();

    setKeyword(trimmed);
    setStatus(pendingStatus);
    setSelectedCategoryNames(pendingCategoryNames);
    setMinStartPrice(pendingMinStartPrice.trim());
    setMaxStartPrice(pendingMaxStartPrice.trim());
    setStartFrom(pendingStartFrom.trim());
    setStartTo(pendingStartTo.trim());
    setPage(0);
    navigateToSearch({
      keyword: trimmed,
      status: pendingStatus,
      categories: pendingCategoryNames,
      minStartPrice: pendingMinStartPrice.trim(),
      maxStartPrice: pendingMaxStartPrice.trim(),
      startFrom: pendingStartFrom.trim(),
      startTo: pendingStartTo.trim(),
      page: 0,
    });
  };

  const handleReset = () => {
    setInputKeyword("");
    setPendingStatus("");
    setPendingCategoryNames([]);
    setPendingMinStartPrice("");
    setPendingMaxStartPrice("");
    setPendingStartFrom("");
    setPendingStartTo("");
    setKeyword("");
    setStatus("");
    setSelectedCategoryNames([]);
    setMinStartPrice("");
    setMaxStartPrice("");
    setStartFrom("");
    setStartTo("");
    setPage(0);
    navigateToSearch({
      keyword: "",
      status: "",
      categories: [],
      minStartPrice: "",
      maxStartPrice: "",
      startFrom: "",
      startTo: "",
      page: 0,
    });
  };

  const handlePageChange = (
    _: React.ChangeEvent<unknown>,
    value: number
  ): void => {
    const nextPage = value - 1;
    setPage(nextPage);
    navigateToSearch({
      keyword,
      status,
      categories: selectedCategoryNames,
      minStartPrice,
      maxStartPrice,
      startFrom,
      startTo,
      page: nextPage,
    });
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
            <Button
              variant="outlined"
              color="primary"
              onClick={handleReset}
              sx={{ px: 3, py: 1.25, minWidth: 96 }}
            >
              초기화
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
          onChange={(e) => {
            const value = e.target.value;
            setPendingMinStartPrice(value);
            setMinStartPrice(value);
            setPage(0);
            navigateToSearch({
              keyword,
              status,
              categories: selectedCategoryNames,
              minStartPrice: value,
              maxStartPrice,
              startFrom,
              startTo,
              page: 0,
            });
          }}
          fullWidth
          slotProps={{ input: { inputProps: { min: 0, step: 100 } } }}
        />
        <TextField
          label="시작가 최대"
          type="number"
          value={pendingMaxStartPrice}
          onChange={(e) => {
            const value = e.target.value;
            setPendingMaxStartPrice(value);
            setMaxStartPrice(value);
            setPage(0);
            navigateToSearch({
              keyword,
              status,
              categories: selectedCategoryNames,
              minStartPrice,
              maxStartPrice: value,
              startFrom,
              startTo,
              page: 0,
            });
          }}
          fullWidth
          slotProps={{ input: { inputProps: { min: 0, step: 100 } } }}
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 3 }}>
        <TextField
          label="시작 시간 From"
          type="datetime-local"
          value={pendingStartFrom}
          onChange={(e) => {
            const value = e.target.value;
            setPendingStartFrom(value);
            setStartFrom(value);
            setPage(0);
            navigateToSearch({
              keyword,
              status,
              categories: selectedCategoryNames,
              minStartPrice,
              maxStartPrice,
              startFrom: value,
              startTo,
              page: 0,
            });
          }}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="시작 시간 To"
          type="datetime-local"
          value={pendingStartTo}
          onChange={(e) => {
            const value = e.target.value;
            setPendingStartTo(value);
            setStartTo(value);
            setPage(0);
            navigateToSearch({
              keyword,
              status,
              categories: selectedCategoryNames,
              minStartPrice,
              maxStartPrice,
              startFrom,
              startTo: value,
              page: 0,
            });
          }}
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
      {searchErrorMessage ? (
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
            opacity: isFetching ? 0.6 : 1,
            transition: "opacity 150ms ease",
            pointerEvents: isFetching ? "none" : "auto",
          }}
        >
          {Array.from({ length: 8 }).map((_, idx) => (
            <Card
              key={idx}
              sx={{
                minHeight: 320,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Skeleton variant="rectangular" height={200} />
              <CardContent
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  py: 1.5,
                  gap: 1,
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
        <Box sx={{ position: "relative", mb: 4 }}>
          {showLoadingOverlay && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "rgba(15, 23, 42, 0.18)",
                backdropFilter: "blur(2px)",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress color="inherit" sx={{ color: "#fff" }} />
            </Box>
          )}
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
            }}
          >
            {result.content.map((doc, index) => {
              const coverImage = doc.imageUrl || "";
              const emptyImage = "/images/no_image.png";
              const cardKey =
                doc.auctionId ??
                doc.productId ??
                `${doc.productName ?? "auction"}-${index}`;

              return (
                <Card
                  key={cardKey}
                  sx={{
                    minHeight: 320,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 3,
                    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <CardActionArea
                    component={RouterLink}
                    to={`/products/${doc.productId}`}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      alignItems: "stretch",
                    }}
                  >
                    <Box sx={{ position: "relative" }}>
                      <ImageWithFallback
                        src={coverImage}
                        alt={doc.productName}
                        height={200}
                        loading={loading}
                        emptySrc={emptyImage}
                        sx={{ objectFit: "cover", width: "100%" }}
                        skeletonSx={{ width: "100%" }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg, rgba(15, 23, 42, 0) 40%, rgba(15, 23, 42, 0.45) 100%)",
                          pointerEvents: "none",
                        }}
                      />
                    <Chip
                      label={getAuctionStatusText(doc.status)}
                      size="small"
                      sx={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        fontWeight: 700,
                        border: "1px solid",
                        borderColor: (theme) =>
                          theme.palette.mode === "light"
                            ? "rgba(15, 23, 42, 0.12)"
                            : "rgba(148, 163, 184, 0.35)",
                        bgcolor: (theme) =>
                          theme.palette.mode === "light"
                            ? "rgba(255, 255, 255, 0.92)"
                            : "rgba(15, 23, 42, 0.8)",
                        color: (theme) =>
                          theme.palette.mode === "light"
                            ? "text.primary"
                            : "rgba(248, 250, 252, 0.95)",
                        backdropFilter: "blur(6px)",
                        boxShadow: (theme) =>
                          theme.palette.mode === "light"
                            ? "0 6px 16px rgba(15, 23, 42, 0.12)"
                            : "0 6px 16px rgba(0, 0, 0, 0.35)",
                      }}
                    />
                    </Box>
                    <CardContent
                      sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        py: 1.5,
                        gap: 1,
                        alignItems: "stretch",
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 600,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {doc.productName}
                      </Typography>

                    <Box sx={{ minHeight: 36 }}>
                      {(doc.categories?.length ?? 0) > 0 ? (
                        <Stack
                          direction="row"
                          spacing={0.75}
                          sx={{ mb: 0.75, flexWrap: "wrap" }}
                        >
                          {doc.categories!.slice(0, 2).map((c, idx) => (
                            <Chip
                              key={`${c}-${idx}`}
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
                      ) : (
                        <Chip
                          label="카테고리 없음"
                          size="small"
                          variant="outlined"
                          sx={{
                            mb: 0.5,
                            color: "text.secondary",
                            borderStyle: "dashed",
                          }}
                        />
                      )}
                    </Box>

                    <Stack direction="row" spacing={1}>
                      <Box
                        sx={{
                          flex: 1,
                          borderRadius: 2,
                          bgcolor: "rgba(15, 23, 42, 0.04)",
                          px: 1,
                          py: 0.75,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          시작가
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {doc.startPrice != null
                            ? formatWon(doc.startPrice)
                            : "-"}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          flex: 1,
                          borderRadius: 2,
                          bgcolor: "rgba(15, 23, 42, 0.04)",
                          px: 1,
                          py: 0.75,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          보증금
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {doc.depositAmount != null
                            ? formatWon(doc.depositAmount)
                            : "-"}
                        </Typography>
                      </Box>
                    </Stack>
                    <Divider sx={{ my: 0.5 }} />
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ mt: "auto" }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {doc.status === AuctionStatus.READY
                          ? `시작 ${formatDateTime(doc.auctionStartAt)}`
                          : `종료 ${formatDateTime(doc.auctionEndAt)}`}
                      </Typography>
                    </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}

      <Pagination
        count={Math.max(result.totalPages, 1)}
        page={page + 1}
        onChange={handlePageChange}
        disabled={result.totalPages === 0}
        sx={{ display: "flex", justifyContent: "center" }}
      />
    </Container>
  );
};

export default SearchPage;
