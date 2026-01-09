import { createBrowserRouter } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminAuctions from "@/pages/admin/AdminAuctions";
import AdminSettlements from "@/pages/admin/AdminSettlements";
import AdminPlaceholder from "@/pages/admin/AdminPlaceholder";
import ProtectedRoute from "@/routes/ProtectedRoute";

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
            element: <AdminAuctions />,
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
            element: <AdminOrders />,
          },
          {
            path: "settlements",
            element: <AdminSettlements />,
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
