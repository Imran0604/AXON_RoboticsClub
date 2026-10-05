"use client";

import { useId, useMemo, useState } from "react";

/**
 * Charts, hand-built in SVG.
 *
 * Colour follows the job the data is doing rather than taste: the time series
 * and the category bars both encode magnitude, so they use a single hue and
 * no legend (one series — the title names it). The capacity bars encode
 * state, so they use the reserved status colours, and every one of them
 * carries a text value beside it so colour is never the sole carrier.
 *
 * Marks follow the house spec: 2px lines, 4px rounded data-ends anchored to
 * the baseline, recessive grid and axes, and selective direct labels instead
 * of a number on every point.
 */

/* ------------------------------------------------------------------------- */
/* Stat tile                                                                  */
/* ------------------------------------------------------------------------- */

export function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "ok" | "warn" | "crit" | "brass";
}) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "warn"
        ? "var(--warn)"
        : tone === "crit"
          ? "var(--crit)"
          : tone === "brass"
            ? "var(--brass)"
            : "var(--ink)";

  return (
    <div className="card flex flex-col gap-1 p-3.5">
      <p className="eyebrow">{label}</p>
      <p className="mono nums text-[1.625rem] font-semibold leading-none" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-[0.75rem] leading-snug text-ink-3">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Time series — area + line with a hover crosshair                           */
/* ------------------------------------------------------------------------- */

export function TimeSeries({
  data,
  height = 150,
  label = "Registrations",
}: {
  data: { day: string; count: number }[];
  height?: number;
  label?: string;
}) {
  const gradId = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  const W = 760;
  const H = height;
  const pad = { t: 12, r: 12, b: 24, l: 34 };

  const max = Math.max(1, ...data.map((d) => d.count));
  // Round the axis top to something readable rather than the raw maximum.
  const top = max <= 5 ? 5 : Math.ceil(max / 5) * 5;

  const x = (i: number) => pad.l + (i / Math.max(1, data.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / top) * (H - pad.t - pad.b);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${y(0)} L ${x(0).toFixed(1)} ${y(0)} Z`;

  const ticks = [0, top / 2, top];
  // Label at most six dates so the axis never collides with itself.
  const step = Math.max(1, Math.ceil(data.length / 6));

  const active = hover !== null ? data[hover] : null;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "auto", display: "block" }}
        role="img"
        aria-label={`${label} per day over the last ${data.length} days`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--navy)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--navy)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* recessive grid */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} y1={y(t)} x2={W - pad.r} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={pad.l - 7} y={y(t) + 3.5} textAnchor="end" fontSize="9.5" fill="var(--ink-3)" fontFamily="monospace">
              {t}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* emphasised endpoint */}
        {data.length > 0 && (
          <circle
            cx={x(data.length - 1)}
            cy={y(data[data.length - 1].count)}
            r="4"
            fill="var(--navy)"
            stroke="var(--surface)"
            strokeWidth="2"
          />
        )}

        {/* x labels */}
        {data.map((d, i) =>
          i % step === 0 || i === data.length - 1 ? (
            <text key={d.day} x={x(i)} y={H - 7} textAnchor="middle" fontSize="9.5" fill="var(--ink-3)" fontFamily="monospace">
              {new Date(d.day + "T00:00:00Z").toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              })}
            </text>
          ) : null
        )}

        {/* crosshair */}
        {hover !== null && (
          <g>
            <line x1={x(hover)} y1={pad.t} x2={x(hover)} y2={y(0)} stroke="var(--brass)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].count)} r="4.5" fill="var(--brass)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}

        {/* hit targets, wider than the marks */}
        {data.map((d, i) => (
          <rect
            key={`h${d.day}`}
            x={x(i) - (W - pad.l - pad.r) / Math.max(1, data.length) / 2}
            y={pad.t}
            width={(W - pad.l - pad.r) / Math.max(1, data.length)}
            height={H - pad.t - pad.b}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      <figcaption className="mono mt-1.5 flex h-4 items-center justify-center text-[0.6875rem] text-ink-2">
        {active ? (
          <>
            <strong className="font-semibold text-ink">{active.count}</strong>
            <span className="mx-1">·</span>
            {new Date(active.day + "T00:00:00Z").toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "UTC",
            })}
          </>
        ) : (
          <span className="text-ink-3">Hover for a daily figure</span>
        )}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------------- */
/* Horizontal bars — magnitude by category, single hue                        */
/* ------------------------------------------------------------------------- */

export function BarList({
  data,
  valueSuffix = "",
}: {
  data: { label: string; value: number }[];
  valueSuffix?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-3">
          <span className="w-[5.5rem] shrink-0 truncate text-[0.75rem] text-ink-2" title={d.label}>
            {d.label}
          </span>
          <span className="relative h-5 flex-1 overflow-hidden rounded-sm" style={{ background: "var(--surface-3)" }}>
            <span
              className="absolute inset-y-0 left-0 rounded-sm"
              style={{
                width: `${Math.max(1.5, (d.value / max) * 100)}%`,
                background: "var(--navy)",
              }}
            />
          </span>
          <span className="mono nums w-12 shrink-0 text-right text-[0.75rem] font-semibold text-ink">
            {d.value}
            {valueSuffix}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------------- */
/* Capacity bars — state, so reserved status colours plus a text value        */
/* ------------------------------------------------------------------------- */

export function FillBars({
  data,
}: {
  data: { label: string; taken: number; capacity: number | null; waitlisted: number; href?: string }[];
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((d) => {
        const pct = d.capacity === null ? 0 : Math.min(100, Math.round((d.taken / d.capacity) * 100));
        const state = d.capacity === null ? "none" : pct >= 100 ? "full" : pct >= 80 ? "filling" : "healthy";
        const color =
          state === "full" ? "var(--crit)" : state === "filling" ? "var(--warn)" : "var(--ok)";
        const stateLabel =
          state === "none" ? "No limit" : state === "full" ? "Full" : state === "filling" ? "Filling" : "Open";

        return (
          <li key={d.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[0.8125rem] font-medium" title={d.label}>
                {d.label}
              </span>
              <span className="mono nums shrink-0 text-[0.75rem] text-ink-2">
                {d.capacity === null ? `${d.taken}` : `${d.taken}/${d.capacity}`}
                {d.waitlisted > 0 && (
                  <span style={{ color: "var(--info)" }}> +{d.waitlisted} queued</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-sm" style={{ background: "var(--surface-3)" }}>
                <span
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{ width: `${Math.max(2, pct)}%`, background: color }}
                />
              </span>
              {/* Text label so the state is never carried by colour alone. */}
              <span className="mono w-[3.75rem] shrink-0 text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color }}>
                {stateLabel}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------------- */
/* Status breakdown — a labelled, proportional strip                          */
/* ------------------------------------------------------------------------- */

export function StatusStrip({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const shown = useMemo(() => segments.filter((s) => s.value > 0), [segments]);

  if (total === 0) return <p className="text-[0.8125rem] text-ink-3">Nothing to show yet.</p>;

  return (
    <div className="flex flex-col gap-3">
      {/* 2px surface gaps between segments, per the mark spec */}
      <div className="flex h-7 gap-[2px] overflow-hidden rounded-sm">
        {shown.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color, minWidth: 3 }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {shown.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: s.color }} aria-hidden="true" />
            <span className="text-[0.75rem] text-ink-2">{s.label}</span>
            <span className="mono nums text-[0.75rem] font-semibold text-ink">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
