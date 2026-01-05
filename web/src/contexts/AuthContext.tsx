// src/contexts/AuthContext.tsx
import {
  normalizeRoles,
  type LoginResponse,
  type User,
} from "@moreauction/types";
import { CircularProgress } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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
  const queryClient = useQueryClient();
  const normalizeUser = (nextUser: User | null): User | null => {
    if (!nextUser) return null;
    return { ...nextUser, roles: normalizeRoles(nextUser.roles) };
  };

  const [user, setUser] = useState<User | null>(
    localStorage.getItem("user")
      ? normalizeUser(JSON.parse(localStorage.getItem("user")!))
      : null
  );
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("accessToken")
  );

  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [wasAuthenticated, setWasAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    // 토큰은 있는데 유저 정보가 없는 비정상 상태는
    // 실제로는 로그아웃된 상태로 간주하고 정리한다.
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(normalizeUser(JSON.parse(storedUser)));
    } else if (storedToken && !storedUser) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setToken(null);
      setUser(null);
    } else {
      setToken(null);
      setUser(null);
    }

    setIsAuthenticating(false);
  }, []);

  const login = (data: LoginResponse) => {
    const { accessToken, refreshToken, ...rest } = data;
    const normalizedUser = normalizeUser(rest);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken as string);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    setToken(accessToken);
    setUser(normalizedUser);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("sessionExpired");
    localStorage.removeItem("depositBalance");
    setToken(null);
    setUser(null);
    queryClient.clear();
  };
  const updateAccessToken = (newToken: string | null) => {
    if (!newToken) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("depositBalance");
      setToken(null);
      setUser(null);
      queryClient.clear();
      return;
    }
    localStorage.setItem("accessToken", newToken);
    setToken(newToken); // React 상태 갱신
  };
  updateAccessTokenExternal = updateAccessToken;

  const isAuthenticated = !!token && !!user;

  // "로그인 상태였다가 비로그인 상태로" 전환될 때만
  // 세션 만료/로그아웃 안내를 한 번 띄운다.
  useEffect(() => {
    if (isAuthenticating) return;

    if (!isAuthenticated && wasAuthenticated) {
      const expiredFlag = localStorage.getItem("sessionExpired");
      if (expiredFlag) {
        alert(
          "로그인 정보가 만료되어 자동으로 로그아웃되었습니다.\n다시 로그인해 주세요."
        );
        localStorage.removeItem("sessionExpired");
      }
    }

    if (wasAuthenticated !== isAuthenticated) {
      setWasAuthenticated(isAuthenticated);
    }
  }, [isAuthenticating, isAuthenticated, wasAuthenticated]);

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
