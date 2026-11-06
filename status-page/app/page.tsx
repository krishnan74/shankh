import { connection } from "next/server";
import { recentReports } from "@/lib/arkiv";
import { latestBlockInfo } from "@/lib/chain";
import { packageEnsInfo } from "@/lib/ens";
import { killSwitchInfo } from "@/lib/killswitch";
import { attackProofs } from "@/lib/proofs";
import { pypiRegistryInfo, shankhRegistryAddress } from "@/lib/registry";
import { EnsTree } from "@/components/ens-tree";
import { LedgerTable } from "@/components/ledger-table";
import { PresenterRail } from "@/components/presenter-rail.client";
import { RaceTimeline } from "@/components/race-timeline";
import { ReportFeed } from "@/components/report-feed";
import { Reveal } from "@/components/reveal";
import { Hero, HonestClose, SiteFooter, Stepper, TrackColumns, WhyNowCases } from "@/components/sections";
import { Terminal } from "@/components/terminal.client";
import { TopBar } from "@/components/topbar";
import { Detail, SectionHeader } from "@/components/ui";

// Blocking dynamic render, no static shell -- the whole point is every request reads live.
export const instant = false;

/** Section divider: a hairline with a tiny conch mark at its start -- the ripple motif, quiet. */
function Divider() {
  return (
    <div className="flex items-center gap-3 pt-14" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="3" fill="var(--accent)" />
        <circle cx="20" cy="20" r="9" stroke="var(--accent)" strokeOpacity="0.4" />
        <circle cx="20" cy="20" r="16" stroke="var(--accent)" strokeOpacity="0.2" />
      </svg>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

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
      {/* overflow-x: clip (not hidden) contains the hero ripple's bleed without creating a scroll
          container, so the sticky top bar keeps working */}
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col overflow-x-clip px-6 pb-20 sm:px-10">
        <TopBar blockNumber={block?.blockNumber ?? null} />

        <Hero
          latestReport={reports?.[0] ?? null}
          reportCount={reports?.length ?? null}
          revokedCount={packageEns ? packageEns.revokedArtifacts.length : null}
          killSwitchAddress={killSwitch?.address ?? null}
        />

        {/* 00:00 -- the hook: same attack, two clocks */}
        <Divider />
        <section className="flex flex-col gap-8 pt-8">
          <div className="mx-auto w-full max-w-3xl">
            <SectionHeader
              id="beat-hook"
              kicker="00:00 — The hook"
              headline="Same attack. Two clocks."
              lede="The real LiteLLM 1.107.0 timeline, against the path Shankh is designed to take. A public leak gets killed by AWS in ~10 seconds; a malware theft got hours."
            />
          </div>
          <Reveal>
            <RaceTimeline />
          </Reveal>
        </section>

        {/* 00:25 -- live proof */}
        <Divider />
        <section className="flex flex-col gap-8 pt-8">
          <div className="mx-auto w-full max-w-3xl">
            <SectionHeader
              id="beat-proof"
              kicker="00:25 — Live proof"
              headline="This isn't a mockup."
              lede="A real malicious wheel, rebuilt and diffed against its public source. The result is signed to Arkiv — not our database — and read back below, live."
            />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Terminal
              title="shankh verify evilpkg==1.0.0 — recorded run"
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
        </section>

        {/* 01:10 -- what an attacker can't touch */}
        <Divider />
        <section className="flex flex-col gap-8 pt-8">
          <div className="mx-auto w-full max-w-3xl">
            <SectionHeader
              id="beat-untouchable"
              kicker="01:10 — What an attacker can't touch"
              headline="The alarm lives where the hacker can't reach."
              lede="We gave up the power to seize this tree — and each attack below is re-tried against live Sepolia every time this page loads."
            />
          </div>
          <Reveal>
            <EnsTree
              shankhRegistry={shankhRegistry}
              pypiRegistry={pypiRegistry}
              packageEns={packageEns}
              killSwitch={killSwitch}
              proofs={proofs}
            />
          </Reveal>
        </section>

        {/* 02:10 -- why now */}
        <Divider />
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 pt-8">
          <SectionHeader id="beat-why-now" kicker="02:10 — Why this matters now" headline="It already happened. Twice." />
          <Reveal>
            <WhyNowCases />
          </Reveal>
        </section>

        {/* 02:45 -- the honest close */}
        <Divider />
        <section className="flex flex-col gap-8 pt-8">
          <div className="mx-auto w-full max-w-3xl">
            <SectionHeader id="beat-close" kicker="02:45 — The honest close" headline="What you just saw is real." />
          </div>
          <HonestClose />
        </section>

        {/* Progressive disclosure */}
        <Divider />
        <section id="ledger" className="mx-auto flex w-full max-w-3xl scroll-mt-24 flex-col gap-6 pt-8">
          <SectionHeader kicker="More detail" headline="Everything else." />
          <div className="sm:pl-[25%]">
            <Detail summary="01 · How it works, step by step">
              <Stepper />
            </Detail>
            <Detail summary="02 · Partner track alignment">
              <TrackColumns pypiRegistry={pypiRegistry?.address ?? null} killSwitch={killSwitch?.address ?? null} />
            </Detail>
            <Detail summary="03 · Full on-chain ledger">
              <LedgerTable
                shankhRegistry={shankhRegistry}
                pypiRegistry={pypiRegistry}
                packageEns={packageEns}
                killSwitch={killSwitch}
                reports={reports}
              />
            </Detail>
          </div>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
