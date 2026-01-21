import {
  Box,
  CardMedia,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";

interface ProductInfoProps {
  imageUrls?: string[];
  productName: string;
  description: string;
}

const ProductInfo: React.FC<ProductInfoProps> = ({
  imageUrls,
  productName,
  description,
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
    <Stack spacing={3}>
      <Paper sx={{ p: 2 }}>
        <CardMedia
          component="img"
          height="300"
          image={selectedUrl}
          alt={productName}
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
                <Box
                  component="img"
                  src={url}
                  alt={`${productName} 이미지 ${idx + 1}`}
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
      <Paper sx={{ p: 3 }}>
        <Typography
          variant="h5"
          gutterBottom
          noWrap
          textOverflow={"ellipsis"}
          overflow={"hidden"}
          title={productName}
        >
          {productName}
        </Typography>
        <Divider />
        <Typography variant="body1">{description} </Typography>
      </Paper>
    </Stack>
  );
};

export default ProductInfo;
