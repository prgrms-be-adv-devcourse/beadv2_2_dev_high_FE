import { useCallback, useMemo, useState } from "react";
import { chatApi } from "@/apis/chatApi";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

const createMessage = (role: ChatRole, content: string): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  role,
  content,
  createdAt: new Date().toISOString(),
});

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createMessage("assistant", "안녕하세요! 무엇을 도와드릴까요?"),
  ]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isSending) return;

      const userMessage = createMessage("user", trimmed);
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setError(null);

      try {
        const response = await chatApi.sendMessage({
          message: trimmed,
          sessionId: sessionId ?? undefined,
        });
        const nextSessionId = response.data?.sessionId ?? null;
        if (nextSessionId) {
          setSessionId(nextSessionId);
        }
        const reply =
          response.data?.reply ?? "요청을 처리하지 못했습니다. 다시 시도해 주세요.";
        setMessages((prev) => [...prev, createMessage("assistant", reply)]);
      } catch (err) {
        setError("메시지 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setIsSending(false);
      }
    },
    [isSending, sessionId]
  );

  const reset = useCallback(() => {
    setMessages([createMessage("assistant", "안녕하세요! 무엇을 도와드릴까요?")]);
    setSessionId(null);
    setError(null);
  }, []);

  return useMemo(
    () => ({
      messages,
      isSending,
      error,
      sendMessage,
      reset,
    }),
    [error, isSending, messages, reset, sendMessage]
  );
};
