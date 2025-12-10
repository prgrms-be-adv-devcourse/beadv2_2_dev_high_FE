import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import AuctionDetail from "../pages/AuctionDetail";
import AuctionRegistration from "../pages/AuctionRegistration";
import Home from "../pages/Home";
import Login from "../pages/Login";
import MyPage from "../pages/MyPage";
import Notifications from "../pages/Notifications";
import ProductDetail from "../pages/ProductDetail";
import PendingOrders from "../pages/PendingOrders"; // 새로운 임포트
import ProductRegistration from "../pages/ProductRegistration";
import Products from "../pages/Products";
import SellerRegistration from "../pages/SellerRegistration";
import SignUp from "../pages/SignUp";
import Wishlist from "../pages/Wishlist"; // 새로운 임포트
import ProtectedRoute from "./ProtectedRoute";
import PaymentSuccess from "../pages/payment/PaymentSuccess";
import PaymentFail from "../pages/payment/PayementFail";

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
        path: "login",
        element: <Login />,
      },
      {
        path: "signup",
        element: <SignUp />,
      },
      {
        path: "products",
        element: <Products />,
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
            element: <ProductRegistration />,
          },

          {
            path: "auctions/new",
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
            path: "wishlist", // 찜 목록 라우트 추가
            element: <Wishlist />,
          },
          {
            path: "pending-orders", // 결제 대기 주문서 라우트 추가
            element: <PendingOrders />,
          },
        ],
      },
    ],
  },
]);
