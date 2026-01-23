export const validatePassword = (value: string): string | null => {
  if (!value) return "비밀번호는 필수 항목입니다.";
  if (value.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[^a-zA-Z0-9]/.test(value);
  if (!hasLetter || !hasNumber || !hasSpecial) {
    return "비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.";
  }

  for (let i = 0; i < value.length - 2; i++) {
    const char1 = value.charCodeAt(i);
    const char2 = value.charCodeAt(i + 1);
    const char3 = value.charCodeAt(i + 2);
    if (char2 === char1 + 1 && char3 === char2 + 1) {
      return "비밀번호에 연속된 숫자(3자 이상)를 사용할 수 없습니다.";
    }
    if (
      char2 === char1 + 1 &&
      char3 === char2 + 1 &&
      ((char1 >= 65 && char1 <= 90) || (char1 >= 97 && char1 <= 122))
    ) {
      return "비밀번호에 연속된 알파벳(3자 이상)를 사용할 수 없습니다.";
    }
  }

  return null;
};
