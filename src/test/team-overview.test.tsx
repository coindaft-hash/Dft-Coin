import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamOverview } from "@/components/team-overview";

vi.mock("@tanstack/react-router", () => ({ Link: ({ to, search: _search, ...props }: { to: string; search?: unknown }) => <a href={to} {...props} /> }));

describe("Team overview", () => {
  it("renders all four levels and opens the correct member list", () => {
    render(<TeamOverview rows={[{ user_id: "one", member: "sam***@example.com", joined_at: "2026-10-12T12:00:00Z", code: "CODE123", team_level: 2, funded: true, effective_amount: 25, reward: 0, today_reward: 0 }]} />);
    for (const level of ["A", "B", "C", "D"]) expect(screen.getByRole("heading", { name: `Level ${level} Data` })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Member List" })[1] as HTMLElement);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("sam***@example.com")).toBeInTheDocument();
    expect(screen.getByText("Funded")).toBeInTheDocument();
  });
});