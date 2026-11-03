import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

afterEach(cleanup);

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    login: vi.fn(),
    user: null,
  }),
}));

vi.mock("@react-oauth/google", () => ({
  GoogleLogin: () => <div data-testid="google-login-iframe" />,
}));

describe("LoginPage & RegisterPage Figma + Admin Theme Design", () => {
  it("renders LoginPage with Pahina branding, theme-aware bg-background/text-heading tokens, and English Google CTA", () => {
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const main = container.querySelector("main");
    expect(main?.className).toContain("bg-background");

    expect(screen.getByText("Pahina")).toBeInTheDocument();
    expect(screen.queryByText("Booksy")).not.toBeInTheDocument();
    const loginLogo = container.querySelector('img[src="/Logo.png"]');
    expect(loginLogo).toBeInTheDocument();
    expect(loginLogo?.parentElement).toHaveClass("bg-transparent");

    const welcomeHeading = screen.getByRole("heading", { name: /welcome back/i });
    expect(welcomeHeading.className).toContain("text-heading");

    const campusCaption = screen.getByText(/your campus library, a little closer\./i);
    expect(campusCaption.className).not.toContain("text-center");

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute("placeholder", "••••••••••••");

    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
    expect(screen.getByText(/new to Pahina\?/i)).toBeInTheDocument();
    expect(screen.getByText("Pahina · Library Management System")).toBeInTheDocument();
  });

  it("renders RegisterPage with matching Pahina branding and theme-aware tokens", () => {
    const { container } = render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const main = container.querySelector("main");
    expect(main?.className).toContain("bg-background");

    expect(screen.getByText("Pahina")).toBeInTheDocument();
    expect(screen.queryByText("Booksy")).not.toBeInTheDocument();
    const registerLogo = container.querySelector('img[src="/Logo.png"]');
    expect(registerLogo).toBeInTheDocument();
    expect(registerLogo?.parentElement).toHaveClass("bg-transparent");

    const registerHeading = screen.getByRole("heading", { name: /create your account/i });
    expect(registerHeading.className).toContain("text-heading");

    const campusCaption = screen.getByText(/your campus library, a little closer\./i);
    expect(campusCaption.className).not.toContain("text-center");

    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
    expect(screen.getByText("Pahina · Library Management System")).toBeInTheDocument();
  });
});
