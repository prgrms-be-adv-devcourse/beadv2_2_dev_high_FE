import { Box, Card, CardContent, Typography } from "@mui/material";

const stats = [
  { label: "오늘 신규 회원", value: "24" },
  { label: "진행 중 경매", value: "12" },
  { label: "대기 주문", value: "8" },
  { label: "신고 접수", value: "3" },
];

const AdminDashboard = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        대시보드
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        {stats.map((item) => (
          <Card key={item.label} variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default AdminDashboard;
