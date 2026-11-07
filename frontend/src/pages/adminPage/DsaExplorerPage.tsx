import { useState } from "react";
import { Braces, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DsaComplexityReference } from "@/features/dsa/components/DsaComplexityReference";
import { DsaOperationForm } from "@/features/dsa/components/DsaOperationForm";
import { DsaResultPanel } from "@/features/dsa/components/DsaResultPanel";
import type { DsaRequest } from "@/features/dsa/types";
import { useDsaExplorer } from "@/hooks/useDsaExplorer";

export default function DsaExplorerPage() {
  const mutation = useDsaExplorer();
  const [lastRequest, setLastRequest] = useState<DsaRequest | null>(null);

  const run = (request: DsaRequest) => {
    setLastRequest(request);
    mutation.mutate(request);
  };

  const resetResult = () => {
    setLastRequest(null);
    mutation.reset();
  };

  return (
    <div className="w-full space-y-7 pb-10">
      <header className="space-y-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-sm"><Braces className="size-4" /> Staff learning workspace</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">Educational DSA Explorer</h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">Run custom Python algorithms against one read-only snapshot of active books. Production catalog search, sorting, borrowing, and authentication remain unchanged.</p>
        <p className="flex max-w-3xl items-start gap-2 rounded-xl border border-success/25 bg-success-soft p-3 text-sm text-success"><ShieldCheck className="mt-0.5 size-4 shrink-0" /> Each execution starts only when you press Run and uses the backend's existing staff authorization.</p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <aside className="space-y-6 xl:sticky xl:top-6">
          <Card className="booky-glass">
            <CardHeader><CardTitle>Configure an operation</CardTitle><CardDescription>Inputs map directly to POST /api/dsa/books/run.</CardDescription></CardHeader>
            <CardContent><DsaOperationForm pending={mutation.isPending} onRun={run} onOperationChange={resetResult} /></CardContent>
          </Card>
          <DsaComplexityReference />
        </aside>

        <main className="min-w-0">
          <DsaResultPanel
            response={mutation.data}
            error={mutation.error}
            pending={mutation.isPending}
            onRetry={() => lastRequest && mutation.mutate(lastRequest)}
          />
        </main>
      </div>
    </div>
  );
}
