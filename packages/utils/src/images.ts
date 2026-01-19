import type { FileGroup, ProductImage } from "@moreauction/types";

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

export const getProductImageUrls = (target: FileGroup | null): string[] => {
  if (!target) return [];
  const urlsFromGroup =
    target?.files
      ?.map((file) => file.filePath)
      .filter((filePath): filePath is string => !!filePath) ?? [];

  return Array.from(new Set(urlsFromGroup));
};
