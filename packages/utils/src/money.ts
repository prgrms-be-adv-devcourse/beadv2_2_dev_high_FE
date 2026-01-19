const numberFormater = new Intl.NumberFormat("ko-KR");

const parseNumber = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/,/g, "");
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  }
  return null;
};

export const formatNumber = (value: unknown, fallback = "-") => {
  const num = parseNumber(value);
  if (num == null) return fallback;
  return numberFormater.format(Math.round(num));
};

export const formatWon = (value: unknown, fallback = "-") => {
  const num = parseNumber(value);
  if (num == null) return fallback;
  return `${numberFormater.format(Math.round(num))}원`;
};
