import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useIsDarkTheme } from "./useIsDarkTheme";

describe("useIsDarkTheme", () => {
  afterEach(() => document.documentElement.classList.remove("dark"));

  it("follows the dark class on the root element", async () => {
    const { result } = renderHook(() => useIsDarkTheme());
    expect(result.current).toBe(false);

    act(() => document.documentElement.classList.add("dark"));
    await waitFor(() => expect(result.current).toBe(true));

    act(() => document.documentElement.classList.remove("dark"));
    await waitFor(() => expect(result.current).toBe(false));
  });
});
