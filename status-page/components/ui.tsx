export const TIER_STYLE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  modified: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  untraceable: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  match: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

/** The risk-tier chip, used anywhere a real verify/report result needs a one-word read. */
export function TierPill({ tier }: { tier: string }) {
  return (
    <span className={`label rounded px-2 py-0.5 text-[10px] ${TIER_STYLE[tier] ?? "bg-black/[.06] dark:bg-white/[.08]"}`}>
      {tier}
    </span>
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
  roomy = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** "inverted" marks the solution against the problem next to it (landing-page-playbook.md #3)
   * -- a separate prop, not a conflicting bg-* override, so Tailwind's utility-collision rule
   * (stylesheet order, not className order, picks the winner) can't silently undo it. */
  tone?: "surface" | "inverted";
  /** Bigger padding for hero-scale panels -- a prop, not a className override, for the same
   * utility-collision reason as `tone`. */
  roomy?: boolean;
}) {
  const toneClass = tone === "inverted" ? "tone-inverted border-accent/40 bg-foreground text-background" : "border-border bg-surface";
  const padClass = roomy ? "p-8 sm:p-12 lg:p-16" : "p-6 sm:p-7";
  return <div className={`rounded-2xl border ${padClass} ${toneClass} ${className}`}>{children}</div>;
}

/**
 * One full-width section of the story. Bands alternate between the page background and the
 * white surface, separated by a hairline, so each part of the pitch reads as its own page --
 * with generous vertical room so nothing feels crowded.
 */
export function Band({ children, alt = false, className = "" }: { children: React.ReactNode; alt?: boolean; className?: string }) {
  return (
    <section className={`border-t border-border ${alt ? "bg-surface" : "bg-background"} ${className}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-24 sm:px-10 sm:py-32">{children}</div>
    </section>
  );
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
  id,
}: {
  kicker: string;
  headline: React.ReactNode;
  lede?: React.ReactNode;
  /** Anchors the presenter rail's scrollspy to this section. */
  id?: string;
}) {
  return (
    <div id={id} className="mx-auto grid w-full max-w-3xl scroll-mt-24 grid-cols-12 gap-x-6 gap-y-4">
      <div className="col-span-12 sm:col-span-3 sm:pt-2">
        <Eyebrow>{kicker}</Eyebrow>
      </div>
      <div className="col-span-12 flex flex-col gap-5 sm:col-span-9">
        <h2 className="font-display text-3xl leading-[1.1] font-bold tracking-tight text-balance sm:text-4xl">{headline}</h2>
        {lede && <p className="max-w-xl text-lg leading-relaxed text-text-secondary">{lede}</p>}
      </div>
    </div>
  );
}

/** One "we tried to break our own guarantee" artifact: the exact revert a real transaction threw,
 * not a paraphrase of it -- the proof that a claim is enforced on-chain, not just asserted. */
export function RevertProof({ attempt, error, txHref }: { attempt: string; error: string; txHref?: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs dark:border-red-900/60 dark:bg-red-950/40">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-text-secondary">{attempt}</span>
        <span className="label text-[10px] text-red-700 dark:text-red-400">reverted</span>
      </div>
      <code className="block break-all font-mono text-red-800 dark:text-red-300">{error}</code>
      {txHref && (
        <a href={txHref} className="mt-1 inline-block text-[10px] text-red-700 underline underline-offset-2 dark:text-red-400">
          view attempt on Etherscan ↗
        </a>
      )}
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
