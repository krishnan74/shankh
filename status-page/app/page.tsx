import { connection } from "next/server";
import { recentReports } from "@/lib/arkiv";
import { packageEnsInfo } from "@/lib/ens";
import { killSwitchInfo } from "@/lib/killswitch";

// Blocking dynamic render, no static shell -- the whole point is every request reads live.
export const instant = false;

const TIER_STYLE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  modified: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  untraceable: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  match: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-sm dark:bg-white/[.08]">{children}</code>;
}

export default async function Home() {
  await connection(); // forces per-request dynamic rendering -- without this, cacheComponents would prerender this page statically at build time and freeze whatever it saw then, which is exactly the hard-coded-values failure mode the ENS track rules out

  const [reports, killSwitch, packageEns] = await Promise.all([
    recentReports().catch(() => null),
    killSwitchInfo().catch(() => null),
    packageEnsInfo().catch(() => null),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 p-8 pt-16 font-sans sm:p-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">Shankh status</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Live <Code>shankh.report</Code> entities from the Arkiv testnet and the <Code>KillSwitch</Code> contract on
          Sepolia. Everything below is read from those live sources on each request, not cached or hard-coded.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">KillSwitch — Sepolia</h2>
        {killSwitch ? (
          <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <div>
              contract: <Code>{killSwitch.address}</Code>
            </div>
            <div>
              maintainer: <Code>{killSwitch.maintainer}</Code>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Not configured — set <Code>KILLSWITCH_ADDRESS</Code> and <Code>SEPOLIA_RPC_URL</Code>.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">ENS tree — shankh-demo.pypi.shankh.eth</h2>
        {packageEns ? (
          <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <div>
              resolver: <Code>{packageEns.resolver}</Code>
            </div>
            <div className="mt-1 truncate" title={packageEns.source ?? undefined}>
              shankh.source: <Code>{packageEns.source ?? "(not set)"}</Code>
            </div>
            <div className="mt-1">
              shankh.revoked:{" "}
              {packageEns.revokedArtifacts.length === 0 ? (
                <span className="text-zinc-500">none</span>
              ) : (
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
                  {packageEns.revokedArtifacts.length} artifact(s) revoked
                </span>
              )}
            </div>
            {packageEns.revokedArtifacts.length > 0 && (
              <ul className="mt-2 flex flex-col gap-0.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {packageEns.revokedArtifacts.map((hash) => (
                  <li key={hash} className="truncate">
                    {hash}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Not configured — set <Code>PACKAGE_RESOLVER_ADDRESS</Code>, <Code>PACKAGE_DNS_ENCODED_NAME</Code> and{" "}
            <Code>SEPOLIA_RPC_URL</Code>.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">Recent reports — Arkiv testnet</h2>
        {reports === null ? (
          <p className="text-sm text-zinc-500">
            Could not reach Arkiv — check <Code>ARKIV_RPC_URL</Code>/<Code>ARKIV_ACCESS_KEY</Code>.
          </p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-zinc-500">No reports yet. Run <Code>shankh verify</Code> to write one.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((report) => (
              <li key={report.key} className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono">
                    {report.package}=={report.version}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${TIER_STYLE[report.tier] ?? ""}`}>
                    {report.tier}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-zinc-500" title={report.reporter}>
                  reported by {report.reporter}
                </div>
                {report.findings.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-0.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {report.findings.map((finding) => (
                      <li key={finding.relativePath}>
                        [{finding.tier}] {finding.relativePath}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 truncate text-xs text-zinc-400" title={report.key}>
                  {report.key}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
