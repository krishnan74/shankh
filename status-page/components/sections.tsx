/**
 * The pitch-deck half of the status page -- hero, problem, mechanism, track alignment, and
 * honest limitations. The proof half (live KillSwitch/ENS/Arkiv reads) stays in app/page.tsx,
 * right where it was, so this never touches the data-fetching path that makes the ENS/CROPS
 * claims true. See docs/pitch-study-guide.md -- this page's copy is drawn from it directly.
 */
import { Card, Eyebrow } from "./ui";
import { Reveal } from "./reveal";

export function Hero() {
  return (
    <header className="flex flex-col gap-6 pt-6 pb-4 sm:pt-10">
      <Eyebrow>ETHGlobal Mumbai 2026 — ENS · Ethereum Foundation · Arkiv</Eyebrow>
      <h1 className="max-w-3xl font-display text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.02] font-bold tracking-tight text-balance">
        Credentials stolen by a hacked package deactivate themselves.
      </h1>
      <p className="max-w-xl text-lg leading-relaxed text-text-secondary">
        Proven malicious by a sandboxed rebuild, a maintainer&rsquo;s on-chain kill switch, a
        security advisory, or another victim&rsquo;s signed report — the exposed AWS key
        quarantines itself. Everything below is live on Sepolia and Arkiv right now, not a mock.
      </p>
      <div className="flex flex-wrap items-center gap-4 pt-2">
        <a
          href="#proof"
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-contrast transition-transform duration-300 [transition-timing-function:var(--ease-quart-out)] hover:scale-[1.03]"
        >
          See it live
        </a>
        <a
          href="https://github.com/krishnan74/shankh"
          className="text-sm font-medium text-text-secondary underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
        >
          View the repo ↗
        </a>
      </div>
    </header>
  );
}

export function Problem() {
  return (
    <Reveal>
      <section className="flex flex-col gap-4 border-t border-border pt-10">
        <Eyebrow>The gap</Eyebrow>
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          A public leak gets killed in seconds. A malware theft gets nothing.
        </h2>
        <p className="max-w-2xl text-text-secondary leading-relaxed">
          AWS&rsquo;s own <code className="font-mono text-sm">AWSCompromisedKeyQuarantineV3</code>{" "}
          deactivates a key leaked publicly on GitHub or npm in about 10 seconds. It does nothing
          for a key stolen quietly by a malicious package already running on your machine — exactly
          what happened to LiteLLM 1.107.0 users in October 2026: the malicious release was live for
          roughly two hours before PyPI pulled it, and stolen AWS keys were seen in use about 4.5
          hours after theft.
        </p>
        <p className="max-w-2xl font-display text-xl font-semibold tracking-tight text-accent">
          Shankh closes that second gap.
        </p>
      </section>
    </Reveal>
  );
}

const SIGNALS = [
  {
    step: "01",
    title: "Notice",
    body: "Watches what gets installed and which credentials each package could reach — never the credential values, just reachability.",
  },
  {
    step: "02",
    title: "Verify",
    body: "Rebuilds a new release from its public source in a sandbox with no network, and diffs it file-by-file against what's actually installed.",
  },
  {
    step: "03",
    title: "Kill",
    body: "On any of four signals — a rebuild mismatch, the maintainer's own ENS revocation, a security advisory, or a trusted peer's report — the exposed key deactivates. Never deleted, always reversible.",
  },
  {
    step: "04",
    title: "Survive",
    body: "The alarm lives on ENS and Arkiv, under keys a compromised publisher's GitHub account never holds. One person's catch saves everyone else.",
  },
];

export function Mechanism() {
  return (
    <Reveal>
      <section className="flex flex-col gap-6 border-t border-border pt-10">
        <Eyebrow>How it works</Eyebrow>
        <div className="grid gap-4 sm:grid-cols-2">
          {SIGNALS.map((s) => (
            <Card key={s.step} className="flex flex-col gap-2">
              <span className="font-mono text-xs text-text-tertiary">{s.step}</span>
              <h3 className="font-display text-lg font-bold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

const TRACKS = [
  {
    name: "ENS",
    prize: "Best Use of ENSv2",
    pitch:
      "ENS as a permission system, not a lookup table: an emancipated package registry Shankh itself can't seize, and a per-package resolver where the maintainer and the KillSwitch each hold their own scoped, non-overlapping write grant.",
    anchor: "#proof",
  },
  {
    name: "Ethereum Foundation",
    prize: "Best CROPS App",
    pitch:
      "Credibly neutral by construction: every client reads ENS state directly. Turn this status page and the backend off, and shankh verify still verifies and kills locally — the CROPS moment.",
    anchor: "#proof",
  },
  {
    name: "Arkiv",
    prize: "Build on Arkiv",
    pitch:
      "shankh.report is how one victim's catch becomes everyone else's protection: signed evidence, explicit per-reporter trust, local re-verification before any kill — never a blind, shared database.",
    anchor: "#proof",
  },
];

export function Tracks() {
  return (
    <Reveal>
      <section className="flex flex-col gap-6 border-t border-border pt-10">
        <Eyebrow>Partner tracks</Eyebrow>
        <div className="grid gap-4 sm:grid-cols-3">
          {TRACKS.map((t) => (
            <Card key={t.name} className="flex flex-col gap-2">
              <h3 className="font-display text-lg font-bold">{t.name}</h3>
              <p className="text-xs font-medium text-accent">{t.prize}</p>
              <p className="text-sm leading-relaxed text-text-secondary">{t.pitch}</p>
            </Card>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

export function Limitations() {
  return (
    <Reveal>
      <section className="flex flex-col gap-4 border-t border-border pt-10">
        <Eyebrow>What&rsquo;s not built yet</Eyebrow>
        <p className="max-w-2xl text-text-secondary leading-relaxed">
          Stated plainly, not buried: the always-running watcher daemon isn&rsquo;t built, so{" "}
          <code className="font-mono text-sm">verify</code> runs on command today, not automatically.
          The AWS quarantine-and-deactivate sequence itself is unbuilt, blocked on provisioning a
          sandbox account. Everything shown below this line — the ENS tree, the rebuild diff, the
          Arkiv report — is real on-chain state, with addresses you can check yourself right now.
        </p>
      </section>
    </Reveal>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-4 flex flex-col gap-1 border-t border-border py-10 text-xs text-text-tertiary">
      <p>Shankh — ETHGlobal Mumbai 2026. Sepolia + Arkiv testnet. Nothing here is production.</p>
      <p>
        <a href="https://github.com/krishnan74/shankh" className="underline underline-offset-2 hover:text-foreground">
          github.com/krishnan74/shankh
        </a>
      </p>
    </footer>
  );
}
