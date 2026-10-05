import type { Metadata } from "next";
import { Suspense } from "react";
import { EventCardTile } from "@/components/EventCard";
import { EventFilters } from "@/components/EventFilters";
import { Empty, PageHeader } from "@/components/Empty";
import { getCategoryCounts, getFests, searchEvents, type EventFilters as Filters } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event directory",
  description:
    "Search and filter every event across all AXON Robotics Club festivals by category, fest, fee and availability.",
};

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const sp = await searchParams;

  const filters: Filters = {
    q: one(sp.q),
    category: one(sp.category),
    fest: one(sp.fest),
    fee: one(sp.fee) === "free" ? "free" : one(sp.fee) === "paid" ? "paid" : undefined,
    team: one(sp.team) === "solo" ? "solo" : one(sp.team) === "team" ? "team" : undefined,
    open: one(sp.open) === "1",
    sort: (["soonest", "latest", "seats", "title"] as const).find((s) => s === one(sp.sort)) ?? "soonest",
  };

  const [events, categories, fests] = await Promise.all([
    searchEvents(filters),
    getCategoryCounts(),
    getFests(),
  ]);

  const hasFilters = Boolean(
    filters.q || filters.category || filters.fest || filters.fee || filters.team || filters.open
  );

  return (
    <>
      <PageHeader
        eyebrow="Event directory"
        title="All events"
        lede="Every event across every festival, searchable in one place. Filters are stored in the address bar, so any view you build here is a link you can share."
      />

      <div className="mx-auto w-full max-w-[84rem] px-5 py-8">
        <div className="card p-4 sm:p-5">
          <Suspense fallback={<div className="skeleton h-40 w-full" />}>
            <EventFilters
              categories={categories}
              fests={fests.map((f) => ({ slug: f.slug, name: f.name }))}
              resultCount={events.length}
            />
          </Suspense>
        </div>

        <div className="mt-7">
          {events.length === 0 ? (
            <Empty
              title={hasFilters ? "No events match these filters" : "No events published yet"}
              body={
                hasFilters
                  ? "Try removing a filter or searching for something broader — there are events in eight different categories across four festivals."
                  : "Once an organiser publishes an event it will appear here."
              }
              actionHref="/events"
              actionLabel={hasFilters ? "Clear all filters" : "Back to fests"}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {events.map((e) => (
                  <EventCardTile key={e.id} event={e} />
                ))}
              </div>
              <p className="mono mt-7 text-center text-[0.75rem] text-ink-3">
                Showing all {events.length} matching {events.length === 1 ? "event" : "events"}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
