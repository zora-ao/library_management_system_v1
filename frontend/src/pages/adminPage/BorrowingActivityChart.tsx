import type { ReactElement } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BorrowingActivityDatum {
  date: Date;
  label: string;
  loans: number;
  returns: number;
}

interface BorrowingActivityChartProps {
  activity: BorrowingActivityDatum[];
}

interface BorrowingActivityTooltipPayload {
  dataKey?: string | number;
  value?: number | string | Array<number | string>;
  payload?: BorrowingActivityDatum;
}

export interface BorrowingActivityTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: BorrowingActivityTooltipPayload[];
}

const formatFullDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);

const getCount = (
  payload: BorrowingActivityTooltipPayload[],
  key: "loans" | "returns",
  fallback: number,
) => {
  const value = payload.find((item) => item.dataKey === key)?.value;
  return typeof value === "number" ? value : fallback;
};

export function BorrowingActivityTooltip({
  active,
  payload = [],
}: BorrowingActivityTooltipProps): ReactElement | null {
  const datum = payload[0]?.payload;
  if (!active || !datum) return null;

  const loans = getCount(payload, "loans", datum.loans);
  const returns = getCount(payload, "returns", datum.returns);

  return (
    <div
      role="status"
      className="min-w-44 rounded-xl border border-border bg-popover/95 p-3 text-popover-foreground shadow-[var(--elevation-lg)] backdrop-blur-md"
    >
      <p className="text-xs font-bold text-foreground">{formatFullDate(datum.date)}</p>
      <div className="mt-2 space-y-1.5 text-sm">
        <p className="flex items-center justify-between gap-5">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <i className="size-2 rounded-full bg-foreground" aria-hidden="true" />
            Loans
          </span>
          <strong>{loans} {loans === 1 ? "loan" : "loans"}</strong>
        </p>
        <p className="flex items-center justify-between gap-5">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <i className="size-2 rounded-full bg-primary" aria-hidden="true" />
            Returns
          </span>
          <strong>{returns} {returns === 1 ? "return" : "returns"}</strong>
        </p>
      </div>
    </div>
  );
}

export default function BorrowingActivityChart({
  activity,
}: BorrowingActivityChartProps): ReactElement {
  return (
    <>
      <div
        role="img"
        aria-label="Loans and returns over the last 7 days"
        className="h-64 w-full min-w-0"
      >
        <LineChart
          accessibilityLayer
          responsive
          data={activity}
          margin={{ top: 12, right: 12, bottom: 4, left: -16 }}
          style={{ width: "100%", height: "100%" }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="4 4"
            strokeOpacity={0.75}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickMargin={10}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            width={34}
            domain={[0, (dataMax: number) => Math.max(1, dataMax)]}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
            content={(props) => (
              <BorrowingActivityTooltip
                active={props.active}
                label={props.label}
                payload={props.payload}
              />
            )}
          />
          <Line
            type="monotone"
            dataKey="loans"
            name="Loans"
            stroke="var(--foreground)"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 5, strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="returns"
            name="Returns"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 5, strokeWidth: 2 }}
          />
        </LineChart>
      </div>

      <table className="sr-only" aria-label="Borrowing activity data">
        <caption>Loans and returns for each of the last seven days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Loans</th>
            <th scope="col">Returns</th>
          </tr>
        </thead>
        <tbody>
          {activity.map((item) => (
            <tr key={item.date.toISOString()}>
              <th scope="row">{item.label}</th>
              <td>{item.loans}</td>
              <td>{item.returns}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
