// src/contexts/AuthProvider.tsx
import React, { useState, type ReactNode, useEffect } from "react";
import { type User, type UserRole, AuthContext } from "./AuthContext";
import { jwtDecode } from "jwt-decode"; // jwt-decode 임포트
import CircularProgress from "@mui/material/CircularProgress"; // CircularProgress 임포트
import type { LoginResponse } from "../apis/userApi";
import { set } from "date-fns";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(
    localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user")!)
      : null
  );
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("accessToken")
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem("refreshToken")
  );

  const [isAuthenticating, setIsAuthenticating] = useState(true); // 인증 중 상태 추가

  // 초기 로드 시 localStorage에서 토큰 및 사용자 정보 복구
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("accessToken");
      const storedRefresh = localStorage.getItem("refreshToken");

      const storedUser = localStorage.getItem("user");

      if (storedToken) {
        setToken(storedToken);

        if (storedUser) {
          // localStorage에 user 정보가 있으면 바로 사용
          setUser(JSON.parse(storedUser));
        } else {
          try {
            // profile 불러오기?
            // localStorage.setItem("user", JSON.stringify());
          } catch (error) {
            console.error("Failed to decode token on initialization:", error);
          }
        }
        if (storedRefresh) {
          setRefreshToken(storedRefresh);
        }
      }
      setIsAuthenticating(false); // 인증 초기화 완료
    };

    initializeAuth();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  const isAuthenticated = !!token && !!refreshToken;

  const login = (data: LoginResponse) => {
    const { accessToken, refreshToken, ...rest } = data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken || "");
    localStorage.setItem("user", JSON.stringify(rest)); // 새 User 정보 저장
    setToken(accessToken);

    setUser(rest); // 상태 업데이트
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    setUser(null);
    setToken(null);
  };

  if (isAuthenticating) {
    // 인증 초기화 중일 때 로딩 스피너 등을 표시
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
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
