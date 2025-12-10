import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  Link as MuiLink,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import DaumPostcode from "react-daum-postcode";
import { userApi } from "../apis/userApi";
import FormContainer from "../components/FormContainer";
import type { SignupParams } from "../types/user";

// 회원가입 폼에 필요한 모든 필드 타입을 정의
interface SignUpFormValues extends SignupParams {
  passwordConfirm: string;
}

const SignUp: React.FC = () => {
  const {
    handleSubmit,
    control,
    watch,
    formState: { errors },
    getValues,
    setValue,
  } = useForm<SignUpFormValues>({
    // SignUpFormValues 타입 적용
    defaultValues: {
      email: "",
      password: "",
      passwordConfirm: "",
      name: "",
      nickname: "",
      phone_number: "",
      zip_code: "",
      state: "",
      city: "",
      detail: "",
    },
  });

  const navigate = useNavigate();
  const password = watch("password");

  // 이메일 인증 상태 관리
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(
    null
  );

  // 우편번호 검색 상태 관리
  const [openAddressModal, setOpenAddressModal] = useState(false);

  // 타이머 로직 (5분 = 300초)
  useEffect(() => {
    let interval: any;
    if (isEmailSent && !isEmailVerified && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isEmailSent && !isEmailVerified) {
      setIsEmailSent(false);
      setVerificationCode("");
    }
    return () => clearInterval(interval);
  }, [isEmailSent, isEmailVerified, timeLeft]);

  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/\D/g, "");

    // 최대 11자리까지만 허용
    const limited = numbers.slice(0, 11);

    // 하이픈 추가
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(
        7
      )}`;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 이메일 중복 검증 함수
  const checkEmailAvailability = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null);
      return;
    }

    setEmailChecking(true);
    try {
      // 이메일 중복 체크 API 호출 (userApi에 추가 필요)
      // 일단은 임시로 true로 설정 (실제로는 API 호출)
      await new Promise((resolve) => setTimeout(resolve, 500)); // API 호출 시뮬레이션
      setEmailAvailable(true); // 실제로는 API 응답에 따라 설정
    } catch (error) {
      setEmailAvailable(false);
    } finally {
      setEmailChecking(false);
    }
  };
  // 닉네임 중복 검증 함수
  const checkNicknameAvailability = async (nickname: string) => {
    if (!nickname || nickname.length < 2) {
      setNicknameAvailable(null);
      return;
    }

    setNicknameChecking(true);
    try {
      // 닉네임 중복 체크 API 호출 (userApi에 추가 필요)
      // 일단은 임시로 true로 설정 (실제로는 API 호출)
      await new Promise((resolve) => setTimeout(resolve, 500)); // API 호출 시뮬레이션
      setNicknameAvailable(true); // 실제로는 API 응답에 따라 설정
    } catch (error) {
      setNicknameAvailable(false);
    } finally {
      setNicknameChecking(false);
    }
  };
  const handleSendCode = async () => {
    setLoading(true);
    setServerError(null);
    try {
      const email = getValues("email");
      if (!email) {
        setServerError("이메일을 입력해주세요.");
        setLoading(false);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setServerError("유효한 이메일 주소를 입력해주세요.");
        setLoading(false);
        return;
      }
      await userApi.sendVerificationEmail(email);
      setIsEmailSent(true);
      setTimeLeft(300); // 5분 = 300초
      setVerificationCode("");
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || "인증번호 발송에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setServerError("인증번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setServerError(null);
    try {
      const email = getValues("email");
      await userApi.verifyEmailCode(email, verificationCode);
      setIsEmailVerified(true);
      setIsEmailSent(false);
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || "인증번호가 올바르지 않습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddressComplete = (data: any) => {
    setValue("zip_code", data.zonecode);
    setValue("state", data.sido);
    setValue("city", data.sigungu);
    setValue("detail", data.roadname);
    setOpenAddressModal(false);
  };

  const onSubmit = async (data: SignUpFormValues) => {
    if (loading) return;
    if (!isEmailVerified) {
      setServerError("이메일 인증을 완료해주세요.");
      return;
    }
    setLoading(true);
    setServerError(null);
    try {
      // passwordConfirm 필드 제외
      const { passwordConfirm, ...apiData } = data;
      await userApi.signup(apiData);
      alert("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
      navigate("/login");
    } catch (error: any) {
      console.error("회원가입 실패:", error);
      setServerError(
        error.response?.data?.message || "회원가입 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer
      title="회원가입"
      onSubmit={handleSubmit(onSubmit)}
      maxWidth="sm"
    >
      <Box minWidth={550}>
        {/* 에러 메시지 */}
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        {/* 이메일 인증 완료 메시지 */}
        {isEmailVerified && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✓ 이메일 인증이 완료되었습니다.
          </Alert>
        )}

        {/* 이메일 & 인증 섹션 */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 2 }}
          >
            <Controller
              name="email"
              control={control}
              rules={{
                required: "이메일은 필수 항목입니다.",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "유효한 이메일 주소를 입력해주세요.",
                },
                validate: (value) => {
                  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return "이메일 형식이 올바르지 않습니다.";
                  }
                  if (value && value.length > 100) {
                    return "이메일은 100자를 초과할 수 없습니다.";
                  }
                  return true;
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  required
                  fullWidth
                  label="이메일 주소"
                  autoComplete="email"
                  error={!!errors.email}
                  helperText={
                    errors.email?.message ||
                    (emailAvailable === false
                      ? "이미 사용중인 이메일입니다."
                      : emailAvailable === true
                      ? "사용 가능한 이메일입니다."
                      : "")
                  }
                  disabled={isEmailVerified}
                  inputProps={{ maxLength: 100 }}
                  onBlur={(e) => checkEmailAvailability(e.target.value)}
                  InputProps={{
                    endAdornment: emailChecking ? (
                      <CircularProgress size={20} />
                    ) : null,
                  }}
                />
              )}
            />
            <Button
              variant="contained"
              onClick={handleSendCode}
              disabled={!!errors.email || isEmailVerified || loading}
              sx={{ py: 1.75, px: 2, whiteSpace: "nowrap" }}
            >
              {loading ? <CircularProgress size={20} /> : "인증 발송"}
            </Button>
          </Box>

          {/* 인증번호 입력 필드 */}
          {isEmailSent && !isEmailVerified && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="인증번호"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={isEmailVerified || loading}
                  placeholder="6자리 인증번호"
                  inputProps={{ maxLength: 6 }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  남은 시간: {formatTime(timeLeft)}
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={handleVerifyCode}
                disabled={!verificationCode || isEmailVerified || loading}
                sx={{ py: 1.75, px: 2, whiteSpace: "nowrap" }}
              >
                {loading ? <CircularProgress size={20} /> : "확인"}
              </Button>
            </Box>
          )}
        </Box>

        {/* 비밀번호 필드 (2열) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            mb: 3,
          }}
        >
          <Controller
            name="password"
            control={control}
            rules={{
              required: "비밀번호는 필수 항목입니다.",
              minLength: {
                value: 8,
                message: "비밀번호는 8자 이상이어야 합니다.",
              },
              validate: (value) => {
                if (!value) return true; // required로 이미 체크됨

                // 영문, 숫자, 특수문자 조합 검증
                const hasLetter = /[a-zA-Z]/.test(value);
                const hasNumber = /\d/.test(value);
                const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
                  value
                );

                if (!hasLetter || !hasNumber || !hasSpecial) {
                  return "비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.";
                }

                // 연속된 문자 검증 (3자 이상)
                for (let i = 0; i < value.length - 2; i++) {
                  const char1 = value.charCodeAt(i);
                  const char2 = value.charCodeAt(i + 1);
                  const char3 = value.charCodeAt(i + 2);

                  // 연속된 숫자 (123, 456 등)
                  if (char2 === char1 + 1 && char3 === char2 + 1) {
                    return "비밀번호에 연속된 숫자(3자 이상)를 사용할 수 없습니다.";
                  }

                  // 연속된 알파벳 (abc, xyz 등)
                  if (
                    char2 === char1 + 1 &&
                    char3 === char2 + 1 &&
                    ((char1 >= 65 && char1 <= 90) ||
                      (char1 >= 97 && char1 <= 122))
                  ) {
                    return "비밀번호에 연속된 알파벳(3자 이상)를 사용할 수 없습니다.";
                  }
                }

                return true;
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                required
                fullWidth
                label="비밀번호"
                type="password"
                autoComplete="new-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                inputProps={{ maxLength: 20 }}
              />
            )}
          />
          <Controller
            name="passwordConfirm"
            control={control}
            rules={{
              required: "비밀번호 확인은 필수 항목입니다.",
              validate: (value) =>
                value === password || "비밀번호가 일치하지 않습니다.",
            }}
            render={({ field }) => (
              <TextField
                {...field}
                required
                fullWidth
                label="비밀번호 확인"
                type="password"
                error={!!errors.passwordConfirm}
                helperText={errors.passwordConfirm?.message}
                inputProps={{ maxLength: 100 }}
                onPaste={(e) => e.preventDefault()} // 붙여넣기 방지로 보안 강화
              />
            )}
          />
        </Box>

        {/* 이름 & 닉네임 (2열) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            mb: 3,
          }}
        >
          <Controller
            name="name"
            control={control}
            rules={{
              required: "이름은 필수 항목입니다.",
              validate: (value) => {
                if (!value) return true; // required로 이미 체크됨

                // 한글, 영문만 허용 (2-20자)
                const namePattern = /^[가-힣a-zA-Z\s]{2,20}$/;
                if (!namePattern.test(value.trim())) {
                  return "이름은 한글 또는 영문으로 2-20자 이내로 입력해주세요.";
                }

                // 특수문자나 숫자 포함 여부 체크
                if (/[^가-힣a-zA-Z\s]/.test(value)) {
                  return "이름에는 특수문자나 숫자를 사용할 수 없습니다.";
                }

                return true;
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                required
                fullWidth
                label="이름"
                autoComplete="name"
                error={!!errors.name}
                helperText={errors.name?.message}
                inputProps={{ maxLength: 20 }}
              />
            )}
          />
          <Controller
            name="nickname"
            control={control}
            rules={{
              required: "닉네임은 필수 항목입니다.",
              validate: (value) => {
                if (!value) return true; // required로 이미 체크됨

                // 닉네임 길이 체크 (2-15자)
                if (value.length < 2 || value.length > 15) {
                  return "닉네임은 2-15자 이내로 입력해주세요.";
                }

                // 허용되는 문자 패턴 (한글, 영문, 숫자, 밑줄, 마침표)
                const nicknamePattern = /^[가-힣a-zA-Z0-9_.]+$/;
                if (!nicknamePattern.test(value)) {
                  return "닉네임은 한글, 영문, 숫자, 밑줄(_), 마침표(.)만 사용할 수 있습니다.";
                }

                // 연속된 특수문자 방지
                if (/[_.]{2,}/.test(value)) {
                  return "연속된 특수문자를 사용할 수 없습니다.";
                }

                // 시작과 끝이 특수문자인지 체크
                if (/^[_.]|[_.]$/.test(value)) {
                  return "닉네임의 시작과 끝에는 특수문자를 사용할 수 없습니다.";
                }

                return true;
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                required
                fullWidth
                label="닉네임"
                autoComplete="username"
                error={!!errors.nickname}
                helperText={
                  errors.nickname?.message ||
                  (nicknameAvailable === false
                    ? "이미 사용중인 닉네임입니다."
                    : nicknameAvailable === true
                    ? "사용 가능한 닉네임입니다."
                    : "")
                }
                inputProps={{ maxLength: 15 }}
                onBlur={(e) => checkNicknameAvailability(e.target.value)}
                InputProps={{
                  endAdornment: nicknameChecking ? (
                    <CircularProgress size={20} />
                  ) : null,
                }}
              />
            )}
          />
        </Box>

        {/* 연락처 (1열) */}
        <Box sx={{ mb: 2 }}>
          <Controller
            name="phone_number"
            control={control}
            rules={{
              required: "연락처는 필수 항목입니다.",
              validate: (value) => {
                if (!value) return "연락처는 필수 항목입니다.";

                // 하이픈 제거 후 숫자만 추출
                const phoneNumber = value.replace(/-/g, "");

                // 한국 휴대폰 번호 패턴 (010-XXXX-XXXX)
                const mobilePattern = /^010\d{8}$/;
                // 한국 일반 전화번호 패턴 (지역번호 2-3자리 + 7-8자리)
                const landlinePattern = /^0[2-9]\d{1,2}\d{7,8}$/;

                if (
                  !mobilePattern.test(phoneNumber) &&
                  !landlinePattern.test(phoneNumber)
                ) {
                  return "올바른 휴대폰 번호 또는 일반 전화번호를 입력해주세요. (예: 010-1234-5678)";
                }

                if (phoneNumber.length < 10 || phoneNumber.length > 11) {
                  return "전화번호는 10-11자리여야 합니다.";
                }

                return true;
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                required
                fullWidth
                label="연락처"
                autoComplete="tel"
                error={!!errors.phone_number}
                helperText={errors.phone_number?.message}
                inputProps={{ maxLength: 13 }} // 하이픈 포함 최대 길이
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  field.onChange(formatted);
                }}
                placeholder="010-1234-5678"
              />
            )}
          />
        </Box>

        {/* 우편번호 & 검색 버튼 (8:4 비율) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 2,
            mb: 3,
          }}
        >
          <Controller
            name="zip_code"
            control={control}
            rules={{ required: "우편번호는 필수 항목입니다." }}
            render={({ field }) => (
              <TextField
                {...field}
                required
                fullWidth
                label="우편번호"
                autoComplete="postal-code"
                error={!!errors.zip_code}
                helperText={errors.zip_code?.message}
                inputProps={{ maxLength: 10 }}
              />
            )}
          />
          <Button
            type="button"
            fullWidth
            variant="outlined"
            sx={{ py: 1 }}
            onClick={() => setOpenAddressModal(true)}
          >
            검색
          </Button>
        </Box>

        {/* 시/도 & 시/군/구 (1:1) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            mb: 3,
          }}
        >
          <Controller
            name="state"
            control={control}
            rules={{ required: "시/도는 필수 항목입니다." }}
            render={({ field }) => (
              <TextField
                {...field}
                required
                fullWidth
                label="시/도"
                autoComplete="address-level1"
                error={!!errors.state}
                helperText={errors.state?.message}
                inputProps={{ maxLength: 30 }}
              />
            )}
          />
          <Controller
            name="city"
            control={control}
            rules={{ required: "시/군/구는 필수 항목입니다." }}
            render={({ field }) => (
              <TextField
                {...field}
                required
                fullWidth
                label="시/군/구"
                autoComplete="address-level2"
                error={!!errors.city}
                helperText={errors.city?.message}
                inputProps={{ maxLength: 30 }}
              />
            )}
          />
        </Box>

        {/* 상세주소 (1열) */}
        <Box sx={{ mb: 3 }}>
          <Controller
            name="detail"
            control={control}
            rules={{ required: "상세주소는 필수 항목입니다." }}
            render={({ field }) => (
              <TextField
                {...field}
                required
                fullWidth
                label="상세주소"
                autoComplete="street-address"
                error={!!errors.detail}
                helperText={errors.detail?.message}
                inputProps={{ maxLength: 100 }}
              />
            )}
          />
        </Box>

        {/* 회원가입 버튼 */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 1, mb: 3, py: 1.5 }}
          disabled={!isEmailVerified || loading}
        >
          {loading ? <CircularProgress size={24} /> : "회원가입"}
        </Button>

        {/* 로그인 링크 */}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <MuiLink component={RouterLink} to="/login" variant="body2">
            이미 계정이 있으신가요? 로그인
          </MuiLink>
        </Box>

        {/* 우편번호 검색 다이얼로그 */}
        <Dialog
          open={openAddressModal}
          onClose={() => setOpenAddressModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DaumPostcode onComplete={handleAddressComplete} />
        </Dialog>
      </Box>
    </FormContainer>
  );
};

export default SignUp;
