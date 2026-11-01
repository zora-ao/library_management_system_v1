import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import BorrowingActivityChart, {
  BorrowingActivityTooltip,
  type BorrowingActivityDatum,
  type BorrowingActivityTooltipProps,
} from "./BorrowingActivityChart";

const activity: BorrowingActivityDatum[] = [
  { date: new Date(2026, 9, 26), label: "Oct 26", loans: 1, returns: 2 },
  { date: new Date(2026, 9, 27), label: "Oct 27", loans: 0, returns: 1 },
  { date: new Date(2026, 9, 28), label: "Oct 28", loans: 3, returns: 0 },
  { date: new Date(2026, 9, 29), label: "Oct 29", loans: 2, returns: 2 },
  { date: new Date(2026, 9, 30), label: "Oct 30", loans: 4, returns: 1 },
  { date: new Date(2026, 9, 31), label: "Oct 31", loans: 1, returns: 3 },
  { date: new Date(2026, 10, 1), label: "Nov 1", loans: 2, returns: 1 },
];

describe("BorrowingActivityChart", () => {
  afterEach(cleanup);

  it("exposes all seven daily loan and return values without relying on hover", () => {
    render(<BorrowingActivityChart activity={activity} />);

    expect(screen.getByRole("img", { name: "Loans and returns over the last 7 days" })).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Borrowing activity data" });
    const rows = within(table).getAllByRole("row");

    expect(rows).toHaveLength(8);
    expect(within(rows[1]).getByText("Oct 26")).toBeInTheDocument();
    expect(within(rows[1]).getByText("1")).toBeInTheDocument();
    expect(within(rows[1]).getByText("2")).toBeInTheDocument();
    expect(within(rows[7]).getByText("Nov 1")).toBeInTheDocument();
  });

  it("shows the full local date and correct singular and plural labels in the tooltip", () => {
    const tooltipProps = {
      active: true,
      label: "Oct 26",
      payload: [
        { dataKey: "loans", name: "Loans", value: 1, payload: activity[0] },
        { dataKey: "returns", name: "Returns", value: 2, payload: activity[0] },
      ],
    } as BorrowingActivityTooltipProps;

    render(<BorrowingActivityTooltip {...tooltipProps} />);

    expect(screen.getByText("Monday, October 26, 2026")).toBeInTheDocument();
    expect(screen.getByText("1 loan")).toBeInTheDocument();
    expect(screen.getByText("2 returns")).toBeInTheDocument();
  });

  it("does not render an empty tooltip", () => {
    const { rerender } = render(
      <BorrowingActivityTooltip active={false} payload={[]} label="Oct 26" />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    rerender(<BorrowingActivityTooltip active payload={[]} label="Oct 26" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps zero-value days in the accessible data", () => {
    const zeroActivity = activity.map((item) => ({ ...item, loans: 0, returns: 0 }));
    render(<BorrowingActivityChart activity={zeroActivity} />);

    const table = screen.getByRole("table", { name: "Borrowing activity data" });
    for (const row of within(table).getAllByRole("row").slice(1)) {
      expect(within(row).getAllByText("0")).toHaveLength(2);
    }
  });

  it("fills a bounded responsive chart region without forcing horizontal overflow", () => {
    render(<BorrowingActivityChart activity={activity} />);

    const chartRegion = screen.getByRole("img", { name: "Loans and returns over the last 7 days" });
    expect(chartRegion).toHaveClass("h-64", "w-full", "min-w-0");
    expect(chartRegion.querySelector(".recharts-wrapper")).toHaveStyle({ width: "100%", height: "100%" });
  });
});
