import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { AuctionRankingResponse } from "@moreauction/types";
import { auctionApi } from "@/apis/auctionApi";
import { queryKeys } from "@/shared/queries/queryKeys";

export const useTopAuctions = (limit = 3) => {
  const [disableRefetch, setDisableRefetch] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.auctions.topToday(limit),
    queryFn: async () => {
      const res = await auctionApi.getTopAuctions(limit);
      return res.data as AuctionRankingResponse[];
    },
    staleTime: 10_000,
    refetchInterval: disableRefetch ? false : 10_000,
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (query.isError) {
      setDisableRefetch(true);
    }
  }, [query.isError]);

  return query;
};
