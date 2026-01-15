import type { User } from "@moreauction/types";

export const getUserLabel = (user?: User | null): string | null => {
  if (!user) return null;
  const nickname = user.nickname?.trim();
  const email = user.email?.trim();
  if (nickname && email) return `${nickname} (${email})`;
  if (nickname) return nickname;
  if (email) return email;
  return null;
};
