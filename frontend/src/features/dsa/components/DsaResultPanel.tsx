import { AlertCircle, CheckCircle2, Database, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DsaResponse, DsaRunMetrics } from "../types";
import { algorithmName } from "../format";
import { DsaMetricVisualization } from "./DsaMetricVisualization";

interface DsaResultPanelProps {
  response?: DsaResponse;
  error: unknown;
  pending: boolean;
  onRetry: () => void;
}

function errorMessage(error: unknown): string {
  return (error as { response?: { data?: { message?: string } }; message?: string })
    ?.response?.data?.message
    ?? (error as { message?: string })?.message
    ?? "Unable to run the DSA operation.";
}

const formatNs = (value: number) => `${value.toLocaleString()} ns`;

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{value}</dd></div>;
}

function RunMetrics({ metrics }: { metrics: DsaRunMetrics }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      <Metric label="Comparisons" value={metrics.comparisons} />
      <Metric label="Writes" value={metrics.writes} />
      <Metric label="Nodes visited" value={metrics.nodes_visited} />
      <Metric label="Execution time" value={formatNs(metrics.algorithm_ns)} />
      {metrics.preprocessing_ns > 0 && <Metric label="Preprocessing time" value={formatNs(metrics.preprocessing_ns)} />}
      {metrics.collisions !== null && <Metric label="Collisions" value={metrics.collisions} />}
      {metrics.capacity !== null && <Metric label="Hash capacity" value={metrics.capacity} />}
      {metrics.load_factor !== null && <Metric label="Load factor" value={metrics.load_factor} />}
      {metrics.tree_height !== null && <Metric label="Tree height" value={metrics.tree_height} />}
      {metrics.tree_size !== null && <Metric label="Tree nodes" value={metrics.tree_size} />}
    </dl>
  );
}

function sameResultIds(response: DsaResponse): boolean {
  if (response.runs.length < 2) return false;
  const baseline = response.runs[0].result_ids;
  return response.runs.slice(1).every((run) => run.result_ids.length === baseline.length
    && run.result_ids.every((id, index) => id === baseline[index]));
}

export function DsaResultPanel({ response, error, pending, onRetry }: DsaResultPanelProps) {
  if (pending) {
    return <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card"><LoadingState label="Running Python algorithms" /><p className="text-sm text-muted-foreground">Processing one active-catalog snapshot in Python…</p></div>;
  }
  if (error) {
    return (
      <div role="alert" className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <AlertCircle className="size-6 text-destructive" />
        <div><h2 className="font-semibold text-destructive">DSA execution failed</h2><p className="mt-1 text-sm text-muted-foreground">{errorMessage(error)}</p></div>
        <Button type="button" variant="outline" onClick={onRetry}><RotateCcw /> Try again</Button>
      </div>
    );
  }
  if (!response) {
    return <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center"><Database className="mb-3 size-8 text-muted-foreground" /><h2 className="font-semibold">No DSA run yet</h2><p className="mt-1 max-w-md text-sm text-muted-foreground">Choose an operation and explicitly run it. Opening this page never queries the catalog.</p></div>;
  }

  return (
    <div className="space-y-5" aria-live="polite">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-[var(--glass-shadow)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Active catalog snapshot</p><h2 className="mt-1 text-xl font-semibold">{response.dataset.size.toLocaleString()} active books</h2></div>
          <Badge variant="secondary">{response.results.length} returned</Badge>
        </div>
        {sameResultIds(response) && <p className="mt-4 flex items-center gap-2 rounded-xl bg-success-soft p-3 text-sm text-success"><CheckCircle2 className="size-4" /> Compared algorithms returned the same ordered record IDs.</p>}
      </section>

      <DsaMetricVisualization runs={response.runs} />

      <section className="space-y-4" aria-label="Algorithm runs">
        {response.runs.map((run) => (
          <article key={run.algorithm} className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-[var(--glass-shadow)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{algorithmName(run.algorithm)}</h3><p className="text-sm text-muted-foreground">{run.result_ids.length} result ID{run.result_ids.length === 1 ? "" : "s"}</p></div><Badge variant="outline">Python implementation</Badge></div>
            <RunMetrics metrics={run.metrics} />
            <div className="grid gap-2 rounded-2xl border border-border bg-control p-4 sm:grid-cols-2"><p className="text-sm"><span className="font-semibold">Time:</span> {run.complexity.time}</p><p className="text-sm"><span className="font-semibold">Space:</span> {run.complexity.space}</p></div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--glass-shadow)]" aria-labelledby="dsa-results-heading">
        <div className="border-b border-border p-5"><h2 id="dsa-results-heading" className="text-xl font-semibold">Returned records</h2><p className="mt-1 text-sm text-muted-foreground">Final records only; the API does not return invented intermediate steps.</p></div>
        {response.results.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No records matched this operation.</p> : (
          <Table className="min-w-[720px]">
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Author</TableHead><TableHead>ISBN</TableHead><TableHead>Available</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
            <TableBody>{response.results.map((book) => <TableRow key={book.id}><TableCell className="font-medium">{book.title}</TableCell><TableCell>{book.author}</TableCell><TableCell>{book.isbn ?? "—"}</TableCell><TableCell>{book.available_copies}</TableCell><TableCell>{book.created_at ? new Date(book.created_at).toLocaleDateString() : "—"}</TableCell></TableRow>)}</TableBody>
          </Table>
        )}
      </section>

      {response.notes.length > 0 && <aside className="rounded-2xl border border-warning/30 bg-warning-soft p-4"><h2 className="font-semibold text-warning">Backend notes</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{response.notes.map((note) => <li key={note}>{note}</li>)}</ul></aside>}
    </div>
  );
}
