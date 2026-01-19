// src/contexts/AuthContext.tsx
import type { LoginResponse, User } from "@moreauction/types";
import { CircularProgress } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { userApi } from "@/apis/userApi";

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
const LOGGED_IN_FLAG = "auth_logged_in";

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const isLoggingOutRef = useRef(false);
  const clearQueryCache = () => {
    queryClient.cancelQueries();
    queueMicrotask(() => {
      queryClient.clear();
    });
  };
  const finalizeLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("depositBalance");
    localStorage.removeItem(LOGGED_IN_FLAG);
    setUser(null);
    clearQueryCache();
  };
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? (JSON.parse(storedUser) as User) : null;
  });
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const wasLoggedIn = localStorage.getItem(LOGGED_IN_FLAG) === "true";

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      if (wasLoggedIn) {
        logout();
      }
      setUser(null);
    }

    setIsAuthenticating(false);
  }, []);

  const login = (data: LoginResponse) => {
    const { accessToken, ...rest } = data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("user", JSON.stringify(rest));
    localStorage.setItem(LOGGED_IN_FLAG, "true");
    setUser(rest);
  };

  const logout = () => {
    if (isLoggingOutRef.current) {
      finalizeLogout();
      return;
    }
    isLoggingOutRef.current = true;
    finalizeLogout();
    userApi.logout().catch((error) => {
      console.warn("로그아웃 API 실패:", error);
    });
    isLoggingOutRef.current = false;
  };
  const updateAccessToken = (newToken: string | null) => {
    if (!newToken) {
      logout();
      return;
    }
    localStorage.setItem("accessToken", newToken);
  };
  updateAccessTokenExternal = updateAccessToken;

  const isAuthenticated = !!user;

  useEffect(() => {
    if (isAuthenticating) return;
    const wasLoggedIn = localStorage.getItem(LOGGED_IN_FLAG) === "true";
    if (!user && wasLoggedIn) {
      logout();
    }
  }, [isAuthenticating, user]);

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
