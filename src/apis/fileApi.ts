// src/apis/fileApi.ts

import type { ApiResponseDto } from "../types/common";
import { client } from "./client";

export interface UploadedFileInfo {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileGroupId: string;
  createdBy?: string;
  createdAt?: string;
}

export interface FileGroupUploadResponse {
  fileGroupId: string;
  files: UploadedFileInfo[];
}

export const fileApi = {
  uploadFiles: async (
    files: File[]
  ): Promise<ApiResponseDto<FileGroupUploadResponse>> => {
    if (!files.length) {
      throw new Error("업로드할 파일이 없습니다.");
    }
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await client.post("/files", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  /**
   * 단일 파일 업로드 (하위 호환)
   */
  uploadFile: async (file: File) => {
    return fileApi.uploadFiles([file]);
  },
};
