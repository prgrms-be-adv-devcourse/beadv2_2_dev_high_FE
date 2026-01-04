import React, { useEffect, useMemo, useRef } from "react";
import { TextField, type TextFieldProps } from "@mui/material";
import { formatNumber } from "@moreauction/utils";

type MoneyInputProps = Omit<
  TextFieldProps,
  "value" | "onChange" | "type" | "inputMode"
> & {
  value: string;
  onChangeValue: (nextDigits: string) => void;
};

const countDigits = (value: string) => value.replace(/\D/g, "").length;

const caretFromDigits = (formatted: string, digitsBeforeCaret: number) => {
  if (digitsBeforeCaret <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      seen += 1;
      if (seen >= digitsBeforeCaret) return i + 1;
    }
  }
  return formatted.length;
};

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChangeValue,
  onBlur,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingDigitsBeforeCaretRef = useRef<number | null>(null);

  const formattedValue = useMemo(() => {
    if (!value) return "";
    return formatNumber(value, "");
  }, [value]);

  useEffect(() => {
    const digitsBeforeCaret = pendingDigitsBeforeCaretRef.current;
    if (digitsBeforeCaret == null) return;
    pendingDigitsBeforeCaretRef.current = null;
    if (!inputRef.current) return;
    const nextPos = caretFromDigits(formattedValue, digitsBeforeCaret);
    try {
      inputRef.current.setSelectionRange(nextPos, nextPos);
    } catch {
      // ignore
    }
  }, [formattedValue]);

  return (
    <TextField
      {...props}
      value={formattedValue}
      inputRef={inputRef}
      type="text"
      inputMode="numeric"
      onChange={(e) => {
        const raw = e.target.value ?? "";
        const selectionStart = e.target.selectionStart ?? raw.length;
        const digitsBeforeCaret = countDigits(raw.slice(0, selectionStart));
        let digits = raw.replace(/\D/g, "");
        digits = digits.replace(/^0+(?=\d)/, "");
        pendingDigitsBeforeCaretRef.current = digitsBeforeCaret;
        onChangeValue(digits);
      }}
      onBlur={onBlur}
    />
  );
};

