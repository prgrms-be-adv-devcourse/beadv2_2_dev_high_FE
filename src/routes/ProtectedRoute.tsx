import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  redirectPath?: string;
}

/**
 * 인증된 사용자만 접근할 수 있는 페이지를 위한 라우트 컴포넌트입니다.
 * useAuth 훅을 사용하여 인증 상태를 확인합니다.
 * @param redirectPath - 인증되지 않았을 경우 리디렉션할 경로 (기본값: '/login')
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  redirectPath = "/login",
}) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // 사용자가 인증되지 않았으면 로그인 페이지로 리디렉션합니다.
    return <Navigate to={redirectPath} replace />;
  }

  // 사용자가 인증되었으면 요청된 페이지(Outlet)를 렌더링합니다.
  return <Outlet />;
};

export default ProtectedRoute;
