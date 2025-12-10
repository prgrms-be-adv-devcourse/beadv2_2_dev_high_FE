// src/apis/fileApi.ts

import type { ApiResponseDto } from "../types/common";
import { client } from "./client";

export interface FileUploadResponse {
  id: string;
  // ... other file properties if any
}

export const fileApi = {
  uploadFile: async (
    file: File
  ): Promise<ApiResponseDto<FileUploadResponse>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "metadata",
      new Blob(
        [
          JSON.stringify({
            fileType: file.type,
            userId: "TEST",
          }),
        ],
        { type: "application/json" }
      )
    );

    console.log("파일 업로드 API 호출:", file.name);
    const response = await client.post("/files", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
