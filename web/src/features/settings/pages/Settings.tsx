import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userApi } from "@/apis/userApi";
import { ProfileTab } from "@/features/mypage/components/ProfileTab";
import AddressManager from "@/features/profile/components/AddressManager";
import { useAuth } from "@moreauction/auth";
import { queryKeys } from "@/shared/queries/queryKeys";

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyMarketing, setNotifyMarketing] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileValues, setProfileValues] = useState({
    name: "",
    nickname: "",
    phone_number: "",
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });

  const profileQuery = useQuery({
    queryKey: queryKeys.user.me(),
    queryFn: () => userApi.getMe(),
    staleTime: 60_000,
  });

  const maxTabIndex = 3;
  const parsedTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    return tabParam ? Number(tabParam) : 0;
  }, [location.search]);

  const safeTabValue =
    Number.isFinite(parsedTab) && parsedTab >= 0 && parsedTab <= maxTabIndex
      ? parsedTab
      : 0;

  const userInfo = profileQuery.data?.data ?? null;
  useEffect(() => {
    if (!userInfo) return;
    setProfileValues({
      name: userInfo.name ?? "",
      nickname: userInfo.nickname ?? "",
      phone_number: userInfo.phone_number ?? "",
    });
  }, [userInfo]);

  useEffect(() => {
    if (safeTabValue === parsedTab) return;
    const newParams = new URLSearchParams(location.search);
    newParams.set("tab", String(safeTabValue));
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
  }, [location.search, navigate, parsedTab, safeTabValue]);

  const profileMutation = useMutation({
    mutationFn: (payload: typeof profileValues) =>
      userApi.updateProfile(payload),
    onSuccess: (response) => {
      if (response?.data) {
        queryClient.setQueryData(queryKeys.user.me(), response);
        updateUser(response.data);
      }
      setProfileError(null);
      setProfileDialogOpen(false);
      alert("프로필이 변경되었습니다.");
    },
    onError: () => {
      setProfileError("프로필 변경에 실패했습니다.");
    },
  });

  const canSaveProfile = useMemo(() => {
    if (!userInfo) return false;
    return (
      profileValues.name.trim().length > 0 &&
      profileValues.nickname.trim().length > 0
    );
  }, [profileValues.name, profileValues.nickname, userInfo]);

  const nameError = useMemo(() => {
    const value = profileValues.name.trim();
    if (!value) return "이름을 입력해주세요.";
    if (!/^[A-Za-z가-힣\s]{2,30}$/.test(value)) {
      return "이름은 2~30자, 한글/영문/공백만 가능합니다.";
    }
    return null;
  }, [profileValues.name]);

  const nicknameError = useMemo(() => {
    const value = profileValues.nickname.trim();
    if (!value) return "닉네임을 입력해주세요.";
    if (!/^[A-Za-z0-9가-힣_-]{2,12}$/.test(value)) {
      return "닉네임은 2~12자, 한글/영문/숫자/_/- 만 가능합니다.";
    }
    return null;
  }, [profileValues.nickname]);

  const phoneError = useMemo(() => {
    const value = profileValues.phone_number.trim();
    if (!value) return null;
    if (!/^01[016789][-\s]?\d{3,4}[-\s]?\d{4}$/.test(value)) {
      return "연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)";
    }
    return null;
  }, [profileValues.phone_number]);

  const canSubmitProfile =
    canSaveProfile && !nameError && !nicknameError && !phoneError;

  const handleOpenProfileDialog = () => {
    setProfileDialogOpen(true);
  };

  const handleCloseProfileDialog = () => {
    if (!profileMutation.isPending) {
      setProfileDialogOpen(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    const newParams = new URLSearchParams(location.search);
    newParams.set("tab", String(newValue));
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ my: 4 }}>
        설정
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={safeTabValue} onChange={handleTabChange}>
          <Tab label="프로필" />
          <Tab label="비밀번호" />
          <Tab label="주소지" />
          <Tab label="알림" />
        </Tabs>
      </Box>
      <Box sx={{ mt: 3 }}>
        {safeTabValue === 0 && (
          <Box>
            <Box
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                기본 프로필 정보를 확인하고 필요할 때 수정할 수 있어요.
              </Typography>
              <Button variant="contained" onClick={handleOpenProfileDialog}>
                프로필 수정하기
              </Button>
            </Box>
            <ProfileTab userInfo={userInfo} roles={user?.roles} />
          </Box>
        )}
        {safeTabValue === 1 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              비밀번호 변경
            </Typography>
            <Typography variant="body2" color="text.secondary">
              안전한 비밀번호로 변경하세요.
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: "block" }}
            >
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
        {safeTabValue === 2 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              주소지 관리
            </Typography>
            <Typography variant="body2" color="text.secondary">
              배송지 정보를 등록하고 기본 주소지를 설정하세요.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <AddressManager />
            </Box>
          </Box>
        )}
        {safeTabValue === 3 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              알림 설정
            </Typography>
            <Typography variant="body2" color="text.secondary">
              수신할 알림을 선택하세요.
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: "block" }}
            >
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
      <Dialog
        open={profileDialogOpen}
        onClose={handleCloseProfileDialog}
        disableEscapeKeyDown={profileMutation.isPending}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>프로필 변경</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="이름"
              value={profileValues.name}
              error={!!nameError}
              helperText={nameError ?? " "}
              onChange={(event) =>
                setProfileValues((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
            />
            <TextField
              label="닉네임"
              value={profileValues.nickname}
              error={!!nicknameError}
              helperText={nicknameError ?? " "}
              onChange={(event) =>
                setProfileValues((prev) => ({
                  ...prev,
                  nickname: event.target.value,
                }))
              }
            />
            <TextField
              label="연락처"
              value={profileValues.phone_number}
              error={!!phoneError}
              helperText={phoneError ?? " "}
              onChange={(event) =>
                setProfileValues((prev) => ({
                  ...prev,
                  phone_number: event.target.value,
                }))
              }
            />
            {profileError && (
              <Typography variant="body2" color="error">
                {profileError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseProfileDialog}
            disabled={profileMutation.isPending}
          >
            닫기
          </Button>
          <Button
            variant="contained"
            disabled={!canSubmitProfile || profileMutation.isPending}
            onClick={() => {
              profileMutation.mutate(profileValues);
            }}
          >
            {profileMutation.isPending ? "저장 중..." : "저장하기"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;
