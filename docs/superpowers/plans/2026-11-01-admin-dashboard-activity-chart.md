# Admin Dashboard Activity Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin dashboard's static seven-day borrowing bars with a responsive Recharts two-line chart that exposes loans and returns through a shared hover tooltip and accessible data summary.

**Architecture:** Add a focused `BorrowingActivityChart` component that accepts the dashboard's existing seven daily records and owns all Recharts presentation, tooltip formatting, and non-visual data access. Keep date aggregation in `AdminDashboardPage`; the page only passes `dashboard.activity` into the chart.

**Tech Stack:** React 19, TypeScript, Recharts 3.3+, Vitest, Testing Library, Tailwind CSS and project CSS variables

**Spec:** `docs/superpowers/specs/2026-11-01-admin-dashboard-activity-chart-design.md`

## Global Constraints

- Preserve the existing `dashboard.activity` calculation and seven-day range.
- Replace only the chart inside the existing **Borrowing activity** card; keep the card heading, description, legend meaning, date badge, and surrounding dashboard layout.
- Use a responsive Recharts `LineChart` with two monotone lines, visible dots, integer y-axis ticks, a subtle grid, and a shared tooltip.
- Use project CSS variables for all chart and tooltip colors in light and dark themes.
- Keep the information available without pointer hover or color through an accessible chart label and screen-reader-only data table.
- Do not add date controls, analytics, drill-downs, exports, backend changes, or redesign unrelated cards.

## Review Focus

- Seven days with zero loans and returns: the baseline, both series, and all seven accessible rows remain present; pin in Task 1's all-zero test.
- A day with one event versus multiple events: tooltip copy uses correct singular/plural labels; pin in Task 1's tooltip test.
- Tooltip receives no active point or an empty payload: it renders nothing instead of an empty floating card; pin in Task 1's inactive-tooltip test.
- A narrow dashboard column: the chart uses its parent width, a bounded height, and no forced horizontal width; pin wrapper/responsive props in Task 1's responsive-layout test.
- Local date labels around midnight or timezone boundaries: the component formats the supplied `Date` object without reparsing a date-only string; pin the exact full-date tooltip label in Task 1.

---

### Task 1: Build the Interactive Borrowing Activity Chart

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/src/pages/adminPage/BorrowingActivityChart.tsx`
- Create: `frontend/src/pages/adminPage/BorrowingActivityChart.test.tsx`

**Interfaces:**
- Consumes: `activity: BorrowingActivityDatum[]`, where `BorrowingActivityDatum = { date: Date; label: string; loans: number; returns: number }`.
- Produces: default `BorrowingActivityChart({ activity }: BorrowingActivityChartProps): JSX.Element` and named `BorrowingActivityTooltip(props: BorrowingActivityTooltipProps): JSX.Element | null` for focused tooltip testing.

- [x] **Step 1: Install the chart dependency**

Run: `npm.cmd --prefix frontend install recharts@^3.3.0 react-is@^19.2.7`

Expected: `frontend/package.json` and `frontend/package-lock.json` add Recharts and a React-matched `react-is`; the lockfile resolves `immer` to `11.0.1` or newer if Recharts includes it.

- [x] **Step 2: Write the failing component tests**

Create `BorrowingActivityChart.test.tsx` with tests that:

1. render seven sample dates and assert a chart image named `Loans and returns over the last 7 days` plus a table named `Borrowing activity data` containing all seven date/loan/return rows;
2. render `BorrowingActivityTooltip` with an active point and assert the full formatted date and singular/plural copy such as `1 loan` and `2 returns`;
3. render the tooltip inactive and with an empty payload and assert no tooltip card;
4. render an all-zero series and assert all seven table rows still expose `0` for both series;
5. assert the visual wrapper uses a bounded height/full width and the Recharts chart receives responsive sizing rather than a forced pixel width.

- [x] **Step 3: Run the component test to verify RED**

Run: `npm.cmd --prefix frontend run test -- src/pages/adminPage/BorrowingActivityChart.test.tsx`

Expected: FAIL because `BorrowingActivityChart.tsx` does not exist.

- [x] **Step 4: Implement `BorrowingActivityChart.tsx`**

Implement the interfaces above with Recharts `LineChart`, `CartesianGrid`, `XAxis`, `YAxis`, `Tooltip`, and two `Line` components. Use the chart's `responsive` prop in a full-width, bounded-height wrapper; format the tooltip from the original `Date`; render theme-aware HTML tooltip markup; and place a captioned `sr-only` data table outside the chart's `role="img"` container.

- [x] **Step 5: Run the component test to verify GREEN**

Run: `npm.cmd --prefix frontend run test -- src/pages/adminPage/BorrowingActivityChart.test.tsx`

Expected: PASS with all component and tooltip cases green.

- [x] **Step 6: Commit the chart component**

```powershell
git add frontend/package.json frontend/package-lock.json frontend/src/pages/adminPage/BorrowingActivityChart.tsx frontend/src/pages/adminPage/BorrowingActivityChart.test.tsx
git commit -m "feat: add interactive borrowing activity chart"
```

### Task 2: Integrate the Chart Into the Admin Dashboard

**Files:**
- Modify: `frontend/src/pages/adminPage/AdminDashboardPage.tsx`
- Modify: `frontend/src/pages/adminPage/AdminDashboardPage.test.tsx`
- Add: `docs/superpowers/specs/2026-11-01-admin-dashboard-activity-chart-design.md`
- Add: `docs/superpowers/plans/2026-11-01-admin-dashboard-activity-chart.md`

**Interfaces:**
- Consumes: Task 1's default `BorrowingActivityChart` and `BorrowingActivityDatum` shape.
- Produces: the existing dashboard page with `dashboard.activity` passed unchanged to the interactive chart.

- [x] **Step 1: Write the failing dashboard integration test**

Add a test to `AdminDashboardPage.test.tsx` asserting the Borrowing activity card contains the chart image named `Loans and returns over the last 7 days` and the accessible `Borrowing activity data` table with seven body rows.

- [x] **Step 2: Run the dashboard test to verify RED**

Run: `npm.cmd --prefix frontend run test -- src/pages/adminPage/AdminDashboardPage.test.tsx`

Expected: FAIL because the existing hand-built bars do not expose the new chart image or data table.

- [x] **Step 3: Replace the hand-built bars**

Import `BorrowingActivityChart`, remove `maxActivity`, and replace the seven-column bar markup with `<BorrowingActivityChart activity={dashboard.activity} />`. Retain the card header, existing visible legend, description, and seven-day badge.

- [x] **Step 4: Run focused tests to verify GREEN**

Run: `npm.cmd --prefix frontend run test -- src/pages/adminPage/BorrowingActivityChart.test.tsx src/pages/adminPage/AdminDashboardPage.test.tsx`

Expected: PASS for both files.

- [x] **Step 5: Run full verification**

Run:

```powershell
npm.cmd --prefix frontend run test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
git diff --check
```

Expected: chart-focused tests pass; any unrelated pre-existing failures are identified by exact file and error. The chart changes introduce no new lint, type, build, or whitespace failures.

- [x] **Step 6: Commit dashboard integration and documentation**

```powershell
git add frontend/src/pages/adminPage/AdminDashboardPage.tsx frontend/src/pages/adminPage/AdminDashboardPage.test.tsx docs/superpowers/specs/2026-11-01-admin-dashboard-activity-chart-design.md docs/superpowers/plans/2026-11-01-admin-dashboard-activity-chart.md
git commit -m "feat: integrate dashboard activity chart"
```
