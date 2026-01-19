import type { QueryClient } from "@tanstack/react-query";
import type { ApiResponseDto, FileGroup } from "@moreauction/types";
import { queryKeys } from "@/shared/queries/queryKeys";

export const seedFileGroupCache = (
  queryClient: QueryClient,
  response: ApiResponseDto<FileGroup[]> | null | undefined
) => {
  if (!response?.data?.length) return;

  response.data.forEach((group) => {
    if (!group?.fileGroupId) return;

    queryClient.setQueryData(queryKeys.files.group(group.fileGroupId), {
      code: response.code,
      message: response.message,
      data: group,
    } satisfies ApiResponseDto<FileGroup>);
  });
};
