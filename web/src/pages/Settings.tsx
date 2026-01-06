import {
  Box,
  Button,
  Container,
  FormControlLabel,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { userApi } from "../apis/userApi";
import { ProfileTab } from "../components/mypage/ProfileTab";
import { useAuth } from "../contexts/AuthContext";

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyMarketing, setNotifyMarketing] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });

  const profileQuery = useQuery({
    queryKey: ["user", "me"],
    queryFn: () => userApi.getMe(),
    staleTime: 60_000,
  });

  const userInfo = profileQuery.data?.data ?? null;

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ my: 4 }}>
        설정
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabValue}
          onChange={(_, next) => setTabValue(next)}
        >
          <Tab label="프로필" />
          <Tab label="비밀번호" />
          <Tab label="주소지" />
          <Tab label="알림" />
        </Tabs>
      </Box>
      <Box sx={{ mt: 3 }}>
        {tabValue === 0 && (
          <Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                기본 프로필 정보를 확인할 수 있습니다.
              </Typography>
            </Box>
            <ProfileTab userInfo={userInfo} roles={user?.roles} />
          </Box>
        )}
        {tabValue === 1 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              비밀번호 변경
            </Typography>
            <Typography variant="body2" color="text.secondary">
              안전한 비밀번호로 변경하세요.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              소셜 로그인 계정은 비밀번호가 없을 수 있습니다. (미개발)
            </Typography>
            <Stack spacing={2} sx={{ mt: 2, maxWidth: 360 }}>
              <TextField
                label="현재 비밀번호"
                type="password"
                value={passwordValues.currentPassword}
                onChange={(event) =>
                  setPasswordValues((prev) => ({
                    ...prev,
                    currentPassword: event.target.value,
                  }))
                }
              />
              <TextField
                label="새 비밀번호"
                type="password"
                value={passwordValues.nextPassword}
                onChange={(event) =>
                  setPasswordValues((prev) => ({
                    ...prev,
                    nextPassword: event.target.value,
                  }))
                }
              />
              <TextField
                label="새 비밀번호 확인"
                type="password"
                value={passwordValues.confirmPassword}
                onChange={(event) =>
                  setPasswordValues((prev) => ({
                    ...prev,
                    confirmPassword: event.target.value,
                  }))
                }
              />
              <Button variant="contained" disabled>
                변경하기
              </Button>
              <Typography variant="caption" color="text.secondary">
                비밀번호 변경 기능은 준비 중입니다.
              </Typography>
            </Stack>
          </Box>
        )}
        {tabValue === 2 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              주소지 관리
            </Typography>
            <Typography variant="body2" color="text.secondary">
              배송지 정보를 등록하고 기본 주소지를 설정하세요.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              주소지 관리 기능은 준비 중입니다.
            </Typography>
            <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button variant="outlined" disabled>
                주소지 등록
              </Button>
              <Button variant="outlined" disabled>
                주소 검색
              </Button>
            </Box>
          </Box>
        )}
        {tabValue === 3 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              알림 설정
            </Typography>
            <Typography variant="body2" color="text.secondary">
              수신할 알림을 선택하세요.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              알림 설정 기능은 준비 중입니다.
            </Typography>
            <Stack sx={{ mt: 2 }} spacing={1}>
              <FormControlLabel
                sx={{ justifyContent: "space-between", m: 0 }}
                control={
                  <Switch
                    checked={notifyEmail}
                    onChange={(event) => setNotifyEmail(event.target.checked)}
                    disabled
                  />
                }
                label="이메일 알림"
                labelPlacement="start"
              />
              <FormControlLabel
                sx={{ justifyContent: "space-between", m: 0 }}
                control={
                  <Switch
                    checked={notifyPush}
                    onChange={(event) => setNotifyPush(event.target.checked)}
                    disabled
                  />
                }
                label="푸시 알림"
                labelPlacement="start"
              />
              <FormControlLabel
                sx={{ justifyContent: "space-between", m: 0 }}
                control={
                  <Switch
                    checked={notifyMarketing}
                    onChange={(event) =>
                      setNotifyMarketing(event.target.checked)
                    }
                    disabled
                  />
                }
                label="마케팅 알림"
                labelPlacement="start"
              />
            </Stack>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default Settings;
