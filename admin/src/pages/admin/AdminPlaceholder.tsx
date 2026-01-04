import { Box, Paper, Typography } from "@mui/material";

type AdminPlaceholderProps = {
  title: string;
  description?: string;
};

const AdminPlaceholder: React.FC<AdminPlaceholderProps> = ({
  title,
  description,
}) => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
        {title}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          {description ?? "이 화면은 관리자 전용 기능으로 구성됩니다."}
        </Typography>
      </Paper>
    </Box>
  );
};

export default AdminPlaceholder;
