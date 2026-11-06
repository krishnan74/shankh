/**
 * Live shankh.report entities from Arkiv, styled as a dispatch log. No timestamp column: the
 * schema carries none and $createdAt isn't a queryable Arkiv system attribute (see
 * status-page/lib/arkiv.ts), so a time here would have to be invented -- it isn't.
 */
import type { Report } from "@/lib/arkiv";
import { TierPill } from "./ui";

const short = (v: string) => (v.length > 14 ? `${v.slice(0, 6)}…${v.slice(-4)}` : v);

export function ReportFeed({ reports, limit = 4 }: { reports: Report[] | null; limit?: number }) {
  if (reports === null) {
    return (
      <p className="text-sm text-text-tertiary">
        Couldn&rsquo;t reach Arkiv just now. <a href="" className="underline underline-offset-2 hover:text-accent">Retry</a>
      </p>
    );
  }
  if (reports.length === 0) {
    return <p className="text-sm text-text-tertiary">No reports yet on this network.</p>;
  }
  const shown = reports.slice(0, limit);
  const rest = reports.length - shown.length;
  return (
    <div className="flex flex-col">
      <p className="label mb-2 text-[10px] text-accent">✓ read live, Arkiv testnet</p>
      <ul className="flex flex-col border-l border-accent/40">
        {shown.map((r) => (
          <li key={r.key} className="relative flex flex-col gap-1 border-b border-border py-2.5 pl-4 last:border-b-0">
            <span className="absolute top-4 -left-[3px] h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs">
                {r.package}@{r.version}
              </span>
              <TierPill tier={r.tier} />
            </div>
            <span className="font-mono text-[10px] text-text-tertiary" title={r.reporter}>
              reporter {short(r.reporter)}
              {r.ensRevoked && <span className="ml-2 text-accent">· ENS-revoked</span>}
            </span>
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <a href="#ledger" className="mt-2 text-xs text-text-secondary underline underline-offset-2 hover:text-accent">
          +{rest} more in the ledger →
        </a>
      )}
    </div>
  );
}
