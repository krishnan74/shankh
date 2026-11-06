/**
 * Live shankh.report entities from Arkiv, styled as a dispatch log, plus the trusted reporters
 * they can come from. No timestamp column: the schema carries none and $createdAt isn't a
 * queryable Arkiv system attribute (see status-page/lib/arkiv.ts), so a time here would have to be
 * invented -- it isn't.
 *
 * Each alarm is labelled by the wallet Arkiv recorded as its signer ($creator), never by the
 * report's own `reporter` field, which anyone can fill in with any address. When that wallet is a
 * reporter's `shankh.signer` on ENS, the alarm shows the reporter's name -- the same match
 * `shankh scan --trust` makes before it acts on anything.
 */
import type { Report } from "@/lib/arkiv";
import type { Reporter } from "@/lib/reporters";
import { TierPill } from "./ui";

const short = (v: string) => (v.length > 14 ? `${v.slice(0, 6)}…${v.slice(-4)}` : v);

export function signerName(creator: string, reporters: Reporter[] | null): string | null {
  const match = reporters?.find((r) => r.signer.toLowerCase() === creator.toLowerCase());
  return match ? match.name : null;
}

export function ReportFeed({
  reports,
  reporters,
  limit = 4,
}: {
  reports: Report[] | null;
  reporters: Reporter[] | null;
  limit?: number;
}) {
  return (
    <div className="flex flex-col gap-8">
      <Feed reports={reports} reporters={reporters} limit={limit} />
      <TrustedReporters reports={reports} reporters={reporters} />
    </div>
  );
}

function Feed({ reports, reporters, limit }: { reports: Report[] | null; reporters: Reporter[] | null; limit: number }) {
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
      <p className="label mb-2 text-[10px] text-accent">Alarms on Arkiv · live</p>
      <ul className="flex flex-col border-l border-accent/40">
        {shown.map((r) => {
          const name = signerName(r.creator, reporters);
          return (
            <li key={r.key} className="relative flex flex-col gap-1 border-b border-border py-2.5 pl-4 last:border-b-0">
              <span className="absolute top-4 -left-[3px] h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs">
                  {r.package}@{r.version}
                </span>
                <TierPill tier={r.tier} />
              </div>
              <span className="font-mono text-[10px] break-all text-text-tertiary" title={r.creator}>
                signed by {name ? <span className="text-foreground">{name}</span> : short(r.creator)}
                {r.ensRevoked && <span className="ml-2 text-accent">· ENS-revoked</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {rest > 0 && (
        <a href="#ledger" className="mt-2 text-xs text-text-secondary underline underline-offset-2 hover:text-accent">
          +{rest} more in the ledger →
        </a>
      )}
    </div>
  );
}

export function TrustedReporters({ reports, reporters }: { reports: Report[] | null; reporters: Reporter[] | null }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="label text-[10px] text-accent">Trusted reporters · on ENS, live</p>
        <p className="text-xs leading-relaxed text-text-secondary">
          A machine only acts on alarms from reporters it chooses. Each one is an ENS name that publishes the wallet they sign with — and only
          they can change it.
        </p>
      </div>
      {reporters === null ? (
        <p className="text-xs text-text-tertiary">Couldn&rsquo;t read ENS just now.</p>
      ) : reporters.length === 0 ? (
        <p className="text-xs text-text-tertiary">No reporters registered yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reporters.map((r) => {
            const signed = reports?.filter((rep) => rep.creator.toLowerCase() === r.signer.toLowerCase()).length ?? null;
            return (
              <li key={r.name} className="flex flex-col gap-1 rounded-xl border border-border bg-surface px-3.5 py-3">
                <span className="font-mono text-xs break-all text-foreground">{r.name}</span>
                <span className="font-mono text-[10px] break-all text-text-tertiary">
                  shankh.signer → {r.signer}
                </span>
                {signed !== null && (
                  <span className="text-[11px] text-accent">
                    {signed} of the latest {reports?.length} alarm{reports?.length === 1 ? "" : "s"} signed
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
