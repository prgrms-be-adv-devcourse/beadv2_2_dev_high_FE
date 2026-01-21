import { client } from "@/apis/client";
import type {
  ApiResponseDto,
  NotificationCountResponse,
  PagedNotificationResponse,
} from "@moreauction/types";

export const notificationApi = {
  /**
   * 사용자 알림 목록 조회 (페이지네이션)
   * 만료일자 이내 알림 조회
   */
  getNotifications: async (params: {
    page?: number;
    size?: number;
  }): Promise<PagedNotificationResponse> => {
    const res = await client.get<ApiResponseDto<PagedNotificationResponse>>(
      "/notifications",
      { params }
    );
    return res.data.data;
  },
  getUnreadNotifications: async (params: {
    page?: number;
    size?: number;
  }): Promise<PagedNotificationResponse> => {
    const res = await client.get<ApiResponseDto<PagedNotificationResponse>>(
      "/notifications/unread/all",
      { params }
    );
    return res.data.data;
  },
  getUnreadCount: async (): Promise<number> => {
    const res = await client.get<ApiResponseDto<NotificationCountResponse>>(
      "/notifications/unread/count"
    );
    return res.data.data?.count ?? 0;
  },

  readAll: async (): Promise<void> => {
    await client.put("/notifications/read-all");
  },

  getNotifi: async (notificationId: string): Promise<number> => {
    const res = await client.get<number>(`/notifications/${notificationId}`);
    return res.data;
  },
};
