export const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const err: any = error;
  const customMessage =
    err?.response?.data?.message ??
    err?.data?.message ??
    err?.message ??
    err?.error?.message;
  return typeof customMessage === "string" ? customMessage : fallback;
};
