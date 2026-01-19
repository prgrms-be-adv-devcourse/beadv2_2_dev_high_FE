import { useEffect, useRef } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type {
  NotificationInfo,
  PagedNotificationResponse,
} from "@moreauction/types";
import { API_BASE_URL } from "@/apis/client";
import { queryKeys } from "@/shared/queries/queryKeys";
import { useAuth } from "@moreauction/auth";

type SseEvent = {
  event?: string;
  data?: string;
};

const parseSseEvent = (raw: string): SseEvent => {
  const lines = raw.split(/\r?\n/);
  let event: string | undefined;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  return {
    event,
    data: dataLines.length > 0 ? dataLines.join("\n") : undefined,
  };
};

const upsertNotification = (
  items: NotificationInfo[],
  incoming: NotificationInfo
) => {
  const existingIndex = items.findIndex((item) => item.id === incoming.id);
  if (existingIndex === -1) {
    return [incoming, ...items];
  }
  return items.map((item, index) =>
    index === existingIndex ? { ...item, ...incoming } : item
  );
};

export const useNotificationSse = (options?: {
  onNotification?: (payload: NotificationInfo) => void;
}) => {
  const { isAuthenticated, user, logout } = useAuth();
  const queryClient = useQueryClient();
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onNotificationRef = useRef(options?.onNotification);

  useEffect(() => {
    onNotificationRef.current = options?.onNotification;
  }, [options?.onNotification]);

  useEffect(() => {
    if (!isAuthenticated || !user?.userId) return;

    let isClosed = false;
    let retryCount = 0;

    const handleNotification = (payload: NotificationInfo) => {
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        (prev?: number) => (typeof prev === "number" ? prev + 1 : 1)
      );

      queryClient.setQueriesData(
        { queryKey: queryKeys.notifications.headerListBase(user.userId) },
        (oldData: PagedNotificationResponse | undefined) => {
          if (!oldData?.content) return oldData;
          return {
            ...oldData,
            content: upsertNotification(oldData.content, payload),
          };
        }
      );

      queryClient.setQueryData(
        queryKeys.notifications.list(user.userId),
        (
          oldData: InfiniteData<PagedNotificationResponse, number> | undefined
        ) => {
          if (!oldData?.pages?.length) return oldData;
          const [firstPage, ...restPages] = oldData.pages;
          if (!firstPage?.content) return oldData;
          const nextFirstPage = {
            ...firstPage,
            content: upsertNotification(firstPage.content, payload),
          };
          return {
            ...oldData,
            pages: [nextFirstPage, ...restPages],
          };
        }
      );

      const handler = onNotificationRef.current;
      if (handler) {
        queueMicrotask(() => handler(payload));
      }
    };

    const scheduleReconnect = () => {
      if (isClosed) return;
      const delay = Math.min(30_000, 1000 * 2 ** retryCount);
      retryCount += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    const connect = async () => {
      if (isClosed) return;
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      let shouldReconnect = true;

      try {
        const response = await fetch(
          `${API_BASE_URL}/notifications/subscribe`,
          {
            method: "GET",
            headers: {
              Accept: "text/event-stream",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            retryCount = 0;
            return connect();
          }
          logout();
          return;
        }

        if (response.status >= 500) {
          shouldReconnect = false;
          throw new Error(`SSE 서버 오류: ${response.status}`);
        }

        if (!response.ok || !response.body) {
          throw new Error(`SSE 연결 실패: ${response.status}`);
        }

        retryCount = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!isClosed) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundaryIndex = buffer.indexOf("\n\n");
          while (boundaryIndex !== -1) {
            const rawEvent = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);
            const { event, data } = parseSseEvent(rawEvent);

            if (event === "notification" && data) {
              try {
                const payload = JSON.parse(data) as NotificationInfo;
                handleNotification(payload);
              } catch (error) {
                console.warn("알림 SSE 파싱 실패:", error);
              }
            }
            boundaryIndex = buffer.indexOf("\n\n");
          }
        }
      } catch (error) {
        if (!isClosed) {
          console.warn("알림 SSE 연결 종료:", error);
        }
      } finally {
        if (!isClosed && shouldReconnect) scheduleReconnect();
      }
    };

    connect();

    return () => {
      isClosed = true;
      abortRef.current?.abort();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [isAuthenticated, logout, queryClient, user?.userId]);
};

const refreshAccessToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh/token`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data?: { accessToken?: string };
    };
    const newToken = payload?.data?.accessToken;
    if (typeof newToken === "string" && newToken.length > 0) {
      localStorage.setItem("accessToken", newToken);
      return newToken;
    }
    return null;
  } catch (error) {
    console.warn("SSE 토큰 재발급 실패:", error);
    return null;
  }
};
