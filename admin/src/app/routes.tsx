import { createBrowserRouter } from "react-router-dom";
import AdminLayout from "@/shared/components/AdminLayout";
import Login from "@/features/auth/pages/Login";
import AdminDashboard from "@/features/admin-dashboard/pages/AdminDashboard";
import AdminOrders from "@/features/orders/pages/AdminOrders";
import AdminAuctions from "@/features/auctions/pages/AdminAuctions";
import AdminSettlements from "@/features/settlements/pages/AdminSettlements";
import AdminProducts from "@/features/products/pages/AdminProducts";
import AdminPlaceholder from "@/shared/components/AdminPlaceholder";
import ProtectedRoute from "./ProtectedRoute";
import AdminUsers from "@/features/users/pages/AdminUsers";
import AdminPayments from "@/features/payments/pages/AdminPayments";

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
            element: <AdminUsers />,
          },
          {
            path: "auctions",
            element: <AdminAuctions />,
          },
          {
            path: "products",
            element: <AdminProducts />,
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
            path: "payments",
            element: <AdminPayments />,
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
