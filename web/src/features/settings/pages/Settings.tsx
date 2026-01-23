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
import { validatePassword } from "@/shared/utils/passwordValidation";

const Settings: React.FC = () => {
  const auth = useAuth();
  const { user, updateUser } = auth;
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
  const [reauthValues, setReauthValues] = useState({
    email: "",
    password: "",
  });
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthenticated, setReauthenticated] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    nextPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
    setReauthValues((prev) => ({
      ...prev,
      email: userInfo.email ?? prev.email,
    }));
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

  const reauthMutation = useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      userApi.login(payload),
    onSuccess: (response) => {
      auth.login(response.data);
      setReauthError(null);
      setReauthenticated(true);
      setReauthValues((prev) => ({ ...prev, password: "" }));
    },
    onError: () => {
      setReauthError("이메일 또는 비밀번호가 올바르지 않습니다.");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: { password: string }) =>
      userApi.updatePassword(payload),
    onSuccess: () => {
      setPasswordError(null);
      setPasswordValues({ nextPassword: "", confirmPassword: "" });
      alert("비밀번호가 변경되었습니다. 다시 로그인해 주세요.");
      auth.logout();
      navigate("/login");
    },
    onError: () => {
      setPasswordError("비밀번호 변경에 실패했습니다.");
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: () => userApi.withdrawUser(),
    onSuccess: () => {
      alert("탈퇴가 완료되었습니다.");
      auth.logout();
      navigate("/");
    },
    onError: () => {
      alert("탈퇴 처리 중 오류가 발생했습니다.");
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

  const passwordValidationError = useMemo(() => {
    const value = passwordValues.nextPassword;
    if (!value) return "새 비밀번호를 입력해주세요.";
    const passwordError = validatePassword(value);
    if (passwordError) return passwordError;
    if (value !== passwordValues.confirmPassword) {
      return "비밀번호 확인이 일치하지 않습니다.";
    }
    return null;
  }, [passwordValues.confirmPassword, passwordValues.nextPassword]);

  const canReauth =
    reauthValues.email.trim().length > 0 &&
    reauthValues.password.trim().length > 0 &&
    !reauthMutation.isPending;
  const canChangePassword =
    reauthenticated &&
    !passwordValidationError &&
    !changePasswordMutation.isPending;

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
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                계정 탈퇴
              </Typography>
              <Typography variant="body2" color="text.secondary">
                탈퇴 시 계정 정보와 이용 내역이 삭제됩니다. 신중하게 결정해
                주세요.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                sx={{ mt: 2 }}
                disabled={withdrawMutation.isPending}
                onClick={() => {
                  const confirmed = window.confirm(
                    "정말 탈퇴하시겠습니까? 탈퇴 후 복구할 수 없습니다."
                  );
                  if (!confirmed) return;
                  withdrawMutation.mutate();
                }}
              >
                {withdrawMutation.isPending ? "처리 중..." : "탈퇴하기"}
              </Button>
            </Box>
          </Box>
        )}
        {safeTabValue === 1 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              비밀번호 변경
            </Typography>
            <Typography variant="body2" color="text.secondary">
              이메일/비밀번호로 다시 로그인한 뒤 새 비밀번호를 설정합니다.
            </Typography>
            <Stack spacing={2} sx={{ mt: 2, maxWidth: 360 }}>
              {!reauthenticated ? (
                <>
                  <TextField
                    label="이메일"
                    type="email"
                    value={reauthValues.email}
                    onChange={(event) =>
                      setReauthValues((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                  />
                  <TextField
                    label="비밀번호"
                    type="password"
                    value={reauthValues.password}
                    onChange={(event) =>
                      setReauthValues((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                  />
                  {reauthError && (
                    <Typography variant="caption" color="error">
                      {reauthError}
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    disabled={!canReauth}
                    onClick={() => {
                      setReauthError(null);
                      reauthMutation.mutate({
                        email: reauthValues.email.trim(),
                        password: reauthValues.password,
                      });
                    }}
                  >
                    {reauthMutation.isPending ? "확인 중..." : "로그인 확인"}
                  </Button>
                </>
              ) : (
                <>
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
                  {(passwordValidationError || passwordError) && (
                    <Typography variant="caption" color="error">
                      {passwordError ?? passwordValidationError}
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    disabled={!canChangePassword}
                    onClick={() => {
                      setPasswordError(null);
                      changePasswordMutation.mutate({
                        password: passwordValues.nextPassword,
                      });
                    }}
                  >
                    {changePasswordMutation.isPending
                      ? "변경 중..."
                      : "변경하기"}
                  </Button>
                </>
              )}
            </Stack>
          </Box>
        )}
        {safeTabValue === 2 && (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                mb: 1,
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  주소지 관리
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  배송지 정보를 등록하고 기본 주소지로 설정하세요.
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("address:add-requested")
                  );
                }}
              >
                주소지 등록
              </Button>
            </Box>
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
