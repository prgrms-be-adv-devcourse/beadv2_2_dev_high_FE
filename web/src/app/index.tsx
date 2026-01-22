import { createBrowserRouter } from "react-router-dom";
import App from "@/app/App";
import AuctionDetail from "@/features/auctions/pages/AuctionDetail";
import AuctionRegistration from "@/features/auctions/pages/AuctionRegistration";
import Home from "@/features/home/pages/Home";
import Guide from "@/features/guide/pages/Guide";
import Login from "@/features/auth/pages/Login";
import MyPage from "@/features/mypage/pages/MyPage";
import Notifications from "@/features/notifications/pages/Notifications";
import ProductDetail from "@/features/products/pages/ProductDetail";
import PendingOrders from "@/features/orders/pages/PendingOrders";
import Settings from "@/features/settings/pages/Settings";
import ProfileAddresses from "@/features/profile/pages/ProfileAddresses";
import ProfileEdit from "@/features/profile/pages/ProfileEdit";
import ProfilePassword from "@/features/profile/pages/ProfilePassword";
import ProductRegistration from "@/features/products/pages/ProductRegistration";
import SellerRegistration from "@/features/auth/pages/SellerRegistration";
import SignUp from "@/features/auth/pages/SignUp";
import Wishlist from "@/features/wishlist/pages/Wishlist";
import ProtectedRoute from "@/app/ProtectedRoute";
import PaymentSuccess from "@/features/payments/pages/PaymentSuccess";
import PaymentFail from "@/features/payments/pages/PaymentFail";
import SearchPage from "@/features/search/pages/Search";
import OrderDetail from "@/features/orders/pages/OrderDetail";
import OAuthRedirect from "@/features/auth/pages/oauth/OAuthRedirect";
import NotFound from "@/shared/pages/NotFound";

/**
 * React Router v6.4+의 createBrowserRouter를 사용한 라우터 설정입니다.
 * App 컴포넌트가 전체 레이아웃을 감싸고, children으로 각 페이지가 렌더링됩니다.
 */

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    // TODO: 에러 페이지 컴포넌트 추가
    // errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "search",
        element: <SearchPage />,
      },
      {
        path: "guide",
        element: <Guide />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "oauth/google/redirect",
        element: <OAuthRedirect provider="google" />,
      },
      {
        path: "oauth/naver/redirect",
        element: <OAuthRedirect provider="naver" />,
      },
      {
        path: "signup",
        element: <SignUp />,
      },
      {
        path: "products/:id",
        element: <ProductDetail />,
      },

      {
        path: "auctions/:id",
        element: <AuctionDetail />,
      },
      {
        path: "payment/success",
        element: <PaymentSuccess />,
      },
      {
        path: "payment/fail",
        element: <PaymentFail />,
      },
      {
        // 판매자 등록 페이지는 인증된 사용자만 접근 가능
        element: <ProtectedRoute />, // TODO: 실제 인증 상태 연결
        children: [
          {
            path: "seller/register",
            element: <SellerRegistration />,
          },
          {
            path: "products/:productId/edit",
            element: <ProductRegistration />,
          },
          {
            path: "products/new",
            element: <ProductRegistration />,
          },

          {
            path: "auctions/:auctionId/edit",
            element: <AuctionRegistration />,
          },

          {
            path: "auctions/new",
            element: <AuctionRegistration />,
          },
          {
            path: "auctions/new/:productId",
            element: <AuctionRegistration />,
          },
          {
            path: "auctions/re-register/:productId",
            element: <AuctionRegistration />,
          },
          {
            path: "notifications",
            element: <Notifications />,
          },
          {
            path: "mypage",
            element: <MyPage />,
          },
          {
            path: "settings",
            element: <Settings />,
          },
          {
            path: "profile",
            element: <Settings />,
          },
          {
            path: "profile/edit",
            element: <ProfileEdit />,
          },
          {
            path: "profile/password",
            element: <ProfilePassword />,
          },
          {
            path: "profile/addresses",
            element: <ProfileAddresses />,
          },
          {
            path: "wishlist", // 찜 목록 라우트 추가
            element: <Wishlist />,
          },
          {
            path: "orders", // 결제 대기 주문서 라우트
            element: <PendingOrders />,
          },
          {
            path: "orders/:orderId",
            element: <OrderDetail />,
          },
        ],
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);
