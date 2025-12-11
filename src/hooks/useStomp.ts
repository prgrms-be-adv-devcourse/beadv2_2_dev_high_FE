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
  >("disconnected");

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
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    if (clientRef.current) {
      // leave 메시지 전송
      const auctionId = topic.split(".").pop();
      if (auctionId && clientRef.current.connected) {
        try {
          clientRef.current.publish({
            destination: `/app/auctions/leave/${auctionId}`,
            body: JSON.stringify({}),
          });
        } catch (error) {
          console.warn("STOMP: leave 메시지 전송 실패:", error);
        }
      }

      clientRef.current.deactivate();
      clientRef.current = null;
    }

    setConnectionState("disconnected");
    retryCountRef.current = 0;
  }, [topic]);

  // 재연결 함수
  const attemptReconnect = useCallback(() => {
    if (isCleanupRef.current) {
      console.log("STOMP: 재연결 취소 (cleanup)");
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

      // 기존 재연결 타이머 취소 (중복 방지)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (isCleanupRef.current) return;

      // 기존 연결 정리
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      // 새로운 클라이언트 생성
      const client = new Client({
        webSocketFactory: () =>
          new SockJS(
            `${
              import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
            }/ws-auction`
          ),
        reconnectDelay: 0,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: (str) => console.log(new Date(), str),
      });

      client.onConnect = () => {
        if (isCleanupRef.current) return;

        setConnectionState("connected");
        retryCountRef.current = 0;

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
          setConnectionState("disconnected");
          attemptReconnect();
        }
      };

      client.onWebSocketClose = () => {
        if (isCleanupRef.current) {
          disconnect();
          return;
        }

        // 이미 재연결 중이거나 재연결 시도 중이면 중복 방지
        if (connectionState === "reconnecting" || reconnectTimeoutRef.current) {
          return;
        }

        setConnectionState("disconnected");
        attemptReconnect();
      };

      client.onStompError = () => {
        console.error("STOMP: 브로커 오류");

        if (
          !isCleanupRef.current &&
          connectionState !== "reconnecting" &&
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
          connectionState !== "reconnecting" &&
          !reconnectTimeoutRef.current
        ) {
          setConnectionState("disconnected");
          attemptReconnect();
        }
      };

      clientRef.current = client;

      try {
        client.activate();
      } catch (error) {
        console.error("STOMP: 재연결 실패");
        setTimeout(() => attemptReconnect(), 100);
      }
    }, RECONNECT_DELAY);
  }, [topic, onMessage, disconnect]);

  // 클라이언트 생성 및 연결
  useEffect(() => {
    if (!topic) return;

    isCleanupRef.current = false;
    retryCountRef.current = 0;
    setConnectionState("connecting");

    // 기존 연결 정리
    disconnect();

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

    let joinSent = false;

    client.onConnect = () => {
      if (isCleanupRef.current) return;

      setConnectionState("connected");
      retryCountRef.current = 0; // 성공 시 재시도 카운트 리셋

      try {
        subscriptionRef.current = client.subscribe(topic, onMessage);

        // join 메시지 전송
        if (!joinSent) {
          const auctionId = topic.split(".").pop();
          if (auctionId) {
            client.publish({
              destination: `/auctions/join/${auctionId}`,
              body: JSON.stringify({}),
            });
            joinSent = true;
          }
        }
      } catch (error) {
        console.error("STOMP: 구독 또는 join 메시지 전송 실패:", error);
        // 구독 실패 시 재연결 시도
        setConnectionState("disconnected");
        attemptReconnect();
      }
    };

    client.onWebSocketClose = (event) => {
      if (isCleanupRef.current) {
        // 페이지 이동 등으로 인한 의도적 종료 - 재연결하지 않음
        disconnect();
        return;
      }

      // 이미 재연결 중이거나 재연결 시도 중이면 중복 방지
      if (connectionState === "reconnecting" || reconnectTimeoutRef.current) {
        return;
      }

      // 서버 문제로 인한 연결 끊김 - 재연결 시도
      setConnectionState("disconnected");
      attemptReconnect();
    };

    client.onDisconnect = () => {
      setConnectionState("disconnected");
    };

    client.onStompError = (frame) => {
      console.error("STOMP: 브로커 오류");

      if (
        !isCleanupRef.current &&
        connectionState !== "reconnecting" &&
        !reconnectTimeoutRef.current
      ) {
        setConnectionState("disconnected");
        attemptReconnect();
      }
    };

    client.onWebSocketError = (error) => {
      console.error("STOMP: 웹소켓 오류");

      if (
        !isCleanupRef.current &&
        connectionState !== "reconnecting" &&
        !reconnectTimeoutRef.current
      ) {
        setConnectionState("disconnected");
        attemptReconnect();
      }
    };

    clientRef.current = client;

    try {
      client.activate();
    } catch (error) {
      console.error("STOMP: 초기 연결 실패");
      setConnectionState("failed");
      // 초기 연결 실패 시 재연결 시도
      attemptReconnect();
    }

    // cleanup 함수
    return () => {
      isCleanupRef.current = true; // 페이지 이동 플래그 설정

      // 재연결 타이머 즉시 취소
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      disconnect();
    };
  }, [topic, onMessage, disconnect]);

  // 메시지 전송 함수
  const sendMessage = useCallback(
    (destination: string, body: string, headers?: Record<string, string>) => {
      if (clientRef.current?.connected && !isCleanupRef.current) {
        try {
          clientRef.current.publish({ destination, body, headers });
          console.log(`STOMP: 메시지 전송 (${destination})`, body);
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
