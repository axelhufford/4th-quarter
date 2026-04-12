/**
 * 4th Quarter logo mark.
 *
 * A "Q" where the bottom-right quadrant of the counter is lit orange and
 * flows seamlessly into the ring and tail — representing the final quarter.
 *
 * Usage:
 *   <Logo size={32} />                    // default, for dark backgrounds
 *   <Logo size={88} background="light" /> // for light backgrounds
 */
type LogoProps = {
  size?: number;
  background?: "dark" | "light";
  className?: string;
};

export function Logo({ size = 32, background = "dark", className }: LogoProps) {
  // On dark surfaces the three dim quadrants are zinc-900 (subtly visible
  // against the zinc-950 page). On light surfaces they're near-black.
  const dimFill = background === "dark" ? "#18181b" : "#0a0a0a";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="4th Quarter"
    >
      <path d="M 100 100 L 100 55 A 45 45 0 0 1 145 100 Z" fill={dimFill} />
      <path d="M 100 100 L 100 145 A 45 45 0 0 1 55 100 Z" fill={dimFill} />
      <path d="M 100 100 L 55 100 A 45 45 0 0 1 100 55 Z" fill={dimFill} />
      <path d="M 100 100 L 175 100 A 75 75 0 0 1 100 175 Z" fill="#f97316" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="#f97316" strokeWidth="30" />
      <line
        x1="132"
        y1="132"
        x2="180"
        y2="180"
        stroke="#f97316"
        strokeWidth="28"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The "buzzer" — a pulsing orange dot used anywhere something is live, active,
 * or alerting. Pairs with the Logo as a secondary brand signal.
 */
type PulseDotProps = {
  size?: number;
  className?: string;
};

export function PulseDot({ size = 7, className }: PulseDotProps) {
  return (
    <span
      className={`inline-block rounded-full bg-orange-500 animate-pulse ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
