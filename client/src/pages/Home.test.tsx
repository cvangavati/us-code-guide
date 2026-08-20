// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CodeSection } from "@shared/usCode";
import Home from "./Home";

const section: CodeSection = {
  title: 1,
  section: "1",
  heading: "Words denoting number, gender, and so forth",
  officialText: ["This statutory text is supplied to the test reader."],
  sourceUrl: "https://example.gov/1/1",
  sourceName: "Test source",
  sourceStatus: "live official source",
  retrievedAt: "2026-08-20T00:00:00.000Z",
  plainEnglish: {
    label: "Plain-English guide — not legal advice",
    summary: "A test guide.",
    keyPoints: ["A test point.", "Another test point."],
    watchFor: ["A test limitation."],
    trace: { summaryParagraphs: [1], keyPointParagraphs: [[1], [1]], watchForParagraphs: [[1]] },
    generated: false,
  },
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    usCode: {
      section: { useQuery: () => ({ data: section, isLoading: false, isFetching: false }) },
      titleSections: { useQuery: () => ({ data: [{ section: "1030", heading: "Computer fraud" }], isFetching: false }) },
      explain: { useMutation: () => ({ data: undefined, isPending: false, mutate: vi.fn() }) },
    },
  },
}));

describe("reader interactions", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    window.history.pushState({}, "", "/read/1/1");
  });

  it("updates the reader route after a title selection", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /crimes and criminal procedure/i }));
    await waitFor(() => expect(window.location.pathname).toBe("/read/18/1"));
  });

  it("updates the reader route after selecting a discovered section", async () => {
    render(<Home />);
    fireEvent.click(screen.getByTitle("§1030. Computer fraud"));
    await waitFor(() => expect(window.location.pathname).toBe("/read/1/1030"));
  });

  it("switches the mobile reading mode without changing the reader route", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const official = screen.getByRole("button", { name: "Official text" });
    const guide = screen.getByRole("button", { name: "Plain English" });
    expect(official.getAttribute("aria-pressed")).toBe("true");
    await user.click(guide);
    expect(guide.getAttribute("aria-pressed")).toBe("true");
    expect(official.getAttribute("aria-pressed")).toBe("false");
    expect(window.location.pathname).toBe("/read/1/1");
  });
});
