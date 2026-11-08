import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const rows = [
  ["Linear search", "O(n) / O(n × m) contains", "O(k) output"],
  ["Binary search", "O(log n + k), after sorting", "O(k), plus sorted copy"],
  ["Merge sort", "O(n log n)", "O(n)"],
  ["Hash lookup", "Average O(1), worst O(n)", "O(n + c)"],
  ["Balanced BST range", "O(log n + k), after build", "O(n) tree"],
];

export function DsaComplexityReference() {
  return (
    <Card className="booky-glass">
      <CardHeader><CardTitle>How to read this explorer</CardTitle><CardDescription>The backend returns the selected run's exact theoretical metadata and measured counters.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead><tr className="border-b border-border"><th className="py-2 pr-3">Algorithm</th><th className="py-2 pr-3">Time</th><th className="py-2">Auxiliary/output space</th></tr></thead>
            <tbody>{rows.map(([name, time, space]) => <tr key={name} className="border-b border-border/60 last:border-0"><th className="py-2 pr-3 font-medium">{name}</th><td className="py-2 pr-3">{time}</td><td className="py-2">{space}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">Preprocessing is reported separately from lookup. Nanosecond values are one live educational sample, not a reproducible benchmark or proof of Big-O.</p>
      </CardContent>
    </Card>
  );
}
