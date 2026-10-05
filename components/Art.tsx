/**
 * Deterministic generated artwork for events and fests.
 *
 * Why generated instead of photographs or AI images: sixteen separate image
 * generations never quite match each other, cost money, and add megabytes to
 * every page. These compositions are built from the event's `art_seed` and
 * category, so they are stable across renders (no hydration mismatch), weigh
 * roughly 2KB each, adapt to light and dark automatically because they draw
 * in theme tokens, and read as one art-directed family across the whole
 * directory.
 *
 * Each category gets its own motif drawn from that discipline's visual
 * vocabulary — rotor geometry for drone events, trace routing for hardware,
 * a node graph for machine learning, and so on.
 */

type Rnd = () => number;

/** mulberry32 — small, fast, and identical on server and client. */
function prng(seed: number): Rnd {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 400;
const H = 300;

interface Props {
  seed: number;
  category: string;
  className?: string;
  /** Renders a wider composition for fest banners. */
  wide?: boolean;
}

function Hardware(r: Rnd) {
  // Trace routing: orthogonal paths with via pads, like a PCB layer.
  const paths: string[] = [];
  const pads: [number, number][] = [];
  for (let i = 0; i < 7; i++) {
    const y = 40 + i * 34 + Math.round(r() * 8);
    const bend = 120 + Math.round(r() * 180);
    const drop = y + (r() > 0.5 ? 28 : -28);
    paths.push(`M -10 ${y} L ${bend} ${y} L ${bend + 26} ${drop} L ${W + 10} ${drop}`);
    pads.push([bend, y]);
  }
  return (
    <>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="var(--navy)"
          strokeWidth={i % 3 === 0 ? 2.4 : 1.3}
          strokeLinejoin="round"
          opacity={0.22 + (i % 3) * 0.1}
        />
      ))}
      {pads.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 4.5 : 3} fill="none" stroke="var(--brass)" strokeWidth="1.8" />
      ))}
      <circle cx={W * 0.72} cy={H * 0.5} r="46" fill="none" stroke="var(--brass)" strokeWidth="2" opacity="0.5" />
      <circle cx={W * 0.72} cy={H * 0.5} r="7" fill="var(--brass)" />
    </>
  );
}

