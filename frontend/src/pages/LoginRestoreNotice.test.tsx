import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/components/LoginForm", () => ({
  default: () => <div>Login form</div>,
}));
vi.mock("@/features/auth/components/GLogin", () => ({
  default: () => <div>Google login</div>,
}));

import LoginPage from "./LoginPage";


describe("post-restore login notice", () => {
  afterEach(cleanup);

  it("shows the sign-in notice after a database restore", () => {
    render(<MemoryRouter initialEntries={["/login?restored=1"]}><LoginPage /></MemoryRouter>);
    expect(screen.getByText("Database restored. Sign in again to continue.")).toBeInTheDocument();
  });

  it("does not show the notice during an ordinary login", () => {
    render(<MemoryRouter initialEntries={["/login"]}><LoginPage /></MemoryRouter>);
    expect(screen.queryByText(/Database restored/i)).not.toBeInTheDocument();
  });
});
