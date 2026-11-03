import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ role: "admin" }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: auth.role } }),
}));

import { AdminRoute } from "./AdminRoute";


describe("AdminRoute", () => {
  afterEach(cleanup);

  it("renders the nested route for administrators", () => {
    auth.role = "admin";
    render(
      <MemoryRouter initialEntries={["/backups"]}>
        <Routes>
          <Route element={<AdminRoute />}>
            <Route path="/backups" element={<div>Backup administration</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Backup administration")).toBeInTheDocument();
  });

  it("redirects librarians to the dashboard", () => {
    auth.role = "librarian";
    render(
      <MemoryRouter initialEntries={["/backups"]}>
        <Routes>
          <Route element={<AdminRoute />}>
            <Route path="/backups" element={<div>Backup administration</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Staff dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Staff dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Backup administration")).not.toBeInTheDocument();
  });
});
