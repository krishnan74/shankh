/**
 * The static narrative of the page, organized around status-page/DESIGN.md's two visual ideas
 * ("the key that dies", "the conch ripple") and the 3-minute script's five beats. Anything that
 * needs live data receives it as props from app/page.tsx (the only place that fetches); nothing
 * here invents a value. Where the brief asked for a claim the system can't yet back (an install
 * gate, a measured kill time, an unsourced statistic), the copy says what's actually true instead.
 */
import type { Report } from "@/lib/arkiv";
import { ConchRipple, nodeField } from "./conch-ripple";
import { KeyCard } from "./key-card";
import { Reveal } from "./reveal";
import { Card, Eyebrow } from "./ui";

export function Hero({
  latestReport,
  reportCount,
  revokedCount,
  killSwitchAddress,
}: {
  latestReport: Report | null;
  reportCount: number | null;
  revokedCount: number | null;
  killSwitchAddress: string | null;
}) {
  const short = (v: string) => `${v.slice(0, 6)}…${v.slice(-4)}`;
  return (
    <header className="flex flex-col gap-10 pt-6 pb-2 sm:pt-10">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-6">
          <Eyebrow>ETHGlobal Mumbai 2026 — ENS · Ethereum Foundation · Arkiv</Eyebrow>
          <h1 className="font-display text-[clamp(2.5rem,5.2vw,4.25rem)] leading-[1.0] font-black tracking-[-0.02em] text-balance">
            Credentials stolen by a hacked package <em className="font-black italic">deactivate themselves.</em>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-text-secondary">
            Shankh proves a release malicious by rebuilding it from source, and puts the alarm on ENS and Arkiv — where a compromised publisher can&rsquo;t reach it.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="#beat-proof"
              className="pulse rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-contrast transition-transform duration-300 [transition-timing-function:var(--ease)] hover:scale-[1.03]"
            >
              See it live
            </a>
            <a
              href="https://github.com/krishnan74/shankh"
              className="text-sm font-medium text-text-secondary underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
            >
              Read the code ↗
            </a>
          </div>
        </div>

        <Reveal className="relative">
          <ConchRipple className="pointer-events-none absolute -inset-16 -z-10 h-[calc(100%+8rem)] w-[calc(100%+8rem)] opacity-70" rings={5} />
          <KeyCard report={latestReport} />
        </Reveal>
      </div>

      {/* Proof strip: three live counts, fixed-width slots so nothing shifts when values arrive. */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-y border-border py-3 font-mono text-xs text-text-secondary">
        <span className="min-w-[10rem]">
          {reportCount === null ? <span className="text-text-tertiary">Arkiv unreachable</span> : <><span className="text-foreground">{reportCount}</span> reports on Arkiv</>}
        </span>
        <span className="min-w-[12rem]">
          {revokedCount === null ? <span className="text-text-tertiary">ENS unreachable</span> : <><span className="text-foreground">{revokedCount}</span> revoked hash{revokedCount === 1 ? "" : "es"} on ENS</>}
        </span>
        <span className="min-w-[12rem]">
          {killSwitchAddress ? <>KillSwitch <span className="text-foreground" title={killSwitchAddress}>{short(killSwitchAddress)}</span></> : <span className="text-text-tertiary">KillSwitch unreachable</span>}
        </span>
      </div>
    </header>
  );
}

/** Beat 4 -- the two real incidents as case files. Only facts in plan-2.md's verified Status
 * table: no org counts or other figures we don't have a source for. */
export function WhyNowCases() {
  const cases = [
    {
      month: "03",
      year: "2026",
      title: "LiteLLM 1.82.7 / 1.82.8",
      mechanism: "Code inside proxy_server.py (1.82.7); a litellm_init.pth startup hook (1.82.8).",
      source: "GHSA-5mg7-485q-xm76",
    },
    {
      month: "10",
      year: "2026",
      title: "LiteLLM 1.107.0",
      mechanism: "A .pth loader plus sitecustomize.py — auto-run on every Python start.",
      source: "Datadog · Help Net Security · CSA",
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {cases.map((c) => (
          <Card key={c.title} className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl leading-none font-black">{c.month}</span>
              <span className="label text-[10px] text-text-tertiary">/ {c.year} · historical</span>
            </div>
            <p className="font-mono text-sm font-medium">{c.title}</p>
            <p className="text-sm leading-relaxed text-text-secondary">{c.mechanism}</p>
            <p className="label text-[9px] text-text-tertiary">source: {c.source}</p>
          </Card>
        ))}
      </div>
      <p className="font-display text-2xl leading-snug italic sm:text-3xl">
        Leaked keys get quarantined in seconds. <span className="text-red-700 dark:text-red-400">Stolen keys get nothing.</span>
      </p>
    </div>
  );
}

/** Beat 5 -- the tagline, the ripple reaching the field, and the honest line underneath. */
export function HonestClose() {
  return (
    <Reveal>
      <Card tone="inverted" className="grid grid-cols-1 items-center gap-6 p-8 sm:p-10 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-4">
          <p className="label text-xs text-accent">The conch</p>
          <p className="font-display text-4xl leading-[1.02] font-black tracking-[-0.02em] sm:text-5xl">
            One catches it. Everyone is saved.
          </p>
          <p className="text-sm leading-relaxed text-background/70">
            Live today: the rebuild detection, the signed Arkiv alarm, and the on-chain revocation nobody — including us — can undo. Not yet: the AWS key deactivation itself, the always-on watcher, and the install gate that would stop an attacker who uses a key within minutes. Those are next.
          </p>
        </div>
        <ConchRipple className="mx-auto h-64 w-64 sm:h-72 sm:w-72" rings={4} nodes={nodeField(18)} protectedNodes />
      </Card>
    </Reveal>
  );
}

/** Progressive-disclosure detail: the pipeline, with an honest built/not-yet tag per step. */
export function Stepper() {
  const steps = [
    { n: "01", title: "Notice", body: "Watch installs; map which credentials each package could reach.", built: false },
    { n: "02", title: "Verify", body: "Rebuild from the public sdist, diff file-by-file against what's installed.", built: true },
    { n: "03", title: "Prove", body: "Fold in the maintainer's ENS revocation; a revoked artifact is critical regardless of the diff.", built: true },
    { n: "04", title: "Kill", body: "Quarantine, then deactivate the reachable AWS key. Deactivate, never delete.", built: false },
    { n: "05", title: "Report", body: "Sign the result to Arkiv so every other machine can check it.", built: true },
  ];
  return (
    <ol className="flex flex-col">
      {steps.map((s) => (
        <li key={s.n} className="flex gap-4 border-l border-border py-2 pl-4">
          <span className="label mt-0.5 text-[10px] text-text-tertiary">{s.n}</span>
          <div className="flex-1">
            <p className="flex items-center gap-2 font-medium text-foreground">
              {s.title}
              <span className={`label text-[9px] ${s.built ? "text-accent" : "text-text-tertiary"}`}>{s.built ? "built" : "not yet"}</span>
            </p>
            <p>{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function TrackColumns({ pypiRegistry, killSwitch }: { pypiRegistry: string | null; killSwitch: string | null }) {
  const etherscan = (a: string) => `https://sepolia.etherscan.io/address/${a}`;
  const cols = [
    {
      name: "ENS — Best Use of ENSv2",
      body: "ENSv2's permissions are the security guarantee: an emancipated registry we can't seize, and per-key resolver roles splitting the maintainer's shankh.source from KillSwitch's shankh.revoked.",
      link: pypiRegistry ? { href: etherscan(pypiRegistry), label: "pypi.shankh.eth on Etherscan ↗" } : null,
    },
    {
      name: "Ethereum Foundation — CROPS",
      body: "Clients read ENS directly; `shankh verify` keeps working with this page and any backend switched off.",
      link: killSwitch ? { href: etherscan(killSwitch), label: "KillSwitch on Etherscan ↗" } : null,
    },
    {
      name: "Arkiv — Build on Arkiv",
      body: "shankh.report is the shared, signed alarm: one machine's finding becomes evidence every other machine can check.",
      link: { href: "#ledger", label: "Reports in the ledger →" },
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cols.map((c) => (
        <div key={c.name} className="flex flex-col gap-2">
          <p className="font-medium text-foreground">{c.name}</p>
          <p>{c.body}</p>
          {c.link && (
            <a href={c.link.href} className="text-xs underline underline-offset-2 hover:text-accent">
              {c.link.label}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-4 flex flex-col gap-2 border-t border-border py-10 text-xs text-text-tertiary">
      <p>
        Demo runs on Sepolia and the Arkiv testnet against a harmless replay of the attack. No real malware is published.
      </p>
      <p className="flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-accent">
          <path d="M12 21c-4 0-7-2.5-7-6.5S8 6 12 6s6 3 6 6-2.5 5-5.5 5-4.5-1.8-4.5-4 1.5-3.5 3.5-3.5 2.5 1.2 2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <a href="https://github.com/krishnan74/shankh" className="underline underline-offset-2 hover:text-foreground">
          github.com/krishnan74/shankh
        </a>
      </p>
    </footer>
  );
}
