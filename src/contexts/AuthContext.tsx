// src/contexts/AuthContext.tsx
import { createContext } from "react";

export interface User {
  id?: string;
  name?: string;
  email?: string;
  nickName?: string;
  role?: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (accessToken: string, refresh: string, user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