function Drone(r: Rnd) {
  // Four rotor discs on an X frame.
  const cx = W / 2;
  const cy = H / 2;
  const arm = 86;
  const corners: [number, number][] = [
    [cx - arm, cy - arm * 0.62],
    [cx + arm, cy - arm * 0.62],
    [cx - arm, cy + arm * 0.62],
    [cx + arm, cy + arm * 0.62],
  ];
  return (
    <>
      {corners.map(([x, y], i) => (
        <line key={`a${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--navy)" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
      ))}
      {corners.map(([x, y], i) => (
        <g key={`r${i}`}>
          <circle cx={x} cy={y} r={34 + r() * 5} fill="none" stroke="var(--navy)" strokeWidth="1.4" opacity="0.3" />
          <circle cx={x} cy={y} r="9" fill="none" stroke="var(--brass)" strokeWidth="2.2" />
          <path
            d={`M ${x - 30} ${y} Q ${x} ${y - 13} ${x + 30} ${y}`}
            fill="none"
            stroke="var(--brass)"
            strokeWidth="1.6"
            opacity="0.75"
          />
        </g>
      ))}
      <rect x={cx - 26} y={cy - 17} width="52" height="34" rx="4" fill="none" stroke="var(--navy)" strokeWidth="2.4" />
    </>
  );
}

function Network(r: Rnd) {
  // Layered node graph — three columns, edges between adjacent layers.
  const layers = [4, 6, 3];
  const nodes: { x: number; y: number }[][] = layers.map((n, li) => {
    const x = 70 + li * 130;
    return Array.from({ length: n }, (_, i) => ({
      x,
      y: H / 2 + (i - (n - 1) / 2) * (150 / Math.max(n, 3)),
    }));
  });
  const edges: [{ x: number; y: number }, { x: number; y: number }, number][] = [];
  for (let l = 0; l < nodes.length - 1; l++) {
    for (const a of nodes[l]) {
      for (const b of nodes[l + 1]) {
        if (r() > 0.42) edges.push([a, b, r()]);
      }
    }
  }
  return (
    <>
      {edges.map(([a, b, w], i) => (
        <line
          key={i}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={w > 0.78 ? "var(--brass)" : "var(--navy)"}
          strokeWidth={w > 0.78 ? 1.7 : 0.9}
          opacity={w > 0.78 ? 0.7 : 0.26}
        />
      ))}
      {nodes.flat().map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={i % 5 === 0 ? 7 : 5}
          fill={i % 5 === 0 ? "var(--brass)" : "var(--surface)"}
          stroke="var(--navy)"
          strokeWidth="2"
        />
      ))}
    </>
  );
}

function Code(r: Rnd) {
  // Stacked code-block bars inside a bracket pair.
  const bars = Array.from({ length: 11 }, (_, i) => ({
    y: 44 + i * 20,
    indent: [0, 18, 36, 18][Math.floor(r() * 4)],
    w: 70 + r() * 160,
    hot: r() > 0.78,
  }));
  return (
    <>
      <path d="M 44 36 Q 24 36 24 60 L 24 240 Q 24 264 44 264" fill="none" stroke="var(--brass)" strokeWidth="3" strokeLinecap="round" />
      <path d={`M ${W - 44} 36 Q ${W - 24} 36 ${W - 24} 60 L ${W - 24} 240 Q ${W - 24} 264 ${W - 44} 264`} fill="none" stroke="var(--brass)" strokeWidth="3" strokeLinecap="round" />
      {bars.map((b, i) => (
        <rect
          key={i}
          x={56 + b.indent}
          y={b.y}
          width={b.w}
          height="7"
          rx="3.5"
          fill={b.hot ? "var(--brass)" : "var(--navy)"}
          opacity={b.hot ? 0.85 : 0.2 + (i % 3) * 0.08}
        />
      ))}
    </>
  );
}

function Bench(r: Rnd) {
  // Workbench: a measured grid with a signal trace across it.
  const pts = Array.from({ length: 30 }, (_, i) => {
    const x = (i / 29) * W;
    const y = H / 2 + Math.sin(i * 0.5 + r() * 0.4) * (26 + r() * 16);
    return `${x},${y}`;
  }).join(" ");
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2={H} stroke="var(--navy)" strokeWidth="1" opacity="0.14" />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 50} x2={W} y2={i * 50} stroke="var(--navy)" strokeWidth="1" opacity="0.14" />
      ))}
      <polyline points={pts} fill="none" stroke="var(--brass)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <line x1="30" y1={H - 40} x2={W - 30} y2={H - 40} stroke="var(--navy)" strokeWidth="2" opacity="0.5" />
      {Array.from({ length: 8 }, (_, i) => (
        <line key={`t${i}`} x1={30 + i * ((W - 60) / 7)} y1={H - 40} x2={30 + i * ((W - 60) / 7)} y2={H - (i % 2 ? 50 : 56)} stroke="var(--navy)" strokeWidth="1.6" opacity="0.5" />
      ))}
    </>
  );
}

function Isometric(r: Rnd) {
  // Isometric wireframe solid — CAD vocabulary.
  const cx = W / 2;
  const cy = H / 2 + 10;
  const s = 70;
  const k = 0.55;
  const top: [number, number][] = [
    [cx, cy - s * k - 34],
    [cx + s, cy - 34],
    [cx, cy + s * k - 34],
    [cx - s, cy - 34],
  ];
  const poly = (p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <>
      <polygon points={poly(top)} fill="var(--navy-soft)" stroke="var(--navy)" strokeWidth="2" />
      <polygon
        points={poly([top[3], top[2], [top[2][0], top[2][1] + 68], [top[3][0], top[3][1] + 68]])}
        fill="none"
        stroke="var(--navy)"
        strokeWidth="2"
        opacity="0.6"
      />
      <polygon
        points={poly([top[2], top[1], [top[1][0], top[1][1] + 68], [top[2][0], top[2][1] + 68]])}
        fill="none"
        stroke="var(--brass)"
        strokeWidth="2"
        opacity="0.9"
      />
      {Array.from({ length: 4 }, (_, i) => (
        <circle key={i} cx={top[i][0]} cy={top[i][1]} r="4" fill="var(--brass)" />
      ))}
      <line x1={cx - 110} y1={cy + 76} x2={cx + 110} y2={cy + 76} stroke="var(--navy)" strokeWidth="1" opacity="0.3" strokeDasharray="4 4" />
      <text x={cx} y={cy + 92} textAnchor="middle" fontSize="11" fill="var(--ink-3)" fontFamily="monospace">
        {`${Math.round(60 + r() * 80)}.0 mm`}
      </text>
    </>
  );
}

function Arena(r: Rnd) {
  // Concentric hexagons — competitive arena geometry.
  const cx = W / 2;
  const cy = H / 2;
  const hex = (rad: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
    }).join(" ");
  return (
    <>
      {[118, 92, 66, 40].map((rad, i) => (
        <polygon
          key={i}
          points={hex(rad)}
          fill="none"
          stroke={i === 1 ? "var(--brass)" : "var(--navy)"}
          strokeWidth={i === 1 ? 2.4 : 1.4}
          opacity={i === 1 ? 0.9 : 0.3 - i * 0.04 + 0.2}
        />
      ))}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return (
          <circle key={i} cx={cx + Math.cos(a) * 118} cy={cy + Math.sin(a) * 118} r={r() > 0.5 ? 5 : 3.5} fill="var(--brass)" />
        );
      })}
      <polygon points={hex(16)} fill="var(--navy)" opacity="0.8" />
    </>
  );
}

function Radial(r: Rnd) {
  // Radiating spokes — question and answer, broadcast outward.
  const cx = W / 2;
  const cy = H / 2;
  return (
    <>
      {Array.from({ length: 22 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 22;
        const inner = 34;
        const outer = 72 + r() * 68;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * inner}
            y1={cy + Math.sin(a) * inner}
            x2={cx + Math.cos(a) * outer}
            y2={cy + Math.sin(a) * outer}
            stroke={i % 4 === 0 ? "var(--brass)" : "var(--navy)"}
            strokeWidth={i % 4 === 0 ? 2.6 : 1.3}
            opacity={i % 4 === 0 ? 0.85 : 0.28}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r="26" fill="none" stroke="var(--navy)" strokeWidth="2.6" />
      <circle cx={cx} cy={cy} r="9" fill="var(--brass)" />
    </>
  );
}

const MOTIF: Record<string, (r: Rnd) => React.ReactNode> = {
  Hardware,
  Drone,
  "AI / ML": Network,
  Software: Code,
  Workshop: Bench,
  Design: Isometric,
  Esports: Arena,
  Quiz: Radial,
};

export function Art({ seed, category, className, wide = false }: Props) {
  const r = prng(seed * 2654435761);
  const draw = MOTIF[category] ?? Hardware;
  const vb = wide ? `0 ${H * 0.18} ${W} ${H * 0.64}` : `0 0 ${W} ${H}`;

  return (
    <svg
      viewBox={vb}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={`${category} event artwork`}
      style={{ background: "var(--surface-2)", display: "block" }}
    >
      {/* Faint technical grid, same vocabulary across every motif. */}
      <defs>
        <pattern id={`g${seed}`} width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M 25 0 L 0 0 0 25" fill="none" stroke="var(--line)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="0" y={H * 0.18 - 10} width={W} height={H} fill={`url(#g${seed})`} opacity="0.65" />
      {draw(r)}
    </svg>
  );
}

/** Small square mark used in list rows and tickets where a full poster is too much. */
export function ArtChip({ seed, category, size = 44 }: { seed: number; category: string; size?: number }) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-sm border border-line"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Art seed={seed} category={category} className="h-full w-full" />
    </div>
  );
}
