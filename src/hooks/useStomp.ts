import { useEffect, useRef, useState } from "react";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

interface UseStompProps {
  topic: string; // 구독할 토픽 (auctionId 포함된 완전한 형태)
  onMessage: (message: IMessage) => void;
  // auctionId는 이제 topic에 포함되므로 더 이상 필요 없음
}

/**
 * STOMP over SockJS 웹소켓 연결을 위한 React Hook
 * @param topic - 구독할 토픽 (예: /topic/auction.123)
 * @param onMessage - 메시지 수신 시 호출될 콜백 함수
 */
export const useStomp = ({ topic, onMessage }: UseStompProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);

  useEffect(() => {
    // topic이 없으면 연결 시도하지 않음
    if (!topic) {
      console.log("STOMP: 유효한 토픽이 없어 연결을 시도하지 않습니다.");
      if (clientRef.current?.connected) {
        subscriptionRef.current?.unsubscribe();
        clientRef.current.deactivate();
        setIsConnected(false);
      }
      return;
    }

    // 기존 클라이언트가 있으면 연결 해제 및 구독 취소
    if (clientRef.current && clientRef.current.connected) {
      subscriptionRef.current?.unsubscribe();
      clientRef.current.deactivate();
      setIsConnected(false);
    }

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
          }/ws-auction`
        ),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (str) => console.log(new Date(), str), // debug 로그에 시간 추가
    });

    client.onConnect = () => {
      setIsConnected(true);
      subscriptionRef.current = client.subscribe(topic, (msg) => {
        onMessage(msg);
      });
      console.log(`STOMP: 토픽 ${topic} 구독 성공`);

      // 경매 참여 메시지 전송 (연결 후 한 번만)
      const auctionIdFromTopic = topic.split(".").pop(); // /topic/auction.ID 에서 ID 추출
      if (auctionIdFromTopic) {
        client.publish({
          destination: `/auctions/join/${auctionIdFromTopic}`,
          body: JSON.stringify({}),
        });
      }
    };

    client.onStompError = (frame) => {
      console.error("STOMP: 브로커 오류", frame.headers["message"], frame.body);
      setIsConnected(false);
    };

    client.onDisconnect = () => {
      setIsConnected(false);
      console.log("STOMP: 연결 해제");
    };

    clientRef.current = client;
    client.activate();
    console.log(`STOMP: 클라이언트 활성화, 토픽 ${topic} 연결 시도...`);

    return () => {
      console.log("STOMP: 클린업 시작");
      if (clientRef.current) {
        if (clientRef.current.connected) {
          subscriptionRef.current?.unsubscribe();
          const auctionIdFromTopic = topic.split(".").pop();
          if (auctionIdFromTopic) {
            clientRef.current.publish({
              destination: `/app/auctions/leave/${auctionIdFromTopic}`,
              body: JSON.stringify({}),
            });
          }
          clientRef.current.deactivate();
        }
        clientRef.current = null;
      }
      setIsConnected(false);
      console.log("STOMP: 클린업 완료");
    };
  }, [topic, onMessage]); // topic 또는 onMessage 변경 시 재연결

  const sendMessage = (
    destination: string,
    body: string,
    headers?: Record<string, string>
  ) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({ destination, body, headers });
      console.log(`STOMP: 메시지 전송 (목적지: ${destination})`, body);
    } else {
      console.error("STOMP: 클라이언트가 연결되지 않았습니다.");
    }
  };

  return { isConnected, sendMessage };
};
