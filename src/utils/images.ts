import type { FileGroup } from "../types/common";
import type { ProductImage } from "../types/product";

type ImageCarrier =
  | {
      imageUrl?: string | null;
      images?: ProductImage[] | null;
      fileGroup?: FileGroup | null;
    }
  | null
  | undefined;

const pickImageUrl = (image?: ProductImage | null): string | undefined => {
  if (!image) return undefined;
  return (
    image.thumbnailUrl ||
    image.url ||
    image.fileUrl ||
    image.imageUrl ||
    image.path
  )?.toString();
};

export const getProductImageUrls = (target?: ImageCarrier): string[] => {
  if (!target) return [];
  const urlsFromGroup =
    target.fileGroup?.files
      ?.map((file) => file.filePath)
      .filter((filePath): filePath is string => !!filePath) ?? [];
  const urlsFromImages =
    target.images
      ?.map((img) => pickImageUrl(img))
      .filter((url): url is string => !!url) ?? [];

  const combined = [...urlsFromGroup, ...urlsFromImages];
  if (target?.imageUrl) {
    combined.unshift(target.imageUrl);
  }
  return Array.from(new Set(combined));
};

export const getPrimaryProductImageUrl = (
  target?: ImageCarrier
): string | undefined => {
  const urls = getProductImageUrls(target);
  return urls[0];
};
