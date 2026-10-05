import type { Metadata } from "next";
import { FestCardTile } from "@/components/FestCard";
import { Empty, PageHeader } from "@/components/Empty";
import { getFests } from "@/lib/queries";
import { festPhase, type FestPhase } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fest directory",
  description:
    "Every festival run by the AXON Robotics Club — happening now, coming up, and past editions.",
};

const GROUPS: { phase: FestPhase; title: string; blurb: string }[] = [
  { phase: "ongoing", title: "Happening now", blurb: "Running today. Some events may still be open." },
  { phase: "upcoming", title: "Upcoming", blurb: "Announced and accepting registrations." },
  { phase: "past", title: "Past editions", blurb: "Archived for reference. Registration is closed." },
];

export default async function FestsPage() {
  const fests = await getFests();

  return (
    <>
      <PageHeader
        eyebrow="Fest directory"
        title="Festivals"
        lede="An organisation can run many festivals, and each festival contains many events. Pick a fest to see what's inside it."
      />

      <div className="mx-auto w-full max-w-[84rem] px-5 py-10">
        {fests.length === 0 ? (
          <Empty
            title="No festivals published yet"
            body="Once an organiser publishes a festival it will appear here, grouped by whether it is running, upcoming or finished."
            actionHref="/"
            actionLabel="Back to home"
          />
        ) : (
          <div className="flex flex-col gap-12">
            {GROUPS.map((group) => {
              const items = fests.filter((f) => festPhase(f) === group.phase);
              if (items.length === 0) return null;
              return (
                <section key={group.phase}>
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-[1.375rem] font-extrabold">{group.title}</h2>
                    <span className="mono nums text-[0.75rem] text-ink-3">
                      {items.length} {items.length === 1 ? "fest" : "fests"}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.8125rem] text-ink-2">{group.blurb}</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((f) => (
                      <FestCardTile key={f.id} fest={f} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
