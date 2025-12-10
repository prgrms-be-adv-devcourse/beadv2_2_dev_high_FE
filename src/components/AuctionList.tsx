import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { auctionApi } from "../apis/auctionApi";
import {
  AuctionStatus,
  type AuctionQueryParams,
  type PagedAuctionResponse,
} from "../types/auction";
import RemainingTime from "./RemainingTime";

export type AuctionSortOption = "ENDING_SOON" | "NEWEST" | "HIGHEST_BID";

interface AuctionListProps extends AuctionQueryParams {
  sortOption?: AuctionSortOption;
}

const AuctionList: React.FC<AuctionListProps> = ({
  status = [AuctionStatus.IN_PROGRESS, AuctionStatus.READY],
  sortOption = "ENDING_SOON",
}) => {
  const [auctionData, setAuctionData] = useState<PagedAuctionResponse | null>(
    null
  );

  // 경매 상태를 사용자 친화적인 텍스트로 변환
  const getAuctionStatusText = (status: AuctionStatus) => {
    switch (status) {
      case "READY":
        return "대기중";
      case "IN_PROGRESS":
        return "진행중";
      case "COMPLETED":
        return "완료";
      case "FAILED":
        return "유찰";
      case "CANCELLED":
        return "취소됨";
    }
  };

  const sortedAuctions = useMemo(() => {
    const content = auctionData?.content ?? [];
    const copied = [...content];

    switch (sortOption) {
      case "HIGHEST_BID":
        return copied.sort((a, b) => {
          const aPrice = a.currentBid ?? a.startBid ?? 0;
          const bPrice = b.currentBid ?? b.startBid ?? 0;
          return bPrice - aPrice;
        });
      case "NEWEST":
        return copied.sort((a, b) => {
          const aCreated = new Date(a.createdAt ?? 0).getTime();
          const bCreated = new Date(b.createdAt ?? 0).getTime();
          return bCreated - aCreated;
        });
      case "ENDING_SOON":
      default:
        return copied.sort((a, b) => {
          const aEnd = new Date(a.auctionEndAt).getTime();
          const bEnd = new Date(b.auctionEndAt).getTime();
          return aEnd - bEnd;
        });
    }
  }, [auctionData, sortOption]);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const params: AuctionQueryParams = {
          page: 0,
          status,
        };
        const response = await auctionApi.getAuctions(params);

        setAuctionData(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchAuctions();
  }, [status]);

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
      {sortedAuctions.map((auction, i) => (
        <Card
          key={auction.id || auction.auctionId || i}
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CardMedia
            component="img"
            height="200"
            image={auction.imageUrl ?? "/images/no_image.png"}
            alt={auction.productName}
          />
          <CardContent
            sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
          >
            <Typography
              gutterBottom
              variant="h6"
              component="h2"
              sx={{
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={auction.productName} // 툴팁으로 전체 이름 표시
            >
              {auction.productName}
            </Typography>
            <Box sx={{ mt: "auto", pt: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: "error.main",
                  fontWeight: 600,
                  textAlign: "right",
                  fontSize: "1.1rem",
                  mb: 0.5,
                }}
              >
                현재가: {Math.max(auction?.currentBid ?? 0).toLocaleString()}원
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  textAlign: "right",
                  display: "block",
                  mb: 0.5,
                }}
              >
                시작가: {auction.startBid?.toLocaleString()}원
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color:
                    auction.status === "IN_PROGRESS"
                      ? "warning.main"
                      : "text.secondary",
                  fontWeight: 500,
                  textAlign: "right",
                  display: "block",
                }}
              >
                <RemainingTime
                  auctionStartAt={auction.auctionStartAt}
                  auctionEndAt={auction.auctionEndAt}
                  status={auction.status}
                />
              </Typography>
            </Box>
          </CardContent>
          <Button
            size="small"
            color="primary"
            component={RouterLink}
            to={`/auctions/${auction.id || auction.auctionId}`}
            sx={{ m: 1 }}
          >
            자세히 보기
          </Button>
        </Card>
      ))}
    </Box>
  );
};

export default AuctionList;
