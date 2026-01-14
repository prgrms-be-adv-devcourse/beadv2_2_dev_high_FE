import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auctionApi } from "@/apis/auctionApi";
import { fileApi } from "@/apis/fileApi";
import {
  type PagedAuctionResponse,
  AuctionStatus,
} from "@moreauction/types";
import type { ApiResponseDto, FileGroup } from "@moreauction/types";
import { formatWon } from "@moreauction/utils";
import { getAuctionStatusText } from "@moreauction/utils";
import RemainingTime from "@/shared/components/RemainingTime";
import { queryKeys } from "@/shared/queries/queryKeys";
import { seedFileGroupCache } from "@/shared/queries/seedFileGroupCache";
import { ImageWithFallback } from "@/shared/components/common/ImageWithFallback";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

interface AuctionListProps {
  status: AuctionStatus[];
  /** 최대 표시 개수 (예: 홈에서는 4개만) */
  limit?: number;
  /**
   * 카드 클릭 시 이동 목적지
   * - auction: 경매 상세
   * - product: 상품 상세
   */
  linkDestination?: "auction" | "product";
  showEmptyState?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

const AuctionList: React.FC<AuctionListProps> = ({
  status,
  limit = 4,
  linkDestination = "auction",
  showEmptyState = false,
  emptyTitle = "표시할 경매가 없습니다",
  emptyDescription = "조건에 맞는 경매가 없어요. 다른 조건을 찾아보세요.",
}) => {
  const statusKey = Array.isArray(status) ? status.join(",") : "";

  const auctionQuery = useQuery({
    queryKey: queryKeys.auctions.list(statusKey, "simple", limit),
    queryFn: async () => {
      const response = await auctionApi.getAuctionsByStatus(status, limit);
      return response.data as PagedAuctionResponse;
    },
    staleTime: 30_000,
  });

  const errorMessage = useMemo(() => {
    if (!auctionQuery.isError) return null;
    return getErrorMessage(
      auctionQuery.error,
      "경매 목록을 불러오는데 실패했습니다."
    );
  }, [auctionQuery.error, auctionQuery.isError]);

  const auctionData = auctionQuery.data ?? null;
  const auctions = auctionData?.content ?? [];
  const showEmpty =
    showEmptyState &&
    !auctionQuery.isLoading &&
    !errorMessage &&
    auctions.length === 0;

  const queryClient = useQueryClient();

  const fileGroupIds = useMemo(() => {
    const ids = auctions
      .map((auction) =>
        auction.productFileGroupId ?? auction.fileGroupId ?? null
      )
      .filter((id): id is string | number => id != null && id !== "")
      .map((id) => String(id));
    return Array.from(new Set(ids));
  }, [auctions]);

  const cachedFileGroups = useMemo(
    () =>
      fileGroupIds
        .map(
          (id) =>
            queryClient.getQueryData<ApiResponseDto<FileGroup>>(
              queryKeys.files.group(id)
            )?.data
        )
        .filter((group): group is FileGroup => !!group),
    [fileGroupIds, queryClient]
  );
  const cachedFileGroupIds = useMemo(
    () => new Set(cachedFileGroups.map((group) => String(group.fileGroupId))),
    [cachedFileGroups]
  );
  const missingFileGroupIds = useMemo(
    () => fileGroupIds.filter((id) => !cachedFileGroupIds.has(id)),
    [cachedFileGroupIds, fileGroupIds]
  );
  const fileGroupsQuery = useQuery({
    queryKey: queryKeys.files.groups(missingFileGroupIds),
    queryFn: async () => {
      const response = await fileApi.getFileGroupsByIds(missingFileGroupIds);
      seedFileGroupCache(queryClient, response);
      return response.data ?? [];
    },
    enabled: missingFileGroupIds.length > 0,
    staleTime: 30_000,
  });

  const fileGroupMap = useMemo(() => {
    const list = [...cachedFileGroups, ...(fileGroupsQuery.data ?? [])];
    return new Map(list.map((group) => [String(group.fileGroupId), group]));
  }, [cachedFileGroups, fileGroupsQuery.data]);
  const isImageLoading = fileGroupsQuery.isLoading;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
          lg: "repeat(4, 1fr)",
        },
        gap: 4,
      }}
    >
      {errorMessage &&
        !auctionQuery.isLoading &&
        (auctionData?.content?.length ?? 0) === 0 && (
          <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>
            {errorMessage}
          </Alert>
        )}

      {showEmpty && (
        <Card
          sx={{
            gridColumn: "1 / -1",
            borderRadius: 3,
            border: "1px dashed",
            borderColor: "divider",
            p: 3,
            textAlign: "center",
            bgcolor: "background.paper",
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {emptyTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {emptyDescription}
            </Typography>
          </CardContent>
        </Card>
      )}

      {auctionQuery.isLoading && (auctionData?.content?.length ?? 0) === 0
        ? Array.from({ length: limit }).map((_, i) => (
            <Card
              key={i}
              sx={{
                minHeight: 320,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                borderRadius: 3,
                boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
              }}
            >
              <Skeleton variant="rectangular" height={210} />
              <CardContent
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  mt: 1,
                }}
              >
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="50%" />
              </CardContent>
            </Card>
          ))
        : auctions.map((auction, i) => {
            const isReady = auction.status === AuctionStatus.READY;
            const currentValue =
              auction.currentBid != null && auction.currentBid > 0
                ? auction.currentBid
                : auction.startBid;
            const displayName = auction.productName ?? "상품명 미확인";
            const fileGroupId =
              auction.productFileGroupId ?? auction.fileGroupId;
            const fileGroup = fileGroupId
              ? fileGroupMap.get(String(fileGroupId))
              : undefined;
            const coverImage = fileGroup?.files?.[0]?.filePath ?? "";
            const hasFileGroupId = !!fileGroupId;
            const emptyImage =
              fileGroupsQuery.isError && hasFileGroupId
                ? "/images/fallback.png"
                : "/images/no_image.png";

            return (
              <Card
                key={auction.id || auction.auctionId || i}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 3,
                  overflow: "hidden",
                  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
                  transition: "transform 200ms ease, box-shadow 200ms ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
                  },
                }}
              >
                <CardActionArea
                  component={RouterLink}
                  to={
                    linkDestination === "product"
                      ? `/products/${auction?.productId}`
                      : `/auctions/${auction.id || auction.auctionId}`
                  }
                  sx={{ display: "flex", flexDirection: "column" }}
                >
                  <Box sx={{ position: "relative", width: "100%" }}>
                    <ImageWithFallback
                      src={coverImage}
                      alt={auction?.productName ?? "경매 이미지"}
                      height={210}
                      loading={isImageLoading}
                      emptySrc={emptyImage}
                      sx={{ objectFit: "cover", width: "100%" }}
                      skeletonSx={{ width: "100%" }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(180deg, rgba(15, 23, 42, 0) 45%, rgba(15, 23, 42, 0.45) 100%)",
                        pointerEvents: "none",
                      }}
                    />
                    <Chip
                      label={getAuctionStatusText(auction.status)}
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
                      flexGrow: 1,
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1.3,
                        minHeight: 42,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                      title={displayName}
                    >
                      {displayName}
                    </Typography>
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
                          {isReady ? "시작가" : "현재가"}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {formatWon(currentValue)}
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
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {auction.depositAmount != null
                            ? formatWon(auction.depositAmount)
                            : "-"}
                        </Typography>
                      </Box>
                    </Stack>
                    {isReady ? (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                          px: 1,
                          py: 0.5,
                          borderRadius: 999,
                          bgcolor: "rgba(15, 23, 42, 0.06)",
                          width: "fit-content",
                        }}
                      >
                        {formatDateTime(auction.auctionStartAt)} 예정
                      </Typography>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                          px: 1,
                          py: 0.5,
                          borderRadius: 999,
                          bgcolor: "rgba(59, 130, 246, 0.12)",
                          color: "text.primary",
                          fontWeight: 700,
                          width: "fit-content",
                        }}
                      >
                        <RemainingTime
                          auctionStartAt={auction.auctionStartAt}
                          auctionEndAt={auction.auctionEndAt}
                          status={auction.status}
                        />
                        남음
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
    </Box>
  );
};

export default AuctionList;
const formatDateTime = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};
