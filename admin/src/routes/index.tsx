import { createBrowserRouter } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import Login from "../pages/Login";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminPlaceholder from "../pages/admin/AdminPlaceholder";
import ProtectedRoute from "./ProtectedRoute";

/**
 * React Router v6.4+의 createBrowserRouter를 사용한 라우터 설정입니다.
 * App 컴포넌트가 전체 레이아웃을 감싸고, children으로 각 페이지가 렌더링됩니다.
 */

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboard /> },
          {
            path: "users",
            element: (
              <AdminPlaceholder
                title="회원 관리"
                description="회원 목록, 차단, 권한 관리 기능을 준비 중입니다."
              />
            ),
          },
          {
            path: "auctions",
            element: (
              <AdminPlaceholder
                title="경매 관리"
                description="경매 현황 모니터링 및 중단 기능을 준비 중입니다."
              />
            ),
          },
          {
            path: "products",
            element: (
              <AdminPlaceholder
                title="상품 관리"
                description="상품 검수 및 노출 제어 기능을 준비 중입니다."
              />
            ),
          },
          {
            path: "orders",
            element: (
              <AdminPlaceholder
                title="주문 관리"
                description="주문 상태 변경 및 환불 처리 기능을 준비 중입니다."
              />
            ),
          },
          {
            path: "settings",
            element: (
              <AdminPlaceholder
                title="설정"
                description="수수료/정책 설정 페이지를 준비 중입니다."
              />
            ),
          },
        ],
      },
    ],
  },
]);
