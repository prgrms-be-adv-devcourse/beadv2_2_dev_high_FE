import { CardMedia, Skeleton } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useEffect, useState } from "react";

type ImageStatus = "loading" | "loaded" | "error";

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  height?: number | string;
  width?: number | string;
  sx?: SxProps<Theme>;
  skeletonSx?: SxProps<Theme>;
  emptySrc?: string;
  fallbackSrc?: string;
  loading?: boolean;
}

const defaultEmpty = "/images/no_image.png";
const defaultFallback = "/images/fallback.png";

export const ImageWithFallback = ({
  src,
  alt,
  height,
  width,
  sx,
  skeletonSx,
  emptySrc = defaultEmpty,
  fallbackSrc = defaultFallback,
  loading = false,
}: ImageWithFallbackProps) => {
  const trimmedSrc = src?.trim();
  const resolvedSrc = trimmedSrc && trimmedSrc.length > 0 ? trimmedSrc : "";

  const [status, setStatus] = useState<ImageStatus>(
    resolvedSrc ? "loading" : "loaded"
  );

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!resolvedSrc) {
      setStatus("loaded");
      return;
    }
    let active = true;
    setStatus("loading");
    const img = new Image();
    img.onload = () => {
      if (active) setStatus("loaded");
    };
    img.onerror = () => {
      if (active) setStatus("error");
    };
    img.src = resolvedSrc;
    return () => {
      active = false;
    };
  }, [loading, resolvedSrc]);

  const imageSrc =
    status === "error" ? fallbackSrc : resolvedSrc || emptySrc;

  if (loading || status === "loading") {
    return (
      <Skeleton
        variant="rectangular"
        height={height}
        width={width}
        sx={skeletonSx}
      />
    );
  }

  return (
    <CardMedia
      component="img"
      height={height}
      image={imageSrc}
      alt={alt}
      sx={sx}
      onLoad={() =>
        setStatus((prevStatus) => (prevStatus === "error" ? prevStatus : "loaded"))
      }
      onError={() => setStatus("error")}
    />
  );
};
