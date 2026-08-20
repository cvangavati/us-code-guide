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
      section: { useQuery: () => window.location.pathname === "/read/18/404" ? ({ data: undefined, isLoading: false, isFetching: false, isError: true, refetch: vi.fn() }) : ({ data: section, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }) },
      titleSections: { useQuery: () => ({ data: [{ section: "1030", heading: "Computer fraud" }], isFetching: false }) },
      explain: { useMutation: () => ({ data: undefined, isPending: false, mutate: vi.fn() }) },
    },
  },
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn(), switchable: true }),
}));

describe("reader interactions", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    window.history.pushState({}, "", "/read/1/1");
    window.localStorage.clear();
  });

  it("updates the reader route after a title selection", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /crimes and criminal procedure/i }));
    await waitFor(() => expect(window.location.pathname).toBe("/read/18/1"));
  });

  it("narrows title browsing when a reader starts from an everyday topic", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Work & money" }));
    expect(screen.getByRole("button", { name: "Work & money" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getAllByRole("button", { name: /internal revenue code/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /the congress/i })).toBeNull();
  });

  it("shows a representative section preview for an unselected title before it is opened", () => {
    render(<Home />);
    expect(screen.getByTitle("Choosing presidential electors").textContent).toBe("§1");
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

  it("opens a plain-language search result at its specific Code section", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.type(screen.getByRole("textbox", { name: "Search the Code in plain language" }), "minimum wage");
    const guideResult = screen.getAllByRole("button", { name: /minimum wage/i }).find(button => button.textContent?.startsWith("Minimum wage"));
    if (!guideResult) throw new Error("Expected the curated minimum-wage search result");
    await user.click(guideResult);
    await waitFor(() => expect(window.location.pathname).toBe("/read/29/206"));
  });

  it("labels the search result card with both its scope and source status", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.type(screen.getByRole("textbox", { name: "Search the Code in plain language" }), "minimum wage");
    expect(screen.getAllByText(/Plain-language guide index · Curated reading guide/i).length).toBeGreaterThan(0);
  });

  it("saves the current section locally and lets the reader reopen the list", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Saved" }).getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Reading list (1)" }));
    expect(screen.getByText("Saved only in this browser. No account required.")).toBeTruthy();
  });

  it("follows a curated related-law path", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /county and parish/i }));
    await waitFor(() => expect(window.location.pathname).toBe("/read/1/3"));
  });

  it("follows the official chapter route when a chapter index is available", async () => {
    render(<Home />);
    const routeStep = screen.getByText("Next section in this official chapter.").closest("button");
    if (!routeStep) throw new Error("Expected an official chapter route button");
    fireEvent.click(routeStep);
    await waitFor(() => expect(window.location.pathname).toBe("/read/1/1030"));
  });

  it("creates a saved folder, moves a section into it, and renames it", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Reading list (1)" }));
    await user.type(screen.getByRole("textbox", { name: "New folder" }), "Research");
    await user.click(screen.getByRole("button", { name: "Create folder" }));
    const folderOption = screen.getByRole("option", { name: "Research" });
    const folderId = folderOption.getAttribute("value");
    if (!folderId) throw new Error("Expected a generated folder id");
    await user.selectOptions(screen.getByRole("combobox", { name: "Move saved section" }), folderId);
    expect(screen.getByText("Research")).toBeTruthy();
    const researchFilter = screen.getByRole("button", { name: "Research (1)" });
    await user.click(researchFilter);
    expect(researchFilter.getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: /words denoting number, gender, and so forth/i }));
    await waitFor(() => expect(window.location.pathname).toBe("/read/1/1"));
    await user.click(screen.getByRole("button", { name: "Remove 1 USC section 1 from saved folders" }));
    expect(screen.getByRole("button", { name: "Research (0)" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Rename" }));
    const rename = screen.getByRole("textbox", { name: "Rename folder" });
    await user.clear(rename);
    await user.type(rename, "Primary research");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(screen.getByText("Primary research")).toBeTruthy();
  });

  it("records the current reader section in a private recent-history panel and clears it", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Recent (1)" }));
    expect(screen.getAllByText("Words denoting number, gender, and so forth").length).toBeGreaterThan(1);
    await user.click(screen.getByRole("button", { name: "Clear history" }));
    expect(screen.getByText("Sections you open will appear here, up to the 12 most recent.")).toBeTruthy();
  });

  it("shows recovery actions instead of an indefinite reader state when the official-section request fails", () => {
    window.history.pushState({}, "", "/read/18/404");
    render(<Home />);
    expect(screen.getByRole("alert").textContent).toContain("We could not load this official section right now.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open official source" }).getAttribute("href")).toContain("title18-section404");
  });
});
