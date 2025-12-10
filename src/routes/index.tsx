import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import SignUp from "../pages/SignUp";
import SellerRegistration from "../pages/SellerRegistration";
import App from "../App";
import Products from "../pages/Products";
import ProductDetail from "../pages/ProductDetail";
import Auctions from "../pages/Auctions";
import AuctionDetail from "../pages/AuctionDetail";
import ProtectedRoute from "./ProtectedRoute";
import ProductRegistration from "../pages/ProductRegistration";
import AuctionRegistration from "../pages/AuctionRegistration";

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
        // 판매자 등록 페이지는 인증된 사용자만 접근 가능
        element: <ProtectedRoute />, // TODO: 실제 인증 상태 연결
        children: [
          {
            path: "seller/register",
            element: <SellerRegistration />,
          },
          {
            path: "product/new",
            element: <ProductRegistration />,
          },
          {
            path: "auction/new",
            element: <AuctionRegistration />,
          },
        ],
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
        path: "auctions",
        element: <Auctions />,
      },
      {
        path: "auctions/:id",
        element: <AuctionDetail />,
      },
    ],
  },
]);
