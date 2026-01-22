import { API_BASE_URL } from "@/apis/client";
import type { AiProductGenerateRequest } from "@/apis/adminProductApi";
import { Alert, Snackbar } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AiProductGenerateContextValue = {
  pending: boolean;
  startGenerate: (payload: AiProductGenerateRequest) => void;
};

type ToastState = {
  open: boolean;
  message: string;
  severity: "success" | "error";
};

const AiProductGenerateContext =
  createContext<AiProductGenerateContextValue | null>(null);

const parseSseEvent = (raw: string) => {
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

export const AiProductGenerateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    severity: "success",
  });

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  const startGenerate = useCallback(
    (payload: AiProductGenerateRequest) => {
      if (pending) return;
      setPending(true);
      setToast((prev) => ({ ...prev, open: false }));
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestPayload = {
        ...payload,
        generateImage: payload.generateImage ?? true,
      };

      const run = async () => {
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        try {
          const token = localStorage.getItem("accessToken");
          if (!token) {
            throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
          }
          const response = await fetch(
            `${API_BASE_URL}/admin/products/ai/generate/stream`,
            {
              method: "POST",
              headers: {
                Accept: "text/event-stream",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
              body: JSON.stringify(requestPayload),
              signal: controller.signal,
            },
          );

          if (!response.ok || !response.body) {
            throw new Error("AI 상품 생성 요청에 실패했습니다.");
          }

          reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let boundaryIndex = buffer.indexOf("\n\n");
            while (boundaryIndex !== -1) {
              const rawEvent = buffer.slice(0, boundaryIndex);
              buffer = buffer.slice(boundaryIndex + 2);
              const { event, data } = parseSseEvent(rawEvent);

              if (event === "failed") {
                const payloadData = data ? JSON.parse(data) : null;
                throw new Error(
                  payloadData?.error ?? "AI 상품 생성에 실패했습니다.",
                );
              }

              if (event === "completed") {
                const payloadData = data ? JSON.parse(data) : null;
                const productCount = Array.isArray(payloadData?.products)
                  ? payloadData.products.length
                  : null;
                queryClient.invalidateQueries({
                  queryKey: ["admin", "products"],
                });
                setToast({
                  open: true,
                  message:
                    productCount != null
                      ? `AI 상품 생성이 완료되었습니다. (총 ${productCount}개)`
                      : "AI 상품 생성이 완료되었습니다.",
                  severity: "success",
                });
                return;
              }

              boundaryIndex = buffer.indexOf("\n\n");
            }
          }

          throw new Error("AI 상품 생성 응답이 종료되었습니다.");
        } catch (error: any) {
          if (error?.name === "AbortError") return;
          setToast({
            open: true,
            message:
              error?.response?.data?.message ??
              error?.data?.message ??
              error?.message ??
              "AI 상품 생성에 실패했습니다.",
            severity: "error",
          });
        } finally {
          if (reader) {
            try {
              await reader.cancel();
            } catch (cancelError) {
              console.warn("SSE reader cancel failed:", cancelError);
            }
          }
          if (abortRef.current === controller) {
            abortRef.current = null;
          }
          setPending(false);
        }
      };

      void run();
    },
    [pending, queryClient],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const value = useMemo(
    () => ({ pending, startGenerate }),
    [pending, startGenerate],
  );

  return (
    <AiProductGenerateContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={closeToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={closeToast} severity={toast.severity} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </AiProductGenerateContext.Provider>
  );
};

export const useAiProductGenerate = () => {
  const context = useContext(AiProductGenerateContext);
  if (!context) {
    throw new Error(
      "useAiProductGenerate must be used within AiProductGenerateProvider",
    );
  }
  return context;
};
