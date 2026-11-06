/**
 * The full raw ledger: every live address and every report, as a real data table. Scrolls
 * horizontally inside its own container on narrow screens -- never the page. Sepolia addresses
 * link to Etherscan; Arkiv entities aren't linked because we have no verified public Arkiv
 * explorer URL to point at (better no link than an invented one).
 */
import type { KillSwitchInfo } from "@/lib/killswitch";
import type { PackageEnsInfo } from "@/lib/ens";
import type { RegistryInfo } from "@/lib/registry";
import type { Report } from "@/lib/arkiv";
import { Code } from "./code.client";
import { TierPill } from "./ui";

const etherscan = (address: string) => `https://sepolia.etherscan.io/address/${address}`;

type Row = { what: string; network: string; value: string; href?: string; extra?: React.ReactNode };

export function LedgerTable({
  shankhRegistry,
  pypiRegistry,
  packageEns,
  killSwitch,
  reports,
}: {
  shankhRegistry: string | null;
  pypiRegistry: RegistryInfo | null;
  packageEns: PackageEnsInfo | null;
  killSwitch: KillSwitchInfo | null;
  reports: Report[] | null;
}) {
  const rows: Row[] = [];
  if (shankhRegistry) rows.push({ what: "shankh.eth registry", network: "Sepolia", value: shankhRegistry, href: etherscan(shankhRegistry) });
  if (pypiRegistry)
    rows.push({
      what: "pypi.shankh.eth registry",
      network: "Sepolia",
      value: pypiRegistry.address,
      href: etherscan(pypiRegistry.address),
      extra: <span className="text-accent">emancipated: {String(pypiRegistry.emancipated)}</span>,
    });
  if (packageEns) {
    rows.push({ what: "shankh-demo resolver", network: "Sepolia", value: packageEns.resolver, href: etherscan(packageEns.resolver) });
    packageEns.revokedArtifacts.forEach((h, i) =>
      rows.push({ what: `revoked artifact ${i + 1}`, network: "Sepolia (ENS)", value: h }),
    );
  }
  if (killSwitch) {
    rows.push({ what: "KillSwitch", network: "Sepolia", value: killSwitch.address, href: etherscan(killSwitch.address) });
    rows.push({ what: "KillSwitch maintainer", network: "Sepolia", value: killSwitch.maintainer, href: etherscan(killSwitch.maintainer) });
  }
  (reports ?? []).forEach((r) =>
    rows.push({
      what: `report · ${r.package}@${r.version}`,
      network: "Arkiv testnet",
      value: r.key,
      extra: <TierPill tier={r.tier} />,
    }),
  );

  if (rows.length === 0) return <p className="text-sm">Nothing could be read just now — reload to retry.</p>;

  return (
    <div className="max-h-[28rem] overflow-auto rounded-lg border border-border">
      <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-border">
            <th className="label px-3 py-2 text-[9px] font-medium text-text-tertiary">What</th>
            <th className="label px-3 py-2 text-[9px] font-medium text-text-tertiary">Network</th>
            <th className="label px-3 py-2 text-[9px] font-medium text-text-tertiary">Value</th>
            <th className="label px-3 py-2 text-[9px] font-medium text-text-tertiary" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.what}-${i}`} className="border-b border-border last:border-b-0 even:bg-black/[.015] dark:even:bg-white/[.02]">
              <td className="px-3 py-2 text-text-secondary">{row.what}</td>
              <td className="px-3 py-2 font-mono text-[10px] text-text-tertiary">{row.network}</td>
              <td className="px-3 py-2">
                <Code>{row.value}</Code>
                {row.href && (
                  <a href={row.href} className="ml-1 text-text-tertiary hover:text-accent" aria-label="Open on Etherscan">
                    ↗
                  </a>
                )}
              </td>
              <td className="px-3 py-2">{row.extra}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
