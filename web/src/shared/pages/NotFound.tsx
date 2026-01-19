import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const NotFound: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        py: 6,
        background:
          "radial-gradient(circle at 10% 20%, rgba(59,130,246,0.08), transparent 50%), radial-gradient(circle at 90% 0%, rgba(249,115,22,0.12), transparent 45%)",
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            textAlign: "center",
            bgcolor: "background.paper",
          }}
        >
          <Stack spacing={2}>
            <Typography
              variant="h3"
              sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}
            >
              404
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              페이지를 찾을 수 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary">
              주소가 잘못되었거나 페이지가 이동되었을 수 있습니다.
            </Typography>
            <Box>
              <Button
                component={RouterLink}
                to="/"
                variant="contained"
                size="large"
              >
                홈으로 돌아가기
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default NotFound;
