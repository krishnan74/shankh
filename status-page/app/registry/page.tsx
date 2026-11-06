import type { Metadata } from "next";
import { connection } from "next/server";
import { recentReports } from "@/lib/arkiv";
import { latestBlockInfo } from "@/lib/chain";
import { packageEnsInfo } from "@/lib/ens";
import { killSwitchInfo } from "@/lib/killswitch";
import { attackProofs } from "@/lib/proofs";
import { pypiRegistryInfo, registryPackages, shankhRegistryAddress } from "@/lib/registry";
import { trustedReporters } from "@/lib/reporters";
import { withTimeout } from "@/lib/timeout";
import { EnsTree } from "@/components/ens-tree";
import { LedgerTable } from "@/components/ledger-table";
import { RegistryDashboard } from "@/components/registry-dashboard";
import { TrustedReporters } from "@/components/report-feed";
import { SiteFooter } from "@/components/sections";
import { TopBar } from "@/components/topbar";
import { Band, Detail, SectionHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Registry — Shankh",
  description: "Every package under pypi.shankh.eth, its maintainer's bad-builds list, and the Arkiv alarms about it — read live.",
};

// Same rule as the landing page: every request reads live, nothing is frozen at build time.
export const instant = false;

const READ_TIMEOUT_MS = 4000;

export default async function RegistryPage() {
  await connection();

  // Each read capped (lib/timeout.ts): a slow network degrades its own part of the page, never the whole.
  const [reports, registry, reporters, block, pypiRegistry, packageEns, killSwitch] = await Promise.all([
    withTimeout(recentReports(50), READ_TIMEOUT_MS).catch(() => null),
    withTimeout(registryPackages(), READ_TIMEOUT_MS).catch(() => null),
    withTimeout(trustedReporters(), READ_TIMEOUT_MS).catch(() => null),
    withTimeout(latestBlockInfo(), READ_TIMEOUT_MS).catch(() => null),
    withTimeout(pypiRegistryInfo(), READ_TIMEOUT_MS).catch(() => null),
    withTimeout(packageEnsInfo(), READ_TIMEOUT_MS).catch(() => null),
    withTimeout(killSwitchInfo(), READ_TIMEOUT_MS).catch(() => null),
  ]);
  const proofs = killSwitch ? await withTimeout(attackProofs(killSwitch.maintainer), READ_TIMEOUT_MS).catch(() => null) : null;
  const shankhRegistry = shankhRegistryAddress();

  return (
    <>
      <TopBar blockNumber={block?.blockNumber ?? null} current="registry" />
      <main className="flex min-h-screen w-full flex-col overflow-x-clip">
        <section className="bg-background">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 pt-16 pb-24 sm:px-10 sm:pt-20">
            <SectionHeader
              kicker="Registry · live"
              headline="Every package Shankh protects."
              lede="Every name under pypi.shankh.eth, what its maintainer has flagged, and what machines have reported about it on Arkiv — read live from Sepolia and Arkiv on every load. It's the same data shankh scan and shankhd check machines against."
            />
            <RegistryDashboard packages={registry} reports={reports} reporters={reporters} />
          </div>
        </section>

        <Band alt>
          <SectionHeader
            kicker="Trusted reporters"
            headline="Whose alarms a machine acts on."
            lede="You choose reporters by ENS name. Each name publishes the wallet that reporter signs with, and only they can change it. An alarm counts only if Arkiv recorded that wallet as its signer — and even then, your machine re-checks it first."
          />
          <div className="max-w-2xl">
            <TrustedReporters reports={reports} reporters={reporters} />
          </div>
        </Band>

        <Band>
          <SectionHeader kicker="For the technically curious" headline="The full ENS setup and on-chain ledger." />
          <div className="flex w-full flex-col">
            <Detail summary="01 · The full ENS setup, with addresses">
              <EnsTree
                shankhRegistry={shankhRegistry}
                pypiRegistry={pypiRegistry}
                packageEns={packageEns}
                killSwitch={killSwitch}
                proofs={proofs}
              />
            </Detail>
            <Detail summary="02 · Full on-chain ledger">
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

        <div className="border-t border-border bg-surface">
          <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
            <SiteFooter />
          </div>
        </div>
      </main>
    </>
  );
}
