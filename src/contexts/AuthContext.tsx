// src/contexts/AuthContext.tsx
import { createContext } from "react";
import type { LoginResponse } from "../apis/userApi";

export const UserRole = {
  ADMIN: "ADMIN",
  SELLER: "SELLER",
  USER: "USER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export interface User {
  id?: string;
  name?: string;
  email?: string;
  nickname?: string;
  role?: UserRole;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (res: LoginResponse) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
