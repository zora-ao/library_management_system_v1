# Admin Dashboard Activity Chart Design

Date: 2026-11-01

## Intent

Replace the admin dashboard's hand-built seven-day borrowing bars with a polished, interactive two-line activity chart. Staff should be able to hover or focus a date and immediately read the number of loans and returns for that day.

## Scope

- Preserve the existing `dashboard.activity` calculation and its seven-day date range.
- Replace only the visual chart inside the existing **Borrowing activity** card.
- Keep the current page layout, card heading, date-range badge, and Loans/Returns meaning.
- Use Recharts as the charting dependency and keep the chart responsive across dashboard breakpoints.

## Selected Approach

Use a Recharts `LineChart` with two monotone lines: Loans in the primary foreground tone and Returns in the existing primary accent. Include a subtle Cartesian grid, compact date labels on the x-axis, integer counts on the y-axis, visible data-point markers, and a shared tooltip that displays the full date plus both series values.

Recharts was selected over Chart.js because its composable React/SVG components fit the existing component structure and make theme-aware tooltip markup easier to maintain. Keeping the hand-built chart was rejected because the requested interaction and accessibility would require recreating library behavior.

## Interaction and Visual Behavior

- Hovering or keyboard-focusing a point reveals one tooltip for that date with `Loans` and `Returns` counts.
- The active point and cursor line are visually emphasized.
- Lines use a smooth curve without implying values outside the seven actual daily observations.
- Zero-value days remain visible on the baseline.
- Colors come from the application's CSS variables so light and dark themes remain consistent.
- The chart has a fixed responsive height and avoids horizontal overflow on small screens.

## Accessibility

The surrounding card retains its visible title and description. The chart receives an accessible label describing it as loans and returns over the last seven days. The underlying data is also represented in a screen-reader-only summary so the information does not depend on pointer hover or color alone.

## Testing and Verification

- Add or update dashboard tests to assert that the activity chart receives all seven daily records and exposes the accessible summary.
- Verify the custom tooltip renders the selected date and both values.
- Run the focused dashboard test, the frontend test suite, lint, and production build.
- Existing unrelated baseline failures will be reported separately rather than hidden.

## Out of Scope

- Changing how loan and return activity is calculated or fetched
- Adding date-range controls beyond the existing seven-day period
- Dashboard analytics, drill-down navigation, exporting, or backend changes
- Redesigning other dashboard cards
