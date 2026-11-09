import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { lazy } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PageOutlet from "./PageOutlet";

const Broken = (): never => {
  throw new Error("boom");
};

const StaleChunk = lazy(() =>
  Promise.reject(new Error("Failed to fetch dynamically imported module: /assets/Page-old.js")),
);

const Nav = () => {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate("/ok")}>Go to working page</button>;
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Nav />
      <Routes>
        <Route element={<PageOutlet />}>
          <Route path="/broken" element={<Broken />} />
          <Route path="/stale" element={<StaleChunk />} />
          <Route path="/ok" element={<p>Working page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe("PageOutlet", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("contains a page crash and recovers after navigating away", () => {
    renderAt("/broken");

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong on this page");
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Go to working page" }));
    expect(screen.getByText("Working page")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("asks for a reload when a page file from an old deploy is gone", async () => {
    renderAt("/stale");

    expect(await screen.findByRole("alert")).toHaveTextContent("A new version is available");
  });
});
