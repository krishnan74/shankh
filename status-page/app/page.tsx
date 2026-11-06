import { connection } from "next/server";
import { recentReports } from "@/lib/arkiv";
import { packageEnsInfo } from "@/lib/ens";
import { killSwitchInfo } from "@/lib/killswitch";
import { Hero, Hook, WhyNow, HonestClose, MechanismList, SiteFooter } from "@/components/sections";
import { Card, Code, Detail, RevertProof, SectionHeader, Terminal, TIER_STYLE } from "@/components/ui";
import { Reveal } from "@/components/reveal";

// Blocking dynamic render, no static shell -- the whole point is every request reads live.
export const instant = false;

const etherscan = (address: string) => `https://sepolia.etherscan.io/address/${address}`;

export default async function Home() {
  await connection(); // forces per-request dynamic rendering -- without this, cacheComponents would prerender this page statically at build time and freeze whatever it saw then, which is exactly the hard-coded-values failure mode the ENS track rules out

  const [reports, killSwitch, packageEns] = await Promise.all([
    recentReports().catch(() => null),
    killSwitchInfo().catch(() => null),
    packageEnsInfo().catch(() => null),
  ]);

  const previewReports = reports?.slice(0, 2) ?? [];
  const restReports = reports?.slice(2) ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 pb-20 sm:px-10">
      <Hero />
      <Hook />

      {/* Script beat 2, 0:25-1:10 -- "The real proof: detection and the tamper-proof alarm."
          Embedded in the narrative, not linked out (playbook #1, #7). The terminal transcript is
          a real, previously-run command against a real malicious wheel -- see docs/evidence.md
          for the exact entity key and tx hash reproduced below. */}
      <Reveal>
        <section id="proof" className="flex flex-col gap-6 border-t border-border pt-10">
          <SectionHeader
            kicker="00:25 — Live proof"
            headline="Watch it prove itself."
            lede="A real malicious wheel, rebuilt and diffed against its public source, in a sandbox. The result gets signed and published to Arkiv — not our database."
          />
          <div className="sm:pl-[25%]">
            <Terminal
              lines={[
                { prompt: true, text: "shankh verify evilpkg==1.0.0 --find-links ./replay-index" },
                { text: "evilpkg==1.0.0: CRITICAL", tone: "accent" },
                { text: "  [critical] sitecustomize.py" },
                {
                  text: "  reported to Arkiv: 0xc669ad67c06311e9f479a096a08d3fb997581bcabdfe81a413c7b3d1b0534010 (tx 0x39b329ad4cefd8096292be1bf22c34d8529d9724ad92a193b065ec8c8d41e381)",
                  tone: "muted",
                },
              ]}
            />
          </div>

          <div className="sm:pl-[25%]">
            <Card className="flex flex-col gap-3 text-sm">
              <p className="label text-xs text-accent">✓ read live, Arkiv testnet</p>
              <p className="font-medium">Recent shankh.report entities</p>
              {reports === null ? (
                <p className="text-text-tertiary">
                  Could not reach Arkiv — check <Code>ARKIV_RPC_URL</Code>/<Code>ARKIV_ACCESS_KEY</Code>.
                </p>
              ) : reports.length === 0 ? (
                <p className="text-text-tertiary">
                  No reports yet. Run <Code>shankh verify</Code> to write one.
                </p>
              ) : (
                <>
                  <ul className="flex flex-col gap-2">
                    {previewReports.map((report) => (
                      <li key={report.key} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                        <span className="font-mono text-xs">
                          {report.package}=={report.version}
                        </span>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${TIER_STYLE[report.tier] ?? ""}`}>
                          {report.tier}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {restReports.length > 0 && (
                    <p className="text-xs text-text-tertiary">+{restReports.length} more in the full ledger below.</p>
                  )}
                </>
              )}
            </Card>
          </div>
        </section>
      </Reveal>

      {/* Script beat 3, 1:10-2:10 -- "What an attacker can't touch." The ENS proof: live state
          plus the actual revert errors from the real deployment run (docs/build-log.md), not a
          paraphrase of them -- this is the demo's central claim, made falsifiable. */}
      <Reveal>
        <section className="flex flex-col gap-6 border-t border-border pt-10">
          <SectionHeader
            kicker="01:10 — What an attacker can't touch"
            headline="We gave up the power to undo this. Here's what happens when we try."
            lede="pypi.shankh.eth is emancipated — every dangerous root role permanently revoked, including our own. Each package's resolver splits write access two ways, with zero overlap."
          />

          <div className="grid grid-cols-12 gap-4 sm:pl-[25%]">
            <Reveal className="col-span-12 sm:col-span-6">
              <Card className="flex h-full flex-col gap-2 text-sm">
                <p className="label text-xs text-accent">✓ read live, Sepolia</p>
                <p className="font-medium">ENS tree — shankh-demo.pypi.shankh.eth</p>
                {packageEns ? (
                  <>
                    <div>
                      resolver:{" "}
                      <a href={etherscan(packageEns.resolver)} className="underline decoration-border underline-offset-2 hover:text-accent">
                        <Code>{packageEns.resolver}</Code>
                      </a>
                    </div>
                    <div className="truncate" title={packageEns.source ?? undefined}>
                      shankh.source: <Code>{packageEns.source ?? "(not set)"}</Code>
                    </div>
                    <div>
                      shankh.revoked:{" "}
                      {packageEns.revokedArtifacts.length === 0 ? (
                        <span className="text-text-tertiary">none</span>
                      ) : (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
                          {packageEns.revokedArtifacts.length} artifact(s) revoked
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-text-tertiary">
                    Not configured — set <Code>PACKAGE_RESOLVER_ADDRESS</Code>.
                  </p>
                )}
              </Card>
            </Reveal>

            <Reveal delayMs={80} className="col-span-12 sm:col-span-6">
              <Card className="flex h-full flex-col gap-2 text-sm">
                <p className="label text-xs text-accent">✓ read live, Sepolia</p>
                <p className="font-medium">KillSwitch — the only writer of shankh.revoked</p>
                {killSwitch ? (
                  <>
                    <div>
                      contract:{" "}
                      <a href={etherscan(killSwitch.address)} className="underline decoration-border underline-offset-2 hover:text-accent">
                        <Code>{killSwitch.address}</Code>
                      </a>
                    </div>
                    <div>
                      maintainer: <Code>{killSwitch.maintainer}</Code>
                    </div>
                  </>
                ) : (
                  <p className="text-text-tertiary">
                    Not configured — set <Code>KILLSWITCH_ADDRESS</Code>.
                  </p>
                )}
              </Card>
            </Reveal>

            <Reveal delayMs={160} className="col-span-12">
              <RevertProof
                attempt="We tried to re-grant the revoked roles to ourselves, after emancipation"
                error="EACCannotGrantRoles(0, 7237005577332262213973186563140405376786684291341514916453779499572452659456, 0xDcbe075a907960951Cd4df379BB21461097eEa91)"
              />
            </Reveal>
            <Reveal delayMs={240} className="col-span-12">
              <RevertProof
                attempt="We tried to write shankh.revoked directly, after the resolver's broad grant was revoked"
                error="EACUnauthorizedAccountRoles(2844021095337237841129806607665185525430769143835556004274213054207323074410, 16, 0xDcbe075a907960951Cd4df379BB21461097eEa91)"
              />
            </Reveal>
          </div>
        </section>
      </Reveal>

      <WhyNow />
      <HonestClose />

      {/* Progressive disclosure (landing-page-playbook.md #6): the pitch above now follows the
          demo script's own beats and reads in under three minutes; everything needed for rigor
          but not for the pitch -- the step-by-step mechanism, per-track deep dives, the raw
          activity log -- is one click away, not mandatory reading. */}
      <Reveal>
        <section className="flex flex-col gap-6 border-t border-border pt-10">
          <SectionHeader kicker="More detail" headline="Everything else." />
          <div className="sm:pl-[25%]">
            <Detail summary="How it works, step by step">
              <MechanismList />
            </Detail>

            <Detail summary="Partner track alignment — ENS, Ethereum Foundation, Arkiv">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="mb-1 font-medium text-foreground">ENS — Best Use of ENSv2</p>
                  <p>
                    ENS as a permission system, not a lookup table: an emancipated package registry
                    Shankh itself can&rsquo;t seize, and a per-package resolver where the maintainer
                    and the KillSwitch each hold their own scoped, non-overlapping write grant.
                  </p>
                </div>
                <div>
                  <p className="mb-1 font-medium text-foreground">Ethereum Foundation — Best CROPS App</p>
                  <p>
                    Credibly neutral by construction: every client reads ENS state directly. Turn
                    this status page and the backend off, and <code className="font-mono">shankh verify</code> still
                    verifies and kills locally — the CROPS moment.
                  </p>
                </div>
                <div>
                  <p className="mb-1 font-medium text-foreground">Arkiv — Build on Arkiv</p>
                  <p>
                    <code className="font-mono">shankh.report</code> is how one victim&rsquo;s catch becomes
                    everyone else&rsquo;s protection: signed evidence, explicit per-reporter trust, local
                    re-verification before any kill — never a blind, shared database.
                  </p>
                </div>
              </div>
            </Detail>

            <Detail summary="Full on-chain ledger">
              <div className="flex flex-col gap-4">
                {killSwitch && (
                  <div>
                    <p className="mb-1 font-medium text-foreground">KillSwitch</p>
                    <a href={etherscan(killSwitch.address)} className="underline decoration-border underline-offset-2 hover:text-accent">
                      <Code>{killSwitch.address}</Code>
                    </a>
                  </div>
                )}
                {packageEns && (
                  <div>
                    <p className="mb-1 font-medium text-foreground">Resolver — shankh-demo.pypi.shankh.eth</p>
                    <a href={etherscan(packageEns.resolver)} className="underline decoration-border underline-offset-2 hover:text-accent">
                      <Code>{packageEns.resolver}</Code>
                    </a>
                    {packageEns.revokedArtifacts.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-0.5 font-mono text-xs">
                        {packageEns.revokedArtifacts.map((hash) => (
                          <li key={hash} className="truncate">
                            revoked: {hash}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {reports && reports.length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-foreground">All shankh.report entities ({reports.length})</p>
                    <ul className="flex flex-col gap-2">
                      {reports.map((report) => (
                        <li key={report.key} className="rounded-lg border border-border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs">
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
                            <ul className="mt-2 flex flex-col gap-0.5 font-mono text-xs">
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
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!killSwitch && !packageEns && (!reports || reports.length === 0) && (
                  <p>Nothing configured yet — see the environment variables noted above.</p>
                )}
              </div>
            </Detail>
          </div>
        </section>
      </Reveal>

      <SiteFooter />
    </main>
  );
}
