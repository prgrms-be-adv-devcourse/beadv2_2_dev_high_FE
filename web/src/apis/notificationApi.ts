import { client } from "@/apis/client";
import type {
  NotificationInfo,
  PagedNotificationResponse,
} from "@moreauction/types";

export const notificationApi = {
  /**
   * 사용자 알림 목록 조회 (페이지네이션)
   * 공통 ApiResponseDto로 감싸져 있지 않고 Page<NotificationInfo> 그대로 내려온다고 가정
   */
  getNotifications: async (params: {
    page?: number;
    size?: number;
  }): Promise<PagedNotificationResponse> => {
    const res = await client.get<PagedNotificationResponse>("/notifications", {
      params,
    });
    const data: any = res.data;
    if (data && typeof data === "object" && "data" in data) {
      return data.data as PagedNotificationResponse;
    }
    return data as PagedNotificationResponse;
  },
  getUnreadCount: async (): Promise<number> => {
    const res = await client.get<number>("/notifications/unread/count");
    const data: any = res.data;
    if (typeof data === "number") return data;
    if (data && typeof data === "object") {
      if (typeof data.count === "number") return data.count;
      if (typeof data.data === "number") return data.data;
      if (data.data && typeof data.data.count === "number") {
        return data.data.count;
      }
    }
    return 0;
  },

  getNotifi: async (notificationId: string): Promise<number> => {
    const res = await client.get<number>(`/notifications/${notificationId}`);
    return res.data;
  },
};
