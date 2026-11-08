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
      <MemoryRouter initialEntries={["/dsa-explorer"]}>
        <Routes>
          <Route element={<StaffRoute />}>
            <Route path="/dsa-explorer" element={<div>DSA workspace</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("DSA workspace")).toBeInTheDocument();
  });

  it("redirects students away from the staff workspace", () => {
    auth.role = "student";
    render(
      <MemoryRouter initialEntries={["/dsa-explorer"]}>
        <Routes>
          <Route element={<StaffRoute />}>
            <Route path="/dsa-explorer" element={<div>DSA workspace</div>} />
          </Route>
          <Route path="/books" element={<div>Student catalog</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Student catalog")).toBeInTheDocument();
    expect(screen.queryByText("DSA workspace")).not.toBeInTheDocument();
  });
});
