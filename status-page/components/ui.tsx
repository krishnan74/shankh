export const TIER_STYLE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  modified: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  untraceable: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  match: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-sm break-all dark:bg-white/[.08]">
      {children}
    </code>
  );
}

/** The one micro-label system (landing-page-playbook.md #2): every kicker reads the same way. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="label text-xs text-accent">{children}</p>;
}

export function Card({
  children,
  className = "",
  tone = "surface",
}: {
  children: React.ReactNode;
  className?: string;
  /** "inverted" marks the solution against the problem next to it (landing-page-playbook.md #3)
   * -- a separate prop, not a conflicting bg-* override, so Tailwind's utility-collision rule
   * (stylesheet order, not className order, picks the winner) can't silently undo it. */
  tone?: "surface" | "inverted";
}) {
  const toneClass = tone === "inverted" ? "border-accent/40 bg-foreground text-background" : "border-border bg-surface";
  return <div className={`rounded-xl border p-5 ${toneClass} ${className}`}>{children}</div>;
}

/**
 * The repeating chapter header (landing-page-playbook.md #1, #4): a narrow kicker column and a
 * wide headline+lede column on the same 12-col grid, so section markers read as a running ledger
 * down the page instead of each section centering its own title independently.
 */
export function SectionHeader({
  kicker,
  headline,
  lede,
}: {
  kicker: string;
  headline: React.ReactNode;
  lede?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-12 gap-x-6">
      <div className="col-span-12 sm:col-span-3">
        <Eyebrow>{kicker}</Eyebrow>
      </div>
      <div className="col-span-12 flex flex-col gap-3 sm:col-span-9">
        <h2 className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">{headline}</h2>
        {lede && <p className="max-w-xl text-text-secondary leading-relaxed">{lede}</p>}
      </div>
    </div>
  );
}

/** A real, previously-run terminal transcript -- always dark, in both themes, the universal
 * convention for "this is a command that actually executed," not a mocked-up UI screenshot. */
export function Terminal({ lines }: { lines: { prompt?: boolean; text: string; tone?: "default" | "accent" | "muted" }[] }) {
  const toneClass: Record<string, string> = {
    default: "text-zinc-100",
    accent: "text-emerald-400",
    muted: "text-zinc-500",
  };
  return (
    <div className="overflow-x-auto rounded-xl border border-black/20 bg-[#0b0d0e] p-4 font-mono text-xs leading-relaxed sm:text-sm">
      {lines.map((line, i) => (
        <div key={i} className={`whitespace-pre-wrap break-all ${toneClass[line.tone ?? "default"]}`}>
          {line.prompt && <span className="text-zinc-500">$ </span>}
          {line.text}
        </div>
      ))}
    </div>
  );
}

/** One "we tried to break our own guarantee" artifact: the exact revert a real transaction threw,
 * not a paraphrase of it -- the proof that a claim is enforced on-chain, not just asserted. */
export function RevertProof({ attempt, error }: { attempt: string; error: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs dark:border-red-900/60 dark:bg-red-950/40">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-text-secondary">{attempt}</span>
        <span className="label text-[10px] text-red-700 dark:text-red-400">reverted</span>
      </div>
      <code className="block break-all font-mono text-red-800 dark:text-red-300">{error}</code>
    </div>
  );
}

/** One accordion row for the progressive-disclosure section (landing-page-playbook.md #6). Native
 * <details>/<summary> -- accessible and animation-free by default, styled to match the page. */
export function Detail({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border py-4 first:pt-0 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium">
        {summary}
        <span className="shrink-0 text-text-tertiary transition-transform duration-300 [transition-timing-function:var(--ease)] group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="pt-3 text-sm leading-relaxed text-text-secondary">{children}</div>
    </details>
  );
}
