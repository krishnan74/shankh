import type { Report } from "@/lib/arkiv";
import { TierPill } from "./ui";

/**
 * "The key that dies", in plain words: built from the real, latest shankh.report on Arkiv (every
 * field is a live read). The last state -- keys switched off -- is drawn dashed, because that step
 * isn't built yet; drawing it solid would claim something that never happened.
 */
const STATES = ["Installed", "Caught", "Alarm raised", "Keys off"] as const;

export function KeyCard({ reports }: { reports: Report[] | null }) {
  const report = reports?.[0] ?? null;
  const reached = report ? (report.malicious ? 3 : 1) : 0; // malicious: through "Alarm raised"; clean: just "Installed"

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6">
      <p className="label text-[10px] text-accent">Latest alarm · live from Arkiv</p>
      {report ? (
        <>
          <p className="mt-3 text-lg">
            <span className="font-mono font-medium">{report.package} {report.version}</span>
          </p>
          <div className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
            flagged <TierPill tier={report.tier} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-text-secondary">
          {reports === null ? "Couldn\u2019t reach Arkiv just now \u2014 reload to retry." : "No alarms on Arkiv yet."}
        </p>
      )}

      <ol className="mt-6 flex items-center">
        {STATES.map((label, i) => {
          const isLast = i === STATES.length - 1;
          const done = !isLast && i < reached;
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full border ${
                    isLast ? "border-dashed border-text-secondary" : done ? "border-accent bg-accent" : "border-text-secondary"
                  }`}
                />
                <span className={`text-[11px] whitespace-nowrap ${done ? "text-accent" : "text-text-secondary"}`}>{label}</span>
              </div>
              {!isLast && <span className={`mx-1 mb-5 h-px flex-1 ${done && i + 1 < reached ? "bg-accent" : "bg-border"}`} />}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-text-secondary">&ldquo;Keys off&rdquo; is dashed because that step comes next.</p>
    </div>
  );
}
