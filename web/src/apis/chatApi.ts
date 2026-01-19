import type { ApiResponseDto } from "@moreauction/types";
import { client } from "@/apis/client";

interface ChatMessageRequest {
  message: string;
  sessionId?: string;
}

interface ChatMessageResponse {
  reply: string;
  sessionId?: string;
}

export const chatApi = {
  sendMessage: async (
    payload: ChatMessageRequest
  ): Promise<ApiResponseDto<ChatMessageResponse>> => {
    const response = await client.post("/chat/messages", payload);
    return response.data;
  },
};
