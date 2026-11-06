import type { Report } from "@/lib/arkiv";
import { Code } from "./code.client";
import { TierPill } from "./ui";

/**
 * The credential protagonist: built from the real, latest shankh.report entity (package,
 * version, tier, artifact hash, reporter -- every field here is a live read, nothing invented).
 * Its state track visualizes what that report means -- but the last state ("Kill triggered") is
 * drawn as pending/dashed, not solid, because the AWS deactivation step isn't built yet. Showing
 * it solid would be exactly the kind of faked claim the brief's own non-negotiables rule out; the
 * dashed state keeps the narrative device honest about what's actually wired versus what's next.
 */
const STATES = ["Active", "Exposed", "Reported", "Kill triggered"] as const;

export function KeyCard({ report }: { report: Report | null }) {
  const reached = report ? (report.malicious ? 3 : 1) : 0; // malicious -> through "Reported"; clean -> just "Active"

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6">
      <p className="label text-xs text-accent">✓ built from a live Arkiv read</p>
      {report ? (
        <>
          <p className="mt-3 font-mono text-lg font-medium">
            {report.package}=={report.version}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <TierPill tier={report.tier} />
            {report.artifactSha256 && (
              <span className="text-xs text-text-tertiary">
                artifact <Code>{report.artifactSha256}</Code>
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-text-tertiary">No reports on Arkiv yet — the track below shows every state the product moves a key through, none reached.</p>
      )}

      <ol className="mt-6 flex items-center gap-0">
        {STATES.map((label, i) => {
          const done = i <= reached - 1;
          const isLast = i === STATES.length - 1;
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full border ${
                    isLast
                      ? "border-dashed border-text-tertiary bg-transparent"
                      : done
                        ? "border-accent bg-accent"
                        : "border-text-tertiary bg-transparent"
                  }`}
                />
                <span className={`label text-[9px] ${done && !isLast ? "text-accent" : "text-text-tertiary"}`}>{label}</span>
              </div>
              {!isLast && <span className={`mx-1 h-px flex-1 ${done ? "bg-accent" : "bg-border"}`} />}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[11px] text-text-tertiary">
        &ldquo;Kill triggered&rdquo; is dashed on purpose — the AWS deactivation step isn&rsquo;t wired up yet (see the honest close below).
      </p>
    </div>
  );
}
