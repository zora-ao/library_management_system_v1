import type { DsaRun } from "../types";
import { algorithmName } from "../format";

function barWidth(value: number, maximum: number): string {
  if (value <= 0 || maximum <= 0) return "0%";
  return `${Math.max(4, (value / maximum) * 100)}%`;
}

export function DsaMetricVisualization({ runs }: { runs: DsaRun[] }) {
  const maximum = Math.max(0, ...runs.flatMap((run) => [run.metrics.preprocessing_ns, run.metrics.algorithm_ns]));

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-muted/35 p-4" role="img" aria-label="Measured execution time comparison">
      <div>
        <h3 className="font-semibold">Measured time comparison</h3>
        <p className="text-xs text-muted-foreground">Relative bars use the backend's single-run nanosecond measurements.</p>
      </div>
      {runs.map((run) => (
        <div key={run.algorithm} className="space-y-2">
          <p className="text-xs font-medium">{algorithmName(run.algorithm)}</p>
          {run.metrics.preprocessing_ns > 0 && (
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-label={`${algorithmName(run.algorithm)} preprocessing: ${run.metrics.preprocessing_ns.toLocaleString()} ns`}>
              <div className="h-full rounded-full bg-chart-5" style={{ width: barWidth(run.metrics.preprocessing_ns, maximum) }} />
            </div>
          )}
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-label={`${algorithmName(run.algorithm)} execution: ${run.metrics.algorithm_ns.toLocaleString()} ns`}>
            <div className="h-full rounded-full bg-chart-1" style={{ width: barWidth(run.metrics.algorithm_ns, maximum) }} />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span><i className="mr-1 inline-block size-2 rounded-full bg-chart-5" />Preprocessing</span>
        <span><i className="mr-1 inline-block size-2 rounded-full bg-chart-1" />Algorithm execution</span>
      </div>
    </section>
  );
}
