import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SendIcon from "@mui/icons-material/Send";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/features/chat/hooks/useChat";

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  onSend: (message: string) => void;
  isSending: boolean;
  error: string | null;
  messages: ChatMessage[];
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  open,
  onClose,
  onReset,
  onSend,
  isSending,
  error,
  messages,
}) => {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (!open) return null;

  return (
    <Paper
      elevation={6}
      sx={{
        position: "fixed",
        bottom: { xs: 0, sm: 88 },
        right: { xs: 0, sm: 24 },
        width: { xs: "100%", sm: 380 },
        height: { xs: "70vh", sm: 520 },
        zIndex: 1300,
        borderRadius: { xs: 0, sm: 3 },
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          AI 상담
        </Typography>
        <IconButton size="small" onClick={onReset} aria-label="reset chat">
          <RestartAltIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onClose} aria-label="close chat">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Divider />

      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        <Stack spacing={1.5}>
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: "flex",
                justifyContent:
                  message.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  maxWidth: "80%",
                  bgcolor:
                    message.role === "user" ? "primary.main" : "grey.100",
                  color: message.role === "user" ? "primary.contrastText" : "text.primary",
                  whiteSpace: "pre-wrap",
                }}
              >
                <Typography variant="body2">{message.content}</Typography>
              </Box>
            </Box>
          ))}
          <div ref={endRef} />
        </Stack>
      </Box>

      {error && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!input.trim()) return;
          onSend(input);
          setInput("");
        }}
        sx={{ p: 2, pt: 1 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="메시지를 입력하세요"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            fullWidth
            disabled={isSending}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isSending || !input.trim()}
            endIcon={
              isSending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />
            }
          >
            전송
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};
