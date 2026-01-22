import React from "react";
import { hasRole, UserRole, AuctionStatus } from "@moreauction/types";
import { useAuth } from "@moreauction/auth";
import HomeHeroSection from "@/features/home/pages/Home/components/HomeHeroSection";
import HomeRecommendationsSection from "@/features/home/pages/Home/components/HomeRecommendationsSection";
import HomeAuctionStatusSection from "@/features/home/pages/Home/components/HomeAuctionStatusSection";

// 홈: 상단 히어로 섹션 + 상품 목록
const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const isSeller = hasRole(user?.roles, UserRole.SELLER);

  let secondaryLabel = "판매자 등록하기";
  let secondaryTo: string = "/seller/register";

  if (!isAuthenticated) {
    secondaryLabel = "판매자 등록 안내";
    secondaryTo = "/login";
  } else if (isSeller) {
    secondaryLabel = "상품 등록하기";
    secondaryTo = "/products/new";
  }

  return (
    <>
      <HomeHeroSection
        secondaryLabel={secondaryLabel}
        secondaryTo={secondaryTo}
      />
      <HomeRecommendationsSection
        isAuthenticated={isAuthenticated}
        userId={user?.userId}
      />
      <HomeAuctionStatusSection
        title="지금 진행 중인 경매"
        description="마감이 가까운 경매를 한눈에 살펴보세요."
        status={[AuctionStatus.IN_PROGRESS]}
        to="/search?status=IN_PROGRESS&page=0&size=20"
        emptyTitle="현재 진행 중인 경매가 없습니다"
        emptyDescription="곧 새로운 경매가 열릴 예정입니다. 알림을 켜두고 가장 먼저 확인해보세요."
      />
      <HomeAuctionStatusSection
        title="곧 시작하는 경매"
        description="곧 시작 예정인 경매를 미리 확인해 보세요."
        status={[AuctionStatus.READY]}
        to="/search?status=READY&page=0&size=20"
        emptyTitle="곧 시작하는 경매가 없습니다"
        emptyDescription="원하는 상품을 검색하거나 찜을 등록해두면 시작 알림을 받아볼 수 있습니다."
      />
    </>
  );
};

export default Home;
