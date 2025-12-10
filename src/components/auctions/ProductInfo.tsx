import { CardMedia, Divider, Paper, Stack, Typography } from "@mui/material";

interface ProductInfoProps {
  imageUrl?: string;
  productName: string;
  description: string;
}

const ProductInfo: React.FC<ProductInfoProps> = ({
  imageUrl,
  productName,
  description,
}) => {
  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 2 }}>
        <CardMedia
          component="img"
          height="300"
          image={imageUrl || "/images/no_image.png"}
          alt={productName}
          sx={{ borderRadius: 2, objectFit: "contain" }}
        />
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
