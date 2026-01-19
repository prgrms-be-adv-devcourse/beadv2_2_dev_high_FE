/// <reference types="react" />
/// <reference types="react/jsx-runtime" />
import type { LoginResponse, User } from "@moreauction/types";
import { CircularProgress } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (res: LoginResponse) => void;
  logout: () => void;
  updateUser: (nextUser: User) => void;
}

export interface AuthProviderProps {
  children: ReactNode;
  onLogoutRequest?: () => Promise<unknown> | void;
  normalizeUser?: (user: User) => User;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

let updateAccessTokenExternal: ((newToken: string | null) => void) | null =
  null;
const LOGGED_IN_FLAG = "auth_logged_in";

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  onLogoutRequest,
  normalizeUser,
}) => {
  const queryClient = useQueryClient();
  const isLoggingOutRef = useRef(false);
  const normalize = useCallback(
    (nextUser: User | null): User | null => {
      if (!nextUser) return null;
      return normalizeUser ? normalizeUser(nextUser) : nextUser;
    },
    [normalizeUser]
  );

  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? normalize(JSON.parse(storedUser)) : null;
  });

  const clearQueryCache = useCallback(() => {
    queryClient.cancelQueries();
    queueMicrotask(() => {
      queryClient.clear();
    });
  }, [queryClient]);

  const finalizeLogout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("depositBalance");
    localStorage.removeItem(LOGGED_IN_FLAG);
    setUser(null);
    clearQueryCache();
  }, [clearQueryCache]);

  const [isAuthenticating, setIsAuthenticating] = useState(true);

  const login = (data: LoginResponse) => {
    const { accessToken, ...rest } = data;
    const normalizedUser = normalize(rest as User);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem(LOGGED_IN_FLAG, "true");
    setUser(normalizedUser);
  };

  const updateUser = useCallback(
    (nextUser: User) => {
      const normalizedUser = normalize(nextUser) as User;
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      setUser(normalizedUser);
    },
    [normalize]
  );

  const logout = useCallback(() => {
    if (isLoggingOutRef.current) {
      finalizeLogout();
      return;
    }
    isLoggingOutRef.current = true;
    finalizeLogout();
    if (onLogoutRequest) {
      Promise.resolve(onLogoutRequest())
        .catch((error) => {
          console.warn("로그아웃 API 실패:", error);
        })
        .finally(() => {
          isLoggingOutRef.current = false;
        });
      return;
    }
    isLoggingOutRef.current = false;
  }, [finalizeLogout, onLogoutRequest]);

  const updateAccessToken = useCallback(
    (newToken: string | null) => {
      if (!newToken) {
        logout();
        return;
      }
      localStorage.setItem("accessToken", newToken);
    },
    [logout]
  );

  useEffect(() => {
    updateAccessTokenExternal = updateAccessToken;
    return () => {
      if (updateAccessTokenExternal === updateAccessToken) {
        updateAccessTokenExternal = null;
      }
    };
  }, [updateAccessToken]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const wasLoggedIn = localStorage.getItem(LOGGED_IN_FLAG) === "true";
    if (!storedUser && wasLoggedIn) {
      logout();
    }
    setIsAuthenticating(false);
  }, [logout]);

  const isAuthenticated = !!user;

  useEffect(() => {
    if (isAuthenticating) return;
    const wasLoggedIn = localStorage.getItem(LOGGED_IN_FLAG) === "true";
    if (!user && wasLoggedIn) {
      logout();
    }
  }, [isAuthenticating, logout, user]);

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
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function updateAccessTokenOutsideReact(newToken: string | null) {
  updateAccessTokenExternal?.(newToken);
}
