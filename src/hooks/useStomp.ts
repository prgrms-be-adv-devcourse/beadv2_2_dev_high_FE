import { useEffect, useRef, useState, useCallback } from "react";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

interface UseStompProps {
  topic: string; // 구독할 토픽 (auctionId 포함된 완전한 형태)
  onMessage: (message: IMessage) => void;
}

/**
 * STOMP over SockJS 웹소켓 연결을 위한 React Hook
 * @param topic - 구독할 토픽 (예: /topic/auction.123)
 * @param onMessage - 메시지 수신 시 호출될 콜백 함수
 */

export const useStomp = ({ topic, onMessage }: UseStompProps) => {
  const [connectionState, setConnectionState] = useState<
    "disconnected" | "connecting" | "connected" | "reconnecting" | "failed"
  >("connecting");

  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const retryCountRef = useRef(0);
  const isCleanupRef = useRef(false); // 페이지 이동 등으로 인한 cleanup 플래그
  const reconnectTimeoutRef = useRef<any | null>(null);
  const MAX_RETRIES = 3;
  const RECONNECT_DELAY = 3000; // 운영용으로 3초로 복원

  // 연결 상태 getter
  const isConnected = connectionState === "connected";
  const isRetrying =
    connectionState === "reconnecting" || connectionState === "connecting";

  // 연결 해제 함수
  const disconnect = useCallback((isReconnecting = false) => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }

    if (!isReconnecting) {
      setConnectionState("disconnected");
    }
  }, []);

  const connect = useCallback(() => {
    const client = new Client({
      webSocketFactory: () =>
        new SockJS(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
          }/ws-auction`
        ),
      reconnectDelay: 0, // 직접 재연결 로직 사용
      heartbeatIncoming: 10000, // 운영용으로 10초 복원
      heartbeatOutgoing: 10000, // 운영용으로 10초 복원
      debug: (str) => console.log(new Date(), str),
    });

    client.onConnect = () => {
      console.log("STOMP: 연결 성공");
      if (isCleanupRef.current) return;

      setConnectionState("connected");
      retryCountRef.current = 0; // 성공 시 재시도 카운트 리셋

      try {
        subscriptionRef.current = client.subscribe(topic, onMessage);

        // join 메시지 전송
        const auctionId = topic.split(".").pop();
        if (auctionId) {
          client.publish({
            destination: `/auctions/join/${auctionId}`,
            body: JSON.stringify({}),
          });
        }
      } catch (error) {
        console.error("STOMP: 구독 또는 join 메시지 전송 실패:", error);
        // 구독 실패 시 재연결 시도
        setConnectionState("disconnected");
        attemptReconnect();
      }
    };

    client.onWebSocketClose = () => {
      if (isCleanupRef.current) {
        // 페이지 이동 등으로 인한 의도적 종료 - 재연결하지 않음
        disconnect();
        return;
      }

      // 이미 재연결 중이거나 재연결 시도 중이면 중복 방지
      // reconnectTimeoutRef.current 체크만으로 재연결 진행 여부 판단
      if (reconnectTimeoutRef.current) {
        return;
      }

      // 서버 문제로 인한 연결 끊김 - 재연결 시도
      attemptReconnect();
    };

    client.onStompError = () => {
      console.error("STOMP: 브로커 오류");

      if (
        !isCleanupRef.current &&
        !reconnectTimeoutRef.current &&
        !reconnectTimeoutRef.current
      ) {
        setConnectionState("disconnected");
        attemptReconnect();
      }
    };

    client.onWebSocketError = () => {
      console.error("STOMP: 웹소켓 오류");

      if (
        !isCleanupRef.current &&
        !reconnectTimeoutRef.current &&
        !reconnectTimeoutRef.current
      ) {
        setConnectionState("disconnected");
        attemptReconnect();
      }
    };

    clientRef.current = client;

    console.log("STOMP: 연결 시도...");
    client.activate();
  }, [topic, onMessage]);

  // 재연결 함수
  const attemptReconnect = useCallback(() => {
    // 이미 재연결 타이머가 설정되어 있거나, 의도적으로 연결을 해제한 경우 중복 실행 방지
    if (reconnectTimeoutRef.current || isCleanupRef.current) {
      return;
    }

    if (retryCountRef.current >= MAX_RETRIES) {
      console.log("STOMP: 재연결 최대 시도 도달, 연결 실패");
      setConnectionState("failed");
      return;
    }

    retryCountRef.current += 1;
    setConnectionState("reconnecting");
    console.log(`STOMP: 재연결 시도 ${retryCountRef.current}/${MAX_RETRIES}`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isCleanupRef.current) return;

      disconnect(true); // 재연결 중이므로 상태를 'disconnected'로 바꾸지 않음
      connect();
    }, RECONNECT_DELAY);
  }, [connect, disconnect]);

  // 클라이언트 생성 및 연결
  useEffect(() => {
    if (!topic) return;

    isCleanupRef.current = false;
    retryCountRef.current = 0; // 새로운 연결 시작 시 재시도 횟수 초기화

    connect();

    // cleanup 함수
    return () => {
      // 컴포넌트가 unmount될 때 (페이지 이동, HMR 등) 연결을 정리합니다.
      isCleanupRef.current = true;
      disconnect();
    };
  }, [topic, onMessage]);

  // 메시지 전송 함수
  const sendMessage = useCallback(
    (destination: string, body: string, headers?: Record<string, string>) => {
      if (clientRef.current?.connected && !isCleanupRef.current) {
        try {
          clientRef.current.publish({ destination, body, headers });
        } catch (error) {
          console.error("STOMP: 메시지 전송 실패:", error);
        }
      } else {
        console.error(
          "STOMP: 클라이언트가 연결되지 않았거나 cleanup 중입니다."
        );
      }
    },
    []
  );

  return {
    isConnected,
    isRetrying,
    connectionState,
    sendMessage,
    retryCount: retryCountRef.current,
    maxRetries: MAX_RETRIES,
  };
};
