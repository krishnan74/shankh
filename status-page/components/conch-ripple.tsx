/**
 * The brand mark in motion: one teal origin emits concentric rings that reach a field of neutral
 * nodes -- one report protecting many machines. Pure SVG, 1px strokes, drawn once on enter via
 * the parent Reveal's [data-reveal="in"] (see globals.css .ripple-ring / .ripple-node). Purely
 * decorative: aria-hidden, with the meaning carried in the surrounding text.
 */
type Node = { x: number; y: number };

export function ConchRipple({
  rings = 4,
  nodes = [],
  className = "",
  protectedNodes = false,
}: {
  rings?: number;
  nodes?: Node[];
  className?: string;
  /** When true, nodes render teal-outlined ("protected") as the ripple reaches them. */
  protectedNodes?: boolean;
}) {
  const cx = 200;
  const cy = 200;
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true" fill="none">
      {Array.from({ length: rings }).map((_, i) => (
        <circle
          key={i}
          className="ripple-ring"
          cx={cx}
          cy={cy}
          r={40 + i * 42}
          pathLength={1}
          stroke="var(--accent)"
          strokeOpacity={0.35 - i * 0.06}
          strokeWidth={1}
          style={{ transitionDelay: `${i * 180}ms` }}
        />
      ))}
      {nodes.map((n, i) => {
        const dist = Math.hypot(n.x - cx, n.y - cy);
        return (
          <circle
            key={`n${i}`}
            className="ripple-node"
            cx={n.x}
            cy={n.y}
            r={4}
            fill={protectedNodes ? "var(--background)" : "var(--text-tertiary)"}
            stroke={protectedNodes ? "var(--accent)" : "none"}
            strokeWidth={1.2}
            style={{ transitionDelay: `${Math.round(dist * 4)}ms` }}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={6} fill="var(--accent)" />
    </svg>
  );
}

/** A deterministic field of nodes around the origin (no Math.random -- server and client agree). */
export function nodeField(count: number): Node[] {
  const out: Node[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i * 137.5 * Math.PI) / 180;
    const radius = 70 + ((i * 53) % 120);
    out.push({ x: 200 + Math.cos(angle) * radius, y: 200 + Math.sin(angle) * radius });
  }
  return out;
}
