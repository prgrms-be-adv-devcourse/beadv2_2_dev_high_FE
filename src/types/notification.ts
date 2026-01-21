import type { PagedApiResponse } from "./common";

// 백엔드 NotificationType enum과 매핑되는 문자열 타입
export type NotificationType = string;

// /notifications 페이지에서 내려오는 레코드
export interface NotificationInfo {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedUrl: string | null;
  readYn: boolean;
  createdAt?: string; // 백엔드에 존재한다고 가정하되, 안전하게 optional 처리
}

export type PagedNotificationResponse = PagedApiResponse<NotificationInfo>;

