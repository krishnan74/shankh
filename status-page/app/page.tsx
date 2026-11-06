import Link from "next/link";
import { connection } from "next/server";
import { recentReports } from "@/lib/arkiv";
import { latestBlockInfo } from "@/lib/chain";
import { packageEnsInfo } from "@/lib/ens";
import { killSwitchInfo } from "@/lib/killswitch";
import { attackProofs } from "@/lib/proofs";
import { pypiRegistryInfo, registryPackages } from "@/lib/registry";
import { trustedReporters } from "@/lib/reporters";
import { withTimeout } from "@/lib/timeout";
import { EnsStory } from "@/components/ens-story";
import { RegistryTeaser } from "@/components/registry-table";
import { PresenterRail } from "@/components/presenter-rail.client";
import { ReportFeed } from "@/components/report-feed";
import { Partners } from "@/components/partners";
import { Hero, Incident, SiteFooter, SolutionSteps, StatusClose, Stepper } from "@/components/sections";
import { Terminal } from "@/components/terminal.client";
import { TopBar } from "@/components/topbar";
import { Band, Detail, SectionHeader } from "@/components/ui";

// Blocking dynamic render, no static shell -- the whole point is every request reads live.
export const instant = false;

const READ_TIMEOUT_MS = 4000;

export default async function Home() {
  await connection(); // forces per-request dynamic rendering -- without this, cacheComponents would prerender this page statically at build time and freeze whatever it saw then, which is exactly the hard-coded-values failure mode the ENS track rules out

  // Every live read is capped (lib/timeout.ts): one stalled endpoint must degrade its own section,
  // never hold the whole page hostage.
  const [reports, killSwitch, packageEns, block, pypiRegistry, registry, reporters] = await Promise.all([
    withTimeout(recentReports(), READ_TIMEOUT_MS).catch(() => null),
    withTimeout(killSwitchInfo(), READ_TIMEOUT_MS).catch(() => null),
    withTimeout(packageEnsInfo(), READ_TIMEOUT_MS).catch(() => null),
    withTimeout(latestBlockInfo(), READ_TIMEOUT_MS).catch(() => null),
    withTimeout(pypiRegistryInfo(), READ_TIMEOUT_MS).catch(() => null),
    withTimeout(registryPackages(), READ_TIMEOUT_MS).catch(() => null),
    withTimeout(trustedReporters(), READ_TIMEOUT_MS).catch(() => null),
  ]);
  // The attack simulations run as the address that deployed the tree -- read live from KillSwitch.
  const proofs = killSwitch ? await withTimeout(attackProofs(killSwitch.maintainer), READ_TIMEOUT_MS).catch(() => null) : null;

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
              reports={reports}
              reportCount={reports?.length ?? null}
              revokedCount={registry ? registry.reduce((n, p) => n + p.flagged.length, 0) : null}
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
            lede="Three steps, all running today. Below, Shankh is watching a machine when a poisoned test package gets installed: it catches it on its own seconds later, and the stolen AWS key is switched off 13 seconds after the install."
          />
          <SolutionSteps />
          <div className="flex flex-col gap-6">
            <p className="label text-[10px] text-text-secondary">All three steps, for real</p>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
              <Terminal
                title="shankhd — a recorded run, 7 Nov 2026 (real log; AWS account number hidden)"
                lines={[
                  { prompt: true, text: "shankhd --site-packages ./victim --trust shankh-team.reporters.shankh.eth" },
                  { text: "03:02:14  shankhd watching ./victim: 1 package installed; trusting shankh-team.reporters.shankh.eth", tone: "muted" },
                  { text: "03:02:17  sweep: 3 packages on ENS, 10 recent alarms from trusted reporters", tone: "muted" },
                  { text: "   attacker> aws sts get-caller-identity  ->  ACCEPTED  (the stolen key works)", tone: "muted" },
                  { text: "          … someone runs pip install shankh-demo — no other command typed …", tone: "muted" },
                  { text: "03:02:21  new install: shankh-demo==1.0.0 -- rebuilding it from its public source" },
                  { text: "03:02:24  COMPROMISED  shankh-demo==1.0.0  (rebuild) [critical] sitecustomize.py", tone: "accent" },
                  { text: "03:02:31    posted to Arkiv: 0x7b802aa24ddbd5dd76f4290773bcede07f36e22a8ad2b57dffd4f9dc1189b2a6", tone: "muted" },
                  { text: "03:02:34    kill: key AKIA…OQV6 switched off (Inactive); quarantined user shankh-demo-victim (AWSCompromisedKeyQuarantineV3)", tone: "accent" },
                  { text: "   attacker> aws sts get-caller-identity  ->  REJECTED  InvalidClientTokenId" },
                ]}
              />
              <ReportFeed reports={reports} reporters={reporters} />
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-text-secondary">
              <span className="font-mono text-foreground">sitecustomize.py</span> runs automatically every time Python starts — and it isn&rsquo;t in the package&rsquo;s public source. That&rsquo;s the same trick the real LiteLLM attack used.
            </p>
          </div>
        </Band>

        {/* 03 -- the three partner prizes, side by side and equally weighted */}
        <Band alt>
          <SectionHeader
            id="beat-partners"
            kicker="03 · Built on three partners"
            headline="Three partners, three jobs."
            lede="ENS holds the switch. Arkiv carries the evidence. And open Ethereum networks mean there's no one in the middle."
          />
          <Partners
            pypiRegistry={pypiRegistry}
            reportCount={reports?.length ?? null}
            blockNumber={block?.blockNumber ?? null}
            packageCount={registry?.length ?? null}
            flaggedCount={registry ? registry.reduce((n, p) => n + p.flagged.length, 0) : null}
          />
        </Band>

        {/* 04 -- why the alarm can't be silenced: ENS, up close */}
        <Band>
          <SectionHeader
            id="beat-ens"
            kicker="04 · Why the alarm can't be silenced"
            headline="The alarm lives on ENS, where the attacker — and even we — can't touch it."
            lede="Someone who steals a maintainer's PyPI or GitHub login can publish bad code. They still can't change what's on ENS, because that's controlled by a separate wallet."
          />
          <EnsStory pypiRegistry={pypiRegistry} packageEns={packageEns} proofs={proofs} />
          <RegistryTeaser
            packageCount={registry?.length ?? null}
            flaggedCount={registry ? registry.reduce((n, p) => n + p.flagged.length, 0) : null}
            alarmCount={reports?.length ?? null}
          />
        </Band>

        {/* 05 -- where it stands */}
        <Band alt>
          {/* The closing panel carries its own label and one headline -- a separate SectionHeader
              here stacked two big headlines on top of each other. */}
          <div id="beat-status" className="scroll-mt-24">
            <StatusClose />
          </div>
        </Band>

        {/* Progressive disclosure: everything a technical reviewer wants, none of it in the way. */}
        <Band>
          <div id="ledger" className="scroll-mt-24">
            <SectionHeader kicker="More detail" headline="For the technically curious." />
          </div>
          <div className="flex w-full flex-col">
            <Detail summary="01 · How it works, step by step">
              <Stepper />
            </Detail>
            <Link
              href="/registry"
              className="flex items-center justify-between gap-4 border-b border-border py-5 font-medium transition-colors hover:text-accent"
            >
              02 · Every package, the full ENS setup and the on-chain ledger
              <span className="shrink-0 text-text-tertiary">→ Registry</span>
            </Link>
          </div>
        </Band>

        <div className="border-t border-border bg-surface">
          <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
            <SiteFooter />
          </div>
        </div>
      </main>
    </>
  );
}
