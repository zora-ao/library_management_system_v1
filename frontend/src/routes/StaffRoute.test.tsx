import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ role: "admin" }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: auth.role } }),
}));

import { StaffRoute } from "./StaffRoute";

describe("StaffRoute", () => {
  afterEach(() => {
    cleanup();
    auth.role = "admin";
  });

  it.each(["admin", "librarian"])("allows %s access", (role) => {
    auth.role = role;
    render(
      <MemoryRouter initialEntries={["/book-list"]}>
        <Routes>
          <Route element={<StaffRoute />}>
            <Route path="/book-list" element={<div>Books workspace</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Books workspace")).toBeInTheDocument();
  });

  it("redirects students away from the staff workspace", () => {
    auth.role = "student";
    render(
      <MemoryRouter initialEntries={["/book-list"]}>
        <Routes>
          <Route element={<StaffRoute />}>
            <Route path="/book-list" element={<div>Books workspace</div>} />
          </Route>
          <Route path="/books" element={<div>Student catalog</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Student catalog")).toBeInTheDocument();
    expect(screen.queryByText("Books workspace")).not.toBeInTheDocument();
  });
});
