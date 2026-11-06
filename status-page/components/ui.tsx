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

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-accent">{children}</p>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 ${className}`}>{children}</div>
  );
}
