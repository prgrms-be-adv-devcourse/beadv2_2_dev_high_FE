import React, { useEffect, useState } from "react";
import { parseISO, isValid } from "date-fns";
import type { AuctionStatus } from "@moreauction/types";

interface RemainingTimeProps {
  auctionStartAt?: string;
  auctionEndAt?: string;
  status?: AuctionStatus;
}

const RemainingTime: React.FC<RemainingTimeProps> = ({
  auctionStartAt,
  auctionEndAt,
  status,
}) => {
  const [timeString, setTimeString] = useState("로딩 중...");

  useEffect(() => {
    if (!auctionEndAt) return;

    const endTime = parseISO(auctionEndAt);
    if (!isValid(endTime)) {
      setTimeString("유효하지 않은 종료 시간");
      return;
    }

    const update = () => {
      const now = new Date();
      const startTime = auctionStartAt ? parseISO(auctionStartAt) : now;

      const diff = endTime.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeString("경매 종료");
        return;
      }

      if (status === "READY" && now < startTime) {
        setTimeString("경매 시작 전");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeString(
        `${
          days > 0 ? `${days}일 ` : ""
        }${hours}시간 ${minutes}분 ${seconds}초 남음`
      );
    };

    update(); // 즉시 계산
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [auctionEndAt]);

  return <span>{timeString}</span>;
};

export default RemainingTime;
