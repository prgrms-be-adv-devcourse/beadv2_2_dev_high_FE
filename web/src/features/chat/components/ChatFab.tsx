import { Fab, Badge } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";

interface ChatFabProps {
  onClick: () => void;
  unreadCount?: number;
}

export const ChatFab: React.FC<ChatFabProps> = ({
  onClick,
  unreadCount = 0,
}) => {
  const showBadge = unreadCount > 0;
  return (
    <Badge
      color="error"
      badgeContent={unreadCount}
      invisible={!showBadge}
      overlap="circular"
    >
      <Fab color="primary" onClick={onClick} aria-label="ai chat">
        <SmartToyIcon />
      </Fab>
    </Badge>
  );
};
