"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown to a registration deadline.
 *
 * Renders the server-computed label first so there is no hydration mismatch
 * and no layout shift, then takes over and ticks once a minute.
 */
export function Countdown({ deadline, fallback }: { deadline: string; fallback: string }) {
  const [label, setLabel] = useState(fallback);

  useEffect(() => {
    const target = new Date(deadline).getTime();

    function tick() {
      const ms = target - Date.now();
      if (ms <= 0) {
        setLabel("Registration closed");
        return;
      }
      const mins = Math.floor(ms / 60000);
      const days = Math.floor(mins / 1440);
      const hrs = Math.floor((mins % 1440) / 60);
      const rem = mins % 60;

      if (days > 0) setLabel(`${days}d ${hrs}h remaining`);
      else if (hrs > 0) setLabel(`${hrs}h ${rem}m remaining`);
      else setLabel(`${rem}m remaining`);
    }

    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [deadline]);

  return (
    <span className="mono nums text-[0.8125rem] font-semibold" style={{ color: "var(--brass)" }}>
      {label}
    </span>
  );
}
