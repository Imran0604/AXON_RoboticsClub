import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-lg px-5 py-20">
      <div className="card flex flex-col gap-4 p-7">
        <p className="eyebrow">Error 404</p>
        <h1 className="text-[1.625rem] font-extrabold">We couldn&apos;t find that page</h1>
        <p className="text-[0.9375rem] leading-relaxed text-ink-2">
          The fest, event or ticket you asked for doesn&apos;t exist — it may have been renamed, or
          the link may be incomplete.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/fests" className="btn btn-primary">
            Browse fests
          </Link>
          <Link href="/events" className="btn btn-ghost">
            Search all events
          </Link>
        </div>
      </div>
    </div>
  );
}
