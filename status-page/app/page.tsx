import { connection } from "next/server";
import { recentReports } from "@/lib/arkiv";
import { packageEnsInfo } from "@/lib/ens";
import { killSwitchInfo } from "@/lib/killswitch";
import { Hero, Problem, Mechanism, Tracks, Limitations, SiteFooter } from "@/components/sections";
import { Card, Code, Eyebrow, TIER_STYLE } from "@/components/ui";
import { Reveal } from "@/components/reveal";

// Blocking dynamic render, no static shell -- the whole point is every request reads live.
export const instant = false;

export default async function Home() {
  await connection(); // forces per-request dynamic rendering -- without this, cacheComponents would prerender this page statically at build time and freeze whatever it saw then, which is exactly the hard-coded-values failure mode the ENS track rules out

  const [reports, killSwitch, packageEns] = await Promise.all([
    recentReports().catch(() => null),
    killSwitchInfo().catch(() => null),
    packageEnsInfo().catch(() => null),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 pb-20 sm:px-10">
      <Hero />
      <Problem />
      <Mechanism />
      <Tracks />
      <Limitations />

      <Reveal>
        <section id="proof" className="flex flex-col gap-8 border-t border-border pt-10">
          <div className="flex flex-col gap-2">
            <Eyebrow>Live proof — not a mock</Eyebrow>
            <p className="max-w-2xl text-sm text-text-secondary">
              Read fresh from Sepolia and the Arkiv testnet on this exact request, server-side, every
              time this page loads.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-text-tertiary">KillSwitch — Sepolia</h3>
            {killSwitch ? (
              <Card className="text-sm">
                <div>
                  contract: <Code>{killSwitch.address}</Code>
                </div>
                <div>
                  maintainer: <Code>{killSwitch.maintainer}</Code>
                </div>
              </Card>
            ) : (
              <p className="text-sm text-text-tertiary">
                Not configured — set <Code>KILLSWITCH_ADDRESS</Code> and <Code>SEPOLIA_RPC_URL</Code>.
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-text-tertiary">
              ENS tree — shankh-demo.pypi.shankh.eth
            </h3>
            {packageEns ? (
              <Card className="text-sm">
                <div>
                  resolver: <Code>{packageEns.resolver}</Code>
                </div>
                <div className="mt-1 truncate" title={packageEns.source ?? undefined}>
                  shankh.source: <Code>{packageEns.source ?? "(not set)"}</Code>
                </div>
                <div className="mt-1">
                  shankh.revoked:{" "}
                  {packageEns.revokedArtifacts.length === 0 ? (
                    <span className="text-text-tertiary">none</span>
                  ) : (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
                      {packageEns.revokedArtifacts.length} artifact(s) revoked
                    </span>
                  )}
                </div>
                {packageEns.revokedArtifacts.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-0.5 font-mono text-xs text-text-secondary">
                    {packageEns.revokedArtifacts.map((hash) => (
                      <li key={hash} className="truncate">
                        {hash}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ) : (
              <p className="text-sm text-text-tertiary">
                Not configured — set <Code>PACKAGE_RESOLVER_ADDRESS</Code>, <Code>PACKAGE_DNS_ENCODED_NAME</Code> and{" "}
                <Code>SEPOLIA_RPC_URL</Code>.
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-text-tertiary">
              Recent reports — Arkiv testnet
            </h3>
            {reports === null ? (
              <p className="text-sm text-text-tertiary">
                Could not reach Arkiv — check <Code>ARKIV_RPC_URL</Code>/<Code>ARKIV_ACCESS_KEY</Code>.
              </p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-text-tertiary">
                No reports yet. Run <Code>shankh verify</Code> to write one.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {reports.map((report) => (
                  <li key={report.key}>
                    <Card className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono">
                          {report.package}=={report.version}
                        </span>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${TIER_STYLE[report.tier] ?? ""}`}>
                          {report.tier}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-xs text-text-tertiary" title={report.reporter}>
                        reported by {report.reporter}
                      </div>
                      {report.findings.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-0.5 font-mono text-xs text-text-secondary">
                          {report.findings.map((finding) => (
                            <li key={finding.relativePath}>
                              [{finding.tier}] {finding.relativePath}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2 truncate text-xs text-text-tertiary" title={report.key}>
                        {report.key}
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </Reveal>

      <SiteFooter />
    </main>
  );
}
