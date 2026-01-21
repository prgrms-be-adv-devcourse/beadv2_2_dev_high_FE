import {
  Box,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import { ImageWithFallback } from "@/shared/components/common/ImageWithFallback";

interface ProductInfoProps {
  imageUrls?: string[];
  productName: string;
  sellerLabel?: string;
  description: string;
  action?: React.ReactNode;
}

const ProductInfo: React.FC<ProductInfoProps> = ({
  imageUrls,
  productName,
  sellerLabel,
  description,
  action,
}) => {
  const urls = useMemo(() => {
    const list = (imageUrls ?? []).filter(
      (u) => typeof u === "string" && u.trim().length > 0
    );
    return list.length > 0 ? list : ["/images/no_image.png"];
  }, [imageUrls]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedUrl = urls[Math.min(selectedIndex, urls.length - 1)];

  return (
    <Stack spacing={3} sx={{ flex: 1, minHeight: 0 }}>
      <Paper sx={{ p: 2 }}>
        <ImageWithFallback
          src={selectedUrl}
          alt={productName}
          height={300}
          sx={{ borderRadius: 2, objectFit: "contain" }}
        />
        {urls.length > 1 && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              mt: 1.5,
              overflowX: "auto",
              pb: 0.5,
            }}
          >
            {urls.map((url, idx) => (
              <Box
                key={`${url}-${idx}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedIndex(idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedIndex(idx);
                }}
                sx={{
                  flex: "0 0 auto",
                  width: 64,
                  height: 64,
                  borderRadius: 1.5,
                  overflow: "hidden",
                  border: "2px solid",
                  borderColor:
                    idx === selectedIndex ? "primary.main" : "divider",
                  cursor: "pointer",
                }}
              >
                <ImageWithFallback
                  src={url}
                  alt={`${productName} 이미지 ${idx + 1}`}
                  height={64}
                  width={64}
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
        )}
      </Paper>
      <Paper
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 240,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1 }}
        >
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h5"
              noWrap
              textOverflow={"ellipsis"}
              overflow={"hidden"}
              title={productName}
            >
              {productName}
            </Typography>
            {sellerLabel && (
              <Typography variant="caption" color="text.secondary">
                판매자: {sellerLabel}
              </Typography>
            )}
          </Stack>
          {action}
        </Stack>
        <Divider />
        <Typography
          variant="body1"
          sx={{
            mt: 1.5,
            whiteSpace: "pre-line",
            flex: 1,
            overflow: "auto",
            pr: 0.5,
          }}
        >
          {description}
        </Typography>
      </Paper>
    </Stack>
  );
};

export default ProductInfo;
