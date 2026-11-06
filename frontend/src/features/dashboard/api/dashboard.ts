import { api } from "@/services/api";
import type { DashboardSummary } from "../types";

export const getDashboard = async (): Promise<DashboardSummary> => {
  const { data } = await api.get<DashboardSummary>("/dashboard", {
    params: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezone_offset_minutes: new Date().getTimezoneOffset(),
    },
  });
  return data;
};
