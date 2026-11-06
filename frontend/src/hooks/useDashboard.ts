import { getDashboard } from "@/features/dashboard/api/dashboard";
import { useQuery } from "@tanstack/react-query";

const DASHBOARD_STALE_TIME_MS = 15 * 1000;

export const useDashboard = () => useQuery({
  queryKey: ["dashboard"],
  queryFn: getDashboard,
  staleTime: DASHBOARD_STALE_TIME_MS,
  refetchOnWindowFocus: true,
});
