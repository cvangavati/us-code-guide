// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import type { CodeSection } from "@shared/usCode";
import Home from "./Home";

const section: CodeSection = {
  title: 1,
  section: "1",
  heading: "Words denoting number, gender, and so forth",
  officialText: ["Test statutory text."],
  sourceUrl: "https://example.gov/1/1",
  sourceName: "Test source",
  sourceStatus: "live official source",
  retrievedAt: "2026-08-20T00:00:00.000Z",
  plainEnglish: {
    label: "Plain-English guide — not legal advice",
    summary: "A test guide.",
    keyPoints: ["A test point."],
    watchFor: ["A test limitation."],
    trace: { summaryParagraphs: [1], keyPointParagraphs: [[1]], watchForParagraphs: [[1]] },
    generated: false,
  },
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    usCode: {
      section: { useQuery: () => ({ data: section, isLoading: false, isFetching: false }) },
      titleSections: { useQuery: () => ({ data: [{ section: "1", heading: "General provisions", chapter: "CHAPTER 1" }], isFetching: false }) },
      explain: { useMutation: () => ({ data: undefined, isPending: false, mutate: vi.fn() }) },
    },
  },
}));

describe("reader dark mode", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/read/1/1");
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => cleanup());

  it("toggles the visible reader control into persistent dark mode", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider defaultTheme="light" switchable><Home /></ThemeProvider>);
    await user.click(screen.getByRole("button", { name: "Dark mode" }));
    expect(screen.getByRole("button", { name: "Light mode" }).getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });
});
