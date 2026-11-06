/**
 * The /registry page's body: every package under pypi.shankh.eth as a profile -- its ENS name,
 * who it's registered to, where its maintainer says the code lives, its bad-builds list, and the
 * Arkiv alarms about it -- then the alarms about packages that aren't in the registry at all.
 * Every value is a live read passed in from app/registry/page.tsx; nothing here is a constant
 * except the two labelled demo fingerprints (see registry-table.tsx).
 */
import type { Report } from "@/lib/arkiv";
import type { RegistryPackage } from "@/lib/registry";
import type { Reporter } from "@/lib/reporters";
import { Code } from "./code.client";
import { KNOWN_DEMO_FLAGS } from "./registry-table";
import { signerName } from "./report-feed";
import { TierPill } from "./ui";

const etherscan = (address: string) => `https://sepolia.etherscan.io/address/${address}`;
/** PEP 503 normalisation -- the same rule the CLI uses to turn a PyPI name into an ENS label. */
const labelFor = (pkg: string) => pkg.toLowerCase().replace(/[-_.]+/g, "-");

function Stat({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-5">
      <span className="font-display text-4xl leading-none font-black">{value === null ? "—" : value}</span>
      <span className="text-sm text-text-secondary">{value === null ? `${label} (couldn’t read just now)` : label}</span>
    </div>
  );
}

function AlarmRow({ report, reporters }: { report: Report; reporters: Reporter[] | null }) {
  const name = signerName(report.creator, reporters);
  return (
    <li className="flex flex-col gap-1 border-b border-border py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs">
          {report.package}@{report.version}
        </span>
        <TierPill tier={report.tier} />
      </div>
      <span className="font-mono text-[10px] break-all text-text-tertiary" title={report.creator}>
        signed by {name ? <span className="text-foreground">{name}</span> : report.creator}
        {report.ensRevoked && <span className="ml-2 text-accent">· ENS-revoked</span>}
        {report.findings.length > 0 && <span className="ml-2">· {report.findings.map((f) => f.relativePath).join(", ")}</span>}
      </span>
      <span className="font-mono text-[10px] break-all text-text-tertiary">entity {report.key}</span>
    </li>
  );
}

function PackageCard({ pkg, alarms, reporters }: { pkg: RegistryPackage; alarms: Report[] | null; reporters: Reporter[] | null }) {
  return (
    <li className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-base break-all text-foreground">{pkg.name}</span>
          <span className="text-xs text-text-secondary">
            PyPI package <span className="font-mono text-foreground">{pkg.label}</span>
          </span>
        </div>
        {pkg.flagged.length === 0 ? (
          <span className="label w-fit shrink-0 rounded-full border border-border px-2 py-0.5 text-[9px] text-text-secondary">No flagged builds</span>
        ) : (
          <span className="label w-fit shrink-0 rounded-full border border-red-400 px-2 py-0.5 text-[9px] text-red-700 dark:text-red-400">
            {pkg.flagged.length} flagged build{pkg.flagged.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="text-text-secondary">Registered to</dt>
        <dd className="min-w-0">
          {pkg.registeredTo ? (
            <a href={etherscan(pkg.registeredTo)} className="font-mono text-xs break-all underline decoration-border underline-offset-2 hover:text-accent">
              {pkg.registeredTo}
            </a>
          ) : (
            <span className="text-text-tertiary">—</span>
          )}
        </dd>
        <dt className="text-text-secondary">Resolver</dt>
        <dd className="min-w-0">
          <Code>{pkg.resolver}</Code>
        </dd>
        <dt className="text-text-secondary">
          <span className="font-mono text-xs">shankh.source</span>
        </dt>
        <dd className="min-w-0 text-xs">
          {pkg.source ? <span className="font-mono break-all">{pkg.source}</span> : <span className="text-text-tertiary">not set</span>}
          <span className="block text-text-tertiary">where the maintainer says the code lives — only they can change it</span>
        </dd>
        <dt className="text-text-secondary">
          <span className="font-mono text-xs">shankh.revoked</span>
        </dt>
        <dd className="flex min-w-0 flex-col gap-2 text-xs">
          {pkg.flagged.length === 0 ? (
            <span className="text-text-tertiary">empty — no build of this package has been flagged</span>
          ) : (
            pkg.flagged.map((fp) => (
              <span key={fp} className="flex flex-col gap-0.5">
                <Code>{fp}</Code>
                {KNOWN_DEMO_FLAGS[fp] && <span className="text-text-secondary">{KNOWN_DEMO_FLAGS[fp]}</span>}
              </span>
            ))
          )}
          <span className="text-text-tertiary">bad builds — written only by this package&rsquo;s KillSwitch</span>
        </dd>
      </dl>

      <div className="flex flex-col gap-1 border-t border-border pt-4">
        <p className="label text-[10px] text-accent">Alarms about it on Arkiv</p>
        {alarms === null ? (
          <p className="text-xs text-text-tertiary">Couldn&rsquo;t reach Arkiv just now.</p>
        ) : alarms.length === 0 ? (
          <p className="text-xs text-text-tertiary">None in the latest reports.</p>
        ) : (
          <ul className="flex flex-col">
            {alarms.map((r) => (
              <AlarmRow key={r.key} report={r} reporters={reporters} />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function RegistryDashboard({
  packages,
  reports,
  reporters,
}: {
  packages: RegistryPackage[] | null;
  reports: Report[] | null;
  reporters: Reporter[] | null;
}) {
  const registered = new Set((packages ?? []).map((p) => p.label));
  const alarmsFor = (label: string) => (reports === null ? null : reports.filter((r) => labelFor(r.package) === label));
  const unregistered = reports?.filter((r) => !registered.has(labelFor(r.package))) ?? [];

  return (
    <div className="flex flex-col gap-14">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat value={packages?.length ?? null} label="packages under pypi.shankh.eth" />
        <Stat value={packages ? packages.reduce((n, p) => n + p.flagged.length, 0) : null} label="builds flagged by maintainers" />
        <Stat value={reports?.length ?? null} label="recent alarms on Arkiv" />
        <Stat value={reporters?.length ?? null} label="trusted reporters on ENS" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-medium">Packages</p>
          <p className="max-w-2xl text-sm text-text-secondary">
            Each one is an ENS name with its own resolver. <span className="font-mono text-foreground">shankh scan</span> and{" "}
            <span className="font-mono text-foreground">shankhd</span> fetch this whole list and compare it on your machine, so nobody watching learns what
            you have installed.
          </p>
        </div>
        {packages === null ? (
          <p className="text-sm text-text-secondary">Couldn&rsquo;t read the registry just now — reload to retry.</p>
        ) : packages.length === 0 ? (
          <p className="text-sm text-text-secondary">No packages registered yet.</p>
        ) : (
          <ul className="flex flex-col gap-5">
            {packages.map((pkg) => (
              <PackageCard key={pkg.name} pkg={pkg} alarms={alarmsFor(pkg.label)} reporters={reporters} />
            ))}
          </ul>
        )}
      </div>

      {unregistered.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="font-medium">Alarms about packages outside the registry</p>
            <p className="max-w-2xl text-sm text-text-secondary">
              Arkiv alarms aren&rsquo;t limited to registered packages: any machine can report any package it rebuilds. A package only needs an ENS name for its
              own maintainer to flag builds.
            </p>
          </div>
          <ul className="flex flex-col rounded-2xl border border-border bg-surface px-6 py-2">
            {unregistered.map((r) => (
              <AlarmRow key={r.key} report={r} reporters={reporters} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
