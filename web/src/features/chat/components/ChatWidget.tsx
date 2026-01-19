import { Box } from "@mui/material";
import { useState } from "react";
import { ChatFab } from "@/features/chat/components/ChatFab";
import { ChatPanel } from "@/features/chat/components/ChatPanel";
import { useChat } from "@/features/chat/hooks/useChat";

interface ChatWidgetProps {
  disabled?: boolean;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ disabled = false }) => {
  const [open, setOpen] = useState(false);
  const { messages, isSending, error, sendMessage, reset } = useChat();

  if (disabled) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: { xs: 16, sm: 24 },
        right: { xs: 16, sm: 24 },
        zIndex: 1200,
      }}
    >
      <ChatPanel
        open={open}
        onClose={() => setOpen(false)}
        onReset={reset}
        onSend={sendMessage}
        isSending={isSending}
        error={error}
        messages={messages}
      />
      {!open && (
        <ChatFab onClick={() => setOpen(true)} unreadCount={0} />
      )}
    </Box>
  );
};
