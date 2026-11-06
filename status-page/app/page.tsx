import { connection } from "next/server";
import { recentReports } from "@/lib/arkiv";
import { latestBlockInfo } from "@/lib/chain";
import { packageEnsInfo } from "@/lib/ens";
import { killSwitchInfo } from "@/lib/killswitch";
import { attackProofs } from "@/lib/proofs";
import { pypiRegistryInfo, shankhRegistryAddress } from "@/lib/registry";
import { EnsStory } from "@/components/ens-story";
import { EnsTree } from "@/components/ens-tree";
import { LedgerTable } from "@/components/ledger-table";
import { PresenterRail } from "@/components/presenter-rail.client";
import { ReportFeed } from "@/components/report-feed";
import { Reveal } from "@/components/reveal";
import { Hero, Incident, SiteFooter, SolutionSteps, StatusClose, Stepper, TrackColumns } from "@/components/sections";
import { Terminal } from "@/components/terminal.client";
import { TopBar } from "@/components/topbar";
import { Band, Detail, SectionHeader } from "@/components/ui";

// Blocking dynamic render, no static shell -- the whole point is every request reads live.
export const instant = false;

export default async function Home() {
  await connection(); // forces per-request dynamic rendering -- without this, cacheComponents would prerender this page statically at build time and freeze whatever it saw then, which is exactly the hard-coded-values failure mode the ENS track rules out

  const [reports, killSwitch, packageEns, block, pypiRegistry] = await Promise.all([
    recentReports().catch(() => null),
    killSwitchInfo().catch(() => null),
    packageEnsInfo().catch(() => null),
    latestBlockInfo().catch(() => null),
    pypiRegistryInfo().catch(() => null),
  ]);
  // The attack simulations run as the address that deployed the tree -- read live from KillSwitch.
  const proofs = killSwitch ? await attackProofs(killSwitch.maintainer).catch(() => null) : null;
  const shankhRegistry = shankhRegistryAddress();

  return (
    <>
      <PresenterRail />
      <TopBar blockNumber={block?.blockNumber ?? null} />
      {/* Full-width bands, alternating background/surface with a hairline between them, so each
          part of the story reads as its own page. overflow-x: clip (not hidden) contains the hero
          ripple's bleed without breaking the sticky top bar. */}
      <main className="flex min-h-screen w-full flex-col overflow-x-clip">
        <section className="bg-background">
          <div className="mx-auto w-full max-w-6xl px-6 pt-16 pb-24 sm:px-10 sm:pt-24 sm:pb-32">
            <Hero
              latestReport={reports?.[0] ?? null}
              reportCount={reports?.length ?? null}
              revokedCount={packageEns ? packageEns.revokedArtifacts.length : null}
              emancipated={pypiRegistry ? pypiRegistry.emancipated : null}
            />
          </div>
        </section>

        {/* 01 -- what happened */}
        <Band alt>
          <Incident />
        </Band>

        {/* 02 -- what Shankh does, then the real run that proves steps 1 and 2 */}
        <Band>
          <SectionHeader
            id="beat-solution"
            kicker="02 · What Shankh does"
            headline="Check it. Raise the alarm. Shut the keys off."
            lede="Three steps. The first two run today — below, Shankh catches a real malicious test package and posts the alarm."
          />
          <SolutionSteps />
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
              <Terminal
                title="shankh verify evilpkg==1.0.0 — a recorded run"
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
              <ReportFeed reports={reports} />
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-text-secondary">
              <span className="font-mono text-foreground">sitecustomize.py</span> runs automatically every time Python starts — and it isn&rsquo;t in the package&rsquo;s public source. That&rsquo;s the same trick the real LiteLLM attack used.
            </p>
          </div>
        </Band>

        {/* 03 -- why the alarm can't be silenced: ENS */}
        <Band alt>
          <SectionHeader
            id="beat-ens"
            kicker="03 · Why the alarm can't be silenced"
            headline="The alarm lives on ENS, where the attacker — and even we — can't touch it."
            lede="Someone who steals a maintainer's PyPI or GitHub login can publish bad code. They still can't change what's on ENS, because that's controlled by a separate wallet."
          />
          <EnsStory pypiRegistry={pypiRegistry} packageEns={packageEns} proofs={proofs} />
        </Band>

        {/* 04 -- where it stands */}
        <Band>
          <SectionHeader id="beat-status" kicker="04 · Where it stands" headline="What you just saw is real." />
          <StatusClose />
        </Band>

        {/* Progressive disclosure: everything a technical reviewer wants, none of it in the way. */}
        <Band alt>
          <div id="ledger" className="scroll-mt-24">
            <SectionHeader kicker="More detail" headline="For the technically curious." />
          </div>
          <div className="mx-auto w-full max-w-3xl sm:pl-[25%]">
            <Detail summary="01 · How it works, step by step">
              <Stepper />
            </Detail>
            <Detail summary="02 · The full ENS setup, with addresses">
              <Reveal>
                <EnsTree
                  shankhRegistry={shankhRegistry}
                  pypiRegistry={pypiRegistry}
                  packageEns={packageEns}
                  killSwitch={killSwitch}
                  proofs={proofs}
                />
              </Reveal>
            </Detail>
            <Detail summary="03 · Partner track alignment">
              <TrackColumns pypiRegistry={pypiRegistry?.address ?? null} killSwitch={killSwitch?.address ?? null} />
            </Detail>
            <Detail summary="04 · Full on-chain ledger">
              <LedgerTable
                shankhRegistry={shankhRegistry}
                pypiRegistry={pypiRegistry}
                packageEns={packageEns}
                killSwitch={killSwitch}
                reports={reports}
              />
            </Detail>
          </div>
        </Band>

        <div className="border-t border-border bg-background">
          <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
            <SiteFooter />
          </div>
        </div>
      </main>
    </>
  );
}
