"use client";

import { useEffect, useRef } from "react";

/**
 * Orbital system for the hero.
 *
 * Thematically this is the club mark made kinetic: a signal node at the centre
 * with packets travelling outward along fixed paths. Four tilted elliptical
 * orbits, each carrying particles at its own speed and direction, with the
 * whole assembly rotating slowly.
 *
 * Drawn on canvas for the same reason as the background field — this is ~40
 * moving bodies plus trails, which would be far too many DOM nodes to animate
 * cheaply. Honours prefers-reduced-motion with a single static frame, pauses
 * when scrolled out of view, caps DPR at 2, and follows a theme switch.
 */

interface Orbit {
  rx: number;        // horizontal radius, as a fraction of the system radius
  ry: number;        // vertical radius — the difference is what reads as tilt
  tilt: number;      // rotation of the ellipse itself
  speed: number;     // radians per frame
  count: number;     // particles riding this orbit
  size: number;
  dir: 1 | -1;
}

const ORBITS: Orbit[] = [
  { rx: 0.42, ry: 0.15, tilt: -0.32, speed: 0.0115, count: 3, size: 2.6, dir: 1 },
  { rx: 0.62, ry: 0.24, tilt: 0.42, speed: 0.0082, count: 4, size: 2.2, dir: -1 },
  { rx: 0.8, ry: 0.33, tilt: -0.68, speed: 0.0058, count: 5, size: 1.9, dir: 1 },
  { rx: 0.96, ry: 0.46, tilt: 1.04, speed: 0.0041, count: 6, size: 1.6, dir: -1 },
];

export function Orbitals({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;
    let t = 0;

    function rgb(varName: string, fallback: [number, number, number]): [number, number, number] {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      const m = raw.match(/^#?([0-9a-f]{6})$/i);
      if (!m) return fallback;
      const n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    let brand = rgb("--brand", [53, 167, 232]);
    let accent = rgb("--accent", [127, 212, 245]);

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.44;
      // The whole system precesses slowly, so it never looks like a flat loop.
      const sway = Math.sin(t * 0.0013) * 0.12;

      const [br, bgc, bb] = brand;
      const [ar, ag, ab] = accent;

      for (let oi = 0; oi < ORBITS.length; oi++) {
        const o = ORBITS[oi];
        const rx = R * o.rx;
        const ry = R * o.ry;
        const tilt = o.tilt + sway;

        // The path.
        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.rotate(tilt);
        ctx!.beginPath();
        ctx!.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${br},${bgc},${bb},${0.2 - oi * 0.025})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
        ctx!.restore();

        // Bodies riding it.
        for (let i = 0; i < o.count; i++) {
          const phase = (Math.PI * 2 * i) / o.count + t * o.speed * o.dir;
          const ex = Math.cos(phase) * rx;
          const ey = Math.sin(phase) * ry;
          const x = cx + ex * Math.cos(tilt) - ey * Math.sin(tilt);
          const y = cy + ex * Math.sin(tilt) + ey * Math.cos(tilt);

          // Far side of the orbit dims, which is what sells the tilt as depth.
          const depth = (Math.sin(phase) + 1) / 2;
          const alpha = 0.3 + depth * 0.7;
          const size = o.size * (0.75 + depth * 0.45);

          // Trail, stepped backwards along the same path.
          for (let s = 1; s <= 5; s++) {
            const p2 = phase - o.dir * s * 0.055;
            const tx2 = Math.cos(p2) * rx;
            const ty2 = Math.sin(p2) * ry;
            const x2 = cx + tx2 * Math.cos(tilt) - ty2 * Math.sin(tilt);
            const y2 = cy + tx2 * Math.sin(tilt) + ty2 * Math.cos(tilt);
            ctx!.beginPath();
            ctx!.arc(x2, y2, size * (1 - s * 0.15), 0, Math.PI * 2);
            ctx!.fillStyle = `rgba(${br},${bgc},${bb},${alpha * (0.16 - s * 0.027)})`;
            ctx!.fill();
          }

          const g = ctx!.createRadialGradient(x, y, 0, x, y, size * 5);
          g.addColorStop(0, `rgba(${ar},${ag},${ab},${alpha})`);
          g.addColorStop(0.35, `rgba(${br},${bgc},${bb},${alpha * 0.5})`);
          g.addColorStop(1, `rgba(${br},${bgc},${bb},0)`);
          ctx!.beginPath();
          ctx!.arc(x, y, size * 5, 0, Math.PI * 2);
          ctx!.fillStyle = g;
          ctx!.fill();

          ctx!.beginPath();
          ctx!.arc(x, y, size, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${ar},${ag},${ab},${alpha})`;
          ctx!.fill();
        }
      }

      // Core — the signal node the whole thing is about.
      const pulse = 1 + Math.sin(t * 0.022) * 0.08;
      const core = ctx!.createRadialGradient(cx, cy, 0, cx, cy, R * 0.3 * pulse);
      core.addColorStop(0, `rgba(${ar},${ag},${ab},0.85)`);
      core.addColorStop(0.25, `rgba(${br},${bgc},${bb},0.4)`);
      core.addColorStop(1, `rgba(${br},${bgc},${bb},0)`);
      ctx!.beginPath();
      ctx!.arc(cx, cy, R * 0.3 * pulse, 0, Math.PI * 2);
      ctx!.fillStyle = core;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.arc(cx, cy, 5.5 * pulse, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${ar},${ag},${ab},0.95)`;
      ctx!.fill();

      // Two faint containment rings, to echo the mark's enclosing circle.
      for (const [rr, op] of [
        [0.52, 0.16],
        [1.04, 0.08],
      ] as const) {
        ctx!.beginPath();
        ctx!.arc(cx, cy, R * rr, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${br},${bgc},${bb},${op})`;
        ctx!.lineWidth = 1;
        ctx!.setLineDash([3, 7]);
        ctx!.stroke();
        ctx!.setLineDash([]);
      }
    }

    function step() {
      t += 1;
      draw();
      raf = requestAnimationFrame(step);
    }

    resize();
    if (reduced) draw();
    else raf = requestAnimationFrame(step);

    const onResize = () => {
      resize();
      if (reduced) draw();
    };
    window.addEventListener("resize", onResize);

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !running && !reduced) {
          running = true;
          raf = requestAnimationFrame(step);
        } else if (!e.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const mo = new MutationObserver(() => {
      brand = rgb("--brand", [53, 167, 232]);
      accent = rgb("--accent", [127, 212, 245]);
      if (reduced) draw();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
