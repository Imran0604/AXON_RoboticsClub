"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient particle field behind the hero.
 *
 * Canvas rather than SVG or DOM nodes: a few hundred moving points would be
 * hundreds of layout-and-paint operations per frame as elements, but is one
 * draw call here.
 *
 * Four things keep it from being a battery drain or an accessibility problem:
 * it honours prefers-reduced-motion by drawing a single static frame and
 * stopping; it pauses entirely when scrolled out of view; it caps the device
 * pixel ratio at 2; and particle count scales with the viewport so a phone
 * does far less work than a desktop.
 */
export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    let points: P[] = [];

    // Read the brand hue from the stylesheet so the field follows the theme
    // instead of hardcoding a colour that would be wrong in light mode.
    function brandRGB(): [number, number, number] {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--brand").trim();
      const m = raw.match(/^#?([0-9a-f]{6})$/i);
      if (m) {
        const n = parseInt(m[1], 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }
      return [53, 167, 232];
    }
    let [br, bg, bb] = brandRGB();

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Density scales with area, capped so large screens stay cheap.
      const target = Math.min(110, Math.max(26, Math.round((width * height) / 14000)));
      points = Array.from({ length: target }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.6 + 0.7,
        a: Math.random() * 0.5 + 0.25,
      }));
    }

    const LINK = 128; // px within which two points are joined

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      // Links first so dots sit on top of them.
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;
          const t = 1 - Math.sqrt(d2) / LINK;
          ctx!.strokeStyle = `rgba(${br},${bg},${bb},${t * 0.16})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(points[i].x, points[i].y);
          ctx!.lineTo(points[j].x, points[j].y);
          ctx!.stroke();
        }
      }

      for (const p of points) {
        ctx!.fillStyle = `rgba(${br},${bg},${bb},${p.a})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function step() {
      for (const p of points) {
        p.x += p.vx;
        p.y += p.vy;
        // Wrap rather than bounce — bouncing makes the edges feel like walls.
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;
      }
      draw();
      raf = requestAnimationFrame(step);
    }

    resize();

    if (reduced) {
      draw(); // one static frame, no animation loop
    } else {
      raf = requestAnimationFrame(step);
    }

    const onResize = () => {
      resize();
      if (reduced) draw();
    };
    window.addEventListener("resize", onResize);

    // Stop drawing when the hero is scrolled away.
    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        if (visible && !running && !reduced) {
          running = true;
          raf = requestAnimationFrame(step);
        } else if (!visible && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    // Follow a theme switch without a reload.
    const mo = new MutationObserver(() => {
      [br, bg, bb] = brandRGB();
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

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: 0.75 }}
    />
  );
}
