import Link from "next/link";

/**
 * Empty states. Each one names what is missing and offers the single most
 * useful way out, rather than leaving a blank panel — the "general UX"
 * impression of polish is largely won in states like this one.
 */
export function Empty({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <svg viewBox="0 0 120 100" width="104" height="86" aria-hidden="true">
        {/* A small robot sitting beside an empty crate. */}
        <rect x="14" y="54" width="36" height="28" rx="2" fill="none" stroke="var(--brand)" strokeWidth="2.2" opacity="0.5" />
        <path d="M14 61h36" stroke="var(--brand)" strokeWidth="2.2" opacity="0.5" />
        <path d="M18 54l6-8h22l6 8" fill="none" stroke="var(--brand)" strokeWidth="2.2" strokeLinejoin="round" opacity="0.35" />
        <rect x="64" y="44" width="38" height="30" rx="5" fill="none" stroke="var(--brand)" strokeWidth="2.4" />
        <circle cx="75" cy="57" r="3.4" fill="var(--brand)" />
        <circle cx="91" cy="57" r="3.4" fill="var(--brand)" />
        <path d="M76 66q7 4 14 0" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <path d="M83 44v-8" stroke="var(--brand)" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="83" cy="33" r="3.6" fill="var(--accent)" />
        <path d="M64 58h-7M102 58h7" stroke="var(--brand)" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
        <path d="M70 74v6M96 74v6" stroke="var(--brand)" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
      </svg>
      <h3 className="text-[1.0625rem] font-bold">{title}</h3>
      <p className="max-w-sm text-[0.875rem] leading-relaxed text-ink-2">{body}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn btn-ghost btn-sm mt-1">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/** Page-level heading block, shared by every top-level route. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-line bg-surface grid-texture">
      <div className="mx-auto w-full max-w-[84rem] px-5 py-9">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 text-[1.875rem] font-extrabold sm:text-[2.25rem]">{title}</h1>
        {lede && <p className="mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-2">{lede}</p>}
        {children}
      </div>
    </div>
  );
}
