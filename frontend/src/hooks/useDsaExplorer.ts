import { useMutation } from "@tanstack/react-query";
import { runDsaBookOperation } from "@/features/dsa/api";

export const useDsaExplorer = () => useMutation({
  mutationFn: runDsaBookOperation,
  retry: false,
});
