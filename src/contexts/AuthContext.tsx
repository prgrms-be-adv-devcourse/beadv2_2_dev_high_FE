// src/contexts/AuthContext.tsx
import type { LoginResponse } from "../apis/userApi";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CircularProgress } from "@mui/material";
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

let updateAccessTokenExternal: ((newToken: string | null) => void) | null =
  null;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(
    localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user")!)
      : null
  );
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("accessToken")
  );

  const [isAuthenticating, setIsAuthenticating] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (storedToken) setToken(storedToken);
    if (storedUser) setUser(JSON.parse(storedUser));

    setIsAuthenticating(false);
  }, []);

  const login = (data: LoginResponse) => {
    const { accessToken, refreshToken, ...rest } = data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken as string);
    localStorage.setItem("user", JSON.stringify(rest));
    setToken(accessToken);
    setUser(rest);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setToken(null);
    setUser(null);
  };
  const updateAccessToken = (newToken: string | null) => {
    if (!newToken) {
      localStorage.removeItem("accessToken");
      setToken(newToken);
      return;
    }
    localStorage.setItem("accessToken", newToken);
    setToken(newToken); // React 상태 갱신
  };
  updateAccessTokenExternal = updateAccessToken;

  const isAuthenticated = !!token && !!user;

  if (isAuthenticating) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export function updateAccessTokenOutsideReact(newToken: string | null) {
  updateAccessTokenExternal?.(newToken);
}
