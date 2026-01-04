import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auctionApi } from "../apis/auctionApi";
import { productApi } from "../apis/productApi";
import { wishlistApi } from "../apis/wishlistApi";
import { ProductStatus, type Product } from "../types/product";
import { AuctionStatus, type Auction } from "../types/auction";
import { useAuth } from "../contexts/AuthContext";
import RemainingTime from "../components/RemainingTime";
import { getAuctionStatusText } from "../utils/statusText";
import { getProductImageUrls } from "../utils/images";
import { formatWon } from "../utils/money";

const ProductDetail: React.FC = () => {
  const { id: productId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isWish, setIsWish] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const wishActionSeqRef = useRef(0);
  const wishInFlightRef = useRef(false);
  const wishDesiredRef = useRef(false);
  const wishServerRef = useRef(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletingAuctionId, setDeletingAuctionId] = useState<string | null>(
    null
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const deletableAuctionStatuses: AuctionStatus[] = [
    AuctionStatus.READY,
    AuctionStatus.FAILED,
    AuctionStatus.CANCELLED,
  ];
  const deletableProductStatuses: ProductStatus[] = [
    ProductStatus.READY,
    ProductStatus.FAILED,
    ProductStatus.CANCELLED,
  ];

  const productQuery = useQuery({
    queryKey: ["products", "detail", productId],
    queryFn: async () => {
      if (!productId) {
        throw new Error("Product ID is missing.");
      }
      const productResponse = await productApi.getProductById(productId);
      return productResponse.data;
    },
    enabled: !!productId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!productQuery.data) return;
    const { auctions = [], product } = productQuery.data;
    setProduct(product);
    setAuctions(Array.isArray(auctions) ? auctions : []);
  }, [productQuery.data]);

  useEffect(() => {
    if (!productId) {
      setError("Product ID is missing.");
      return;
    }
    if (productQuery.isError) {
      const err: any = productQuery.error;
      setError(
        err?.data?.message ??
          err?.message ??
          "Failed to load product details or auctions."
      );
    } else {
      setError(null);
    }
  }, [productId, productQuery.error, productQuery.isError]);

  interface GalleryItem {
    key: string;
    url: string;
    label: string;
    isPlaceholder?: boolean;
  }

  const galleryItems = useMemo<GalleryItem[]>(() => {
    const fileItems =
      product?.fileGroup?.files
        ?.map((file, idx) => {
          if (!file.filePath) return null;
          return {
            key: file.id ?? `file-${idx}`,
            url: file.filePath,
            label: file.fileName ?? `이미지 ${idx + 1}`,
          };
        })
        .filter((item): item is GalleryItem => !!item) ?? [];

    if (fileItems.length > 0) {
      return fileItems;
    }

    const fallback = getProductImageUrls(product).map((url, idx) => ({
      key: `image-${idx}`,
      url,
      label: `이미지 ${idx + 1}`,
    }));

    if (fallback.length > 0) {
      return fallback;
    }

    return [
      {
        key: "placeholder",
        url: "/images/no_image.png",
        label: "이미지 없음",
        isPlaceholder: true,
      },
    ];
  }, [product]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  const activeAuction = useMemo(
    () =>
      auctions.find((a) => a.status === AuctionStatus.IN_PROGRESS) ||
      auctions.find((a) => a.status === AuctionStatus.READY) ||
      auctions.find((a) => a.status === AuctionStatus.COMPLETED),
    [auctions]
  );

  // 이전 경매 이력(종료/유찰/취소 등)만 별도로 보여줌
  const otherAuctions = useMemo(
    () =>
      auctions.filter(
        (a) =>
          a !== activeAuction &&
          a.status !== AuctionStatus.IN_PROGRESS &&
          a.status !== AuctionStatus.READY
      ),
    [auctions, activeAuction]
  );

  const isOwner =
    !!user?.userId && !!product?.sellerId && user.userId === product.sellerId;

  const hasPendingAuction = auctions.some(
    (auction) => auction.status === AuctionStatus.READY
  );

  const canEditProduct =
    !!activeAuction &&
    activeAuction.status === AuctionStatus.READY &&
    isOwner;

  const canReregisterAuction =
    ((!activeAuction && auctions.length > 0) || auctions.length === 0) &&
    isOwner;

  const canDeleteProduct = !!(
    isOwner &&
    product &&
    deletableProductStatuses.includes(product.status) &&
    !hasPendingAuction
  );

  const heroImage =
    galleryItems[activeImageIndex]?.url ?? "/images/no_image.png";

  const isAuctionDeletable = (auction?: Auction | null) =>
    !!(
      auction &&
      isOwner &&
      deletableAuctionStatuses.includes(auction.status)
    );

  const getAuctionKey = (auction: Auction) =>
    auction.auctionId ?? auction.id ?? "";

  const handleDeleteProduct = async () => {
    if (!product) {
      alert("상품 정보를 찾을 수 없습니다.");
      return;
    }
    if (hasPendingAuction) {
      alert("대기 중인 경매를 먼저 삭제한 뒤 상품을 삭제할 수 있습니다.");
      return;
    }
    const sellerIdForDeletion = product.sellerId ?? user?.userId;
    if (!sellerIdForDeletion) {
      alert("상품 삭제 권한이 없습니다.");
      return;
    }
    if (
      !window.confirm(
        "상품을 삭제하시겠습니까? 해당 작업은 되돌릴 수 없습니다."
      )
    ) {
      return;
    }
    try {
      setDeleteLoading(true);
      await productApi.deleteProduct(product.id, sellerIdForDeletion);
      alert("상품이 삭제되었습니다.");
      navigate("/products");
    } catch (err: any) {
      console.error("상품 삭제 실패:", err);
      alert(err?.response?.data?.message ?? "상품 삭제에 실패했습니다.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAuction = async (auction: Auction) => {
    const auctionKey = getAuctionKey(auction);
    if (!auctionKey) return;
    if (!isAuctionDeletable(auction)) {
      alert("해당 경매를 삭제할 권한이 없습니다.");
      return;
    }
    if (
      !window.confirm(
        "경매를 삭제하시겠습니까? 삭제된 경매는 복구할 수 없습니다."
      )
    ) {
      return;
    }
    try {
      setDeletingAuctionId(auctionKey);
      await auctionApi.removeAuction(auctionKey);
      alert("경매가 삭제되었습니다.");
      setAuctions((prev) =>
        prev.filter((item) => getAuctionKey(item) !== auctionKey)
      );
    } catch (err: any) {
      console.error("경매 삭제 실패:", err);
      alert(err?.response?.data?.message ?? "경매 삭제에 실패했습니다.");
    } finally {
      setDeletingAuctionId(null);
    }
  };

  useEffect(() => {
    const fetchWishlistStatus = async () => {
      if (!productId) return;
      if (!user) {
        setIsWish(false);
        wishDesiredRef.current = false;
        wishServerRef.current = false;
        return;
      }
      try {
        const seqAtStart = wishActionSeqRef.current;
        const res = await wishlistApi.getMyWishlist({
          page: 0,
          size: 100,
        });
        const items = res.data?.content ?? [];
        const exists = items.some((item) => item.productId === productId);
        if (wishActionSeqRef.current !== seqAtStart) return;
        setIsWish(exists);
        wishDesiredRef.current = exists;
        wishServerRef.current = exists;
      } catch (e) {
        console.error("찜 상태 조회 실패:", e);
      }
    };
    fetchWishlistStatus();
  }, [productId, user]);

  if (productQuery.isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={4}
            alignItems="flex-start"
          >
            {/* 상품 카드 스켈레톤 */}
            <Box flex={{ xs: "1 1 auto", md: "0 0 40%" }}>
              <Card>
                <Skeleton variant="rectangular" height={260} />
                <CardContent>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="90%" />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Box>

            {/* 경매 영역 스켈레톤 */}
            <Box flex={1}>
              <Stack spacing={3}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="50%" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="30%" />
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="75%" />
                    <Skeleton variant="text" width="65%" />
                  </CardContent>
                </Card>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography>상품을 찾을 수 없습니다.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
          mb={3}
        >
          <Typography variant="h4">상품 상세</Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: { xs: "flex-start", md: "flex-end" },
              gap: 1,
              maxWidth: { xs: "100%", md: "auto" },
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {isOwner && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDeleteProduct}
                  disabled={deleteLoading || !canDeleteProduct}
                >
                  {deleteLoading
                    ? "삭제 중..."
                    : hasPendingAuction
                    ? "상품 삭제 (대기 경매 존재)"
                    : "상품 삭제"}
                </Button>
              )}
              {canEditProduct && (
                <Button
                  variant="outlined"
                  color="secondary"
                  component={RouterLink}
                  to={`/products/${product.id}/edit`}
                >
                  상품 / 경매 수정
                </Button>
              )}
            </Stack>
            {hasPendingAuction && isOwner && (
              <Typography
                variant="body2"
                color="warning.main"
                sx={{ textAlign: { xs: "left", md: "right" } }}
              >
                대기 중인 경매를 먼저 삭제해야 상품을 삭제할 수 있습니다.
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={4}
          alignItems="flex-start"
        >
          {/* 상품 기본 정보 */}
          <Box flex={{ xs: "1 1 auto", md: "0 0 40%" }}>
            <Card>
              <CardMedia
                component="img"
                height="260"
                image={heroImage}
                alt={product.name}
                sx={{
                  objectFit: "contain",
                  backgroundColor: "grey.50",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              />
              {galleryItems.length > 1 && (
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ px: 2, py: 1 }}
                >
                  {galleryItems.map((item, idx) => {
                    const isActive = idx === activeImageIndex;
                    return (
                      <ButtonBase
                        key={item.key}
                        onClick={() => setActiveImageIndex(idx)}
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 1,
                          overflow: "hidden",
                          border: "2px solid",
                          borderColor: isActive
                            ? "primary.main"
                            : "transparent",
                          boxShadow: isActive ? 2 : 0,
                        }}
                      >
                        <Box
                          component="img"
                          src={item.url}
                          alt={item.label}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </ButtonBase>
                    );
                  })}
                </Stack>
              )}

              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Typography variant="h5" gutterBottom noWrap>
                    {product.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={async () => {
                      if (!user) {
                        alert("로그인 후 찜하기를 사용할 수 있습니다.");
                        navigate("/login");
                        return;
                      }
                      if (!product) return;

                      // Optimistic: disable 없이 즉시 UI 반영 + 연타 시 마지막 의도만 서버에 반영
                      wishActionSeqRef.current += 1;
                      const seqAtClick = wishActionSeqRef.current;

                      const nextDesired = !wishDesiredRef.current;
                      wishDesiredRef.current = nextDesired;
                      setIsWish(nextDesired);

                      if (wishInFlightRef.current) return;
                      wishInFlightRef.current = true;
                      setWishLoading(true);

                      try {
                        while (wishServerRef.current !== wishDesiredRef.current) {
                          const target = wishDesiredRef.current;
                          if (target) {
                            await wishlistApi.add(product.id);
                          } else {
                            await wishlistApi.remove(product.id);
                          }
                          wishServerRef.current = target;
                        }
                      } catch (err: any) {
                        console.error("찜 토글 실패:", err);
                        if (wishActionSeqRef.current === seqAtClick) {
                          wishDesiredRef.current = wishServerRef.current;
                          setIsWish(wishServerRef.current);
                        }
                        alert(
                          err?.response?.data?.message ??
                            "찜하기 처리 중 오류가 발생했습니다."
                        );
                      } finally {
                        wishInFlightRef.current = false;
                        if (wishActionSeqRef.current === seqAtClick) {
                          setWishLoading(false);
                        }
                      }
                    }}
                  >
                    {isWish ? (
                      <FavoriteIcon color="error" fontSize="small" />
                    ) : (
                      <FavoriteBorderIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2, whiteSpace: "pre-line" }}
                >
                  {product.description || "설명 없음"}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* 경매 영역 */}
          <Box flex={1}>
            <Stack spacing={3}>
              <Card>
                <CardContent>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={2}
                    mb={2}
                  >
                    <Typography variant="h6">
                      {activeAuction
                        ? activeAuction.status === AuctionStatus.IN_PROGRESS
                          ? "진행 중인 경매"
                          : activeAuction.status === AuctionStatus.READY
                          ? "예정된 경매"
                          : "최근 경매"
                        : "진행 중인 경매 없음"}
                    </Typography>
                    {activeAuction && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={getAuctionStatusText(activeAuction.status)}
                          color={
                            activeAuction.status === AuctionStatus.IN_PROGRESS
                              ? "success"
                              : "default"
                          }
                          size="small"
                        />
                        {isAuctionDeletable(activeAuction) && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeleteAuction(activeAuction)}
                            disabled={
                              deletingAuctionId === getAuctionKey(activeAuction)
                            }
                          >
                            {deletingAuctionId === getAuctionKey(activeAuction)
                              ? "삭제 중..."
                              : "경매 삭제"}
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Stack>

                  {activeAuction ? (
                    <>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        시작가: {formatWon(activeAuction.startBid)}
                      </Typography>
                      {activeAuction.status === AuctionStatus.READY ? null : (
                        <>
                          <Typography
                            variant="h4"
                            fontWeight="bold"
                            sx={{ mb: 1 }}
                          >
                            최고입찰가:{" "}
                            {(activeAuction.currentBid ?? 0) > 0
                              ? formatWon(activeAuction.currentBid)
                              : "-"}
                          </Typography>
                          {(activeAuction.currentBid ?? 0) <= 0 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              아직 입찰이 없습니다. 첫 입찰은 시작가 이상 부터
                              가능합니다.
                            </Typography>
                          )}
                        </>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        남은 시간:{" "}
                        <RemainingTime
                          auctionStartAt={activeAuction.auctionStartAt}
                          auctionEndAt={activeAuction.auctionEndAt}
                          status={activeAuction.status}
                        />
                      </Typography>
                      <Box sx={{ mt: 2, textAlign: "right" }}>
                        <Button
                          variant="contained"
                          color="primary"
                          component={RouterLink}
                          to={`/auctions/${
                            activeAuction.auctionId ?? activeAuction.id
                          }`}
                        >
                          {activeAuction.status === AuctionStatus.IN_PROGRESS
                            ? "경매 참여하기"
                            : activeAuction.status === AuctionStatus.READY
                            ? "경매 상세보기"
                            : "경매 결과 보기"}
                        </Button>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        이 상품에 진행 중인 경매가 없습니다.
                      </Typography>
                      {canReregisterAuction && (
                        <Box sx={{ mt: 2, textAlign: "right" }}>
                          <Button
                            variant="contained"
                            color="primary"
                            component={RouterLink}
                            to={`/auctions/re-register/${product.id}`}
                          >
                            {auctions.length === 0
                              ? "경매 등록"
                              : "경매 재등록"}
                          </Button>
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  다른 경매 이력
                </Typography>
                {auctions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    연관된 경매가 없습니다.
                  </Typography>
                ) : otherAuctions.length === 0 && activeAuction ? (
                  <Typography variant="body2" color="text.secondary">
                    이외의 경매 이력이 없습니다.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {otherAuctions.map((auction) => (
                      <Card
                        key={auction.auctionId ?? auction.id}
                        variant="outlined"
                      >
                        <CardContent>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={1}
                          >
                            <Typography variant="subtitle2">
                              {getAuctionStatusText(auction.status)}
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {formatWon(
                                  Math.max(auction.currentBid ?? 0, auction.startBid)
                                )}
                              </Typography>
                              {isAuctionDeletable(auction) && (
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteAuction(auction)}
                                  disabled={
                                    deletingAuctionId === getAuctionKey(auction)
                                  }
                                >
                                  {deletingAuctionId === getAuctionKey(auction)
                                    ? "삭제 중..."
                                    : "삭제"}
                                </Button>
                              )}
                            </Stack>
                          </Stack>
                          <Button
                            size="small"
                            component={RouterLink}
                            to={`/auctions/${auction.auctionId ?? auction.id}`}
                          >
                            상세 보기
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Container>
  );
};

export default ProductDetail;
