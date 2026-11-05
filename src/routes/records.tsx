import { createFileRoute } from "@tanstack/react-router";
import { RecordsPage } from "@/components/records-page";
import { isRecordTab, type RecordTab } from "@/lib/record-tabs";

export const Route = createFileRoute("/records")({
  validateSearch: (search: Record<string, unknown>): { tab: RecordTab } => ({
    tab: isRecordTab(search["tab"]) ? search["tab"] : "deposits",
  }),
  head: () => ({
    meta: [
      { title: "Records — Vertex" },
      { name: "description", content: "Your deposit, withdrawal, transfer and reward history on Vertex." },
      { property: "og:title", content: "Records — Vertex" },
      { property: "og:description", content: "Deposit, withdrawal, transfer and reward history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecordsView,
});

function RecordsView() {
  const { tab } = Route.useSearch();
  return <RecordsPage tab={tab} />;
}
