/**
 * Every package under pypi.shankh.eth with its live bad-builds list -- the same list `shankh scan`
 * checks a machine against. Rows come from lib/registry.ts (registry events + getResolver + each
 * resolver's shankh.revoked), read on every request.
 *
 * Two flagged values are known demo artifacts, labeled here so nobody mistakes them for real
 * incidents: the placeholder from the first ENS setup, and the build used to rehearse the full
 * flag-then-scan flow. Any other flagged value shows unlabeled -- exactly as read from the chain.
 */
import type { RegistryPackage } from "@/lib/registry";
import Link from "next/link";
import { Code } from "./code.client";

export const KNOWN_DEMO_FLAGS: Record<string, string> = {
  "0x4012d64c2402ba4da166ee6319be8753789477e43bda05ab4966f8e127d6f517": "placeholder from the first setup — not a real build",
  "0x23d038ae785520270605fdbb051aae53079b52104a1e5e0e33596b505f79f36e": "rehearsal test build, flagged to test the full flow",
};

export function RegistryTable({ packages }: { packages: RegistryPackage[] | null }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-medium">Every package in the registry, checked live</p>
        <p className="max-w-2xl text-sm text-text-secondary">
          This is the same list <span className="font-mono text-foreground">shankh scan</span> checks your machine against. It&rsquo;s fetched whole and compared on your machine, so nobody watching learns what you have installed.
        </p>
      </div>
      {packages === null ? (
        <p className="text-sm text-text-secondary">Couldn&rsquo;t read the registry just now — reload to retry.</p>
      ) : packages.length === 0 ? (
        <p className="text-sm text-text-secondary">No packages registered yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
          {packages.map((pkg) => (
            <li key={pkg.name} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-sm">{pkg.name}</span>
                <span className="text-xs text-text-secondary">
                  resolver <Code copy={false}>{pkg.resolver}</Code>
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                {pkg.flagged.length === 0 ? (
                  <span className="label w-fit rounded-full border border-border px-2 py-0.5 text-[9px] text-text-secondary">No flagged builds</span>
                ) : (
                  <span className="label w-fit rounded-full border border-red-400 px-2 py-0.5 text-[9px] text-red-700 dark:text-red-400">
                    {pkg.flagged.length} flagged build{pkg.flagged.length === 1 ? "" : "s"}
                  </span>
                )}
                {pkg.flagged.map((fp) => (
                  <span key={fp} className="flex flex-col gap-0.5 text-xs sm:items-end">
                    <Code>{fp}</Code>
                    {KNOWN_DEMO_FLAGS[fp] && <span className="text-text-secondary">{KNOWN_DEMO_FLAGS[fp]}</span>}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The landing page's stand-in for the full table: one live line and a link. The table itself is
 * reference material a judge looks up, not part of the spoken story, so it lives on /registry.
 */
export function RegistryTeaser({
  packageCount,
  flaggedCount,
  alarmCount,
}: {
  packageCount: number | null;
  flaggedCount: number | null;
  alarmCount: number | null;
}) {
  const part = (n: number | null, one: string, many: string) => (n === null ? null : `${n} ${n === 1 ? one : many}`);
  const facts = [part(packageCount, "package", "packages"), part(flaggedCount, "flagged build", "flagged builds"), part(alarmCount, "alarm on Arkiv", "alarms on Arkiv")].filter(Boolean);
  return (
    <Link
      href="/registry"
      className="group flex flex-col gap-2 rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/50 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1">
        <p className="font-medium">Every package in the registry, checked live</p>
        <p className="text-sm text-text-secondary">{facts.length ? facts.join(" · ") : "Couldn\u2019t read the registry just now"}</p>
      </div>
      <span className="text-sm text-accent">Open the registry →</span>
    </Link>
  );
}
