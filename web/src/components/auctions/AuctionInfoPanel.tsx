import { Box, Chip, Stack } from "@mui/material";
import { getCommonStatusText } from "@moreauction/utils";

interface AuctionInfoPanelProps {
  productName: string; // is not used
  status: string;
  isAuctionInProgress: boolean;
  isConnected: boolean;
  isRetrying: boolean;
}

const AuctionInfoPanel: React.FC<AuctionInfoPanelProps> = ({
  status,
  isAuctionInProgress,
  isConnected,
  isRetrying,
}) => {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1}>
          <Chip
            label={getCommonStatusText(status)}
            color={isAuctionInProgress ? "success" : "default"}
            size="small"
          />
          <Chip
            label={
              isConnected ? "실시간 연결" : isRetrying ? "연결중" : "연결 끊김"
            }
            color={isConnected ? "success" : isRetrying ? "warning" : "error"}
            size="small"
          />
        </Stack>
      </Stack>
    </Box>
  );
};

export default AuctionInfoPanel;
