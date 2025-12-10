import { client } from "./client";
import type {
  NotificationInfo,
  PagedNotificationResponse,
} from "../types/notification";

export const notificationApi = {
  /**
   * 사용자 알림 목록 조회 (페이지네이션)
   * 공통 ApiResponseDto로 감싸져 있지 않고 Page<NotificationInfo> 그대로 내려온다고 가정
   */
  getNotifications: async (params: {
    userId?: string;
    page?: number;
    size?: number;
  }): Promise<PagedNotificationResponse> => {
    const res = await client.get<PagedNotificationResponse>("/notifications", {
      params,
    });
    return res.data;
  },
};
