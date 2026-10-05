/**
 * The AXON club mark: a signal node branching into three actuator paths,
 * crossed by a single brass conductor.
 *
 * An axon carries a signal from a neuron to a muscle, which is the shape of
 * every robot — sense, decide, actuate. Drawn rather than imported as an
 * image file so it inherits theme colours and stays crisp at any size.
 */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 84 84"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="AXON Robotics Club"
    >
      <circle cx="42" cy="42" r="39" fill="none" stroke="var(--navy)" strokeWidth="2" opacity="0.26" />
      <path
        d="M42 68 L42 44 M42 44 L25 23 M42 44 L59 23"
        fill="none"
        stroke="var(--navy)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <path d="M28 53 L56 53" fill="none" stroke="var(--brass)" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="42" cy="44" r="7" fill="var(--brass)" />
      <circle cx="25" cy="23" r="4.4" fill="var(--navy)" />
      <circle cx="59" cy="23" r="4.4" fill="var(--navy)" />
      <circle cx="42" cy="68" r="4.4" fill="var(--navy)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Logo size={30} />
      <span className="flex flex-col leading-none">
        <span className="text-[1.0625rem] font-extrabold tracking-[0.04em] text-ink">AXON</span>
        <span className="eyebrow mt-0.5 text-[0.5625rem] tracking-[0.16em]">Robotics Club</span>
      </span>
    </span>
  );
}
