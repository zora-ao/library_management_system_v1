import { api } from "@/services/api";
import type { DsaRequest, DsaResponse } from "./types";

export async function runDsaBookOperation(payload: DsaRequest): Promise<DsaResponse> {
  const { data } = await api.post<DsaResponse>("/dsa/books/run", payload);
  return data;
}
