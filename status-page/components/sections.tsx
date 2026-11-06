/**
 * The pitch-deck half of the status page, built from landing-page-playbook.md: one scrolling
 * page structured like a pitch (hero -> problem, concrete -> live demo, embedded -> how it
 * works -> everything else, collapsed -> footer), three type roles never mixed, one accent
 * spent only on what Shankh adds, a 12-col grid with a narrow kicker column, one easing curve
 * reused everywhere. The live-proof half (real KillSwitch/ENS/Arkiv reads) lives in app/page.tsx
 * since it needs the fetched data -- this file is the always-static narrative around it.
 */
import { Card, Eyebrow, SectionHeader } from "./ui";
import { Reveal } from "./reveal";

export function Hero() {
  return (
    <header className="flex flex-col gap-6 pt-6 pb-4 sm:pt-10">
      <Eyebrow>ETHGlobal Mumbai 2026 — ENS · Ethereum Foundation · Arkiv</Eyebrow>
      <h1 className="max-w-3xl font-display text-[clamp(2.5rem,6.5vw,4.75rem)] leading-[1.02] font-bold tracking-[-0.02em] text-balance">
        Credentials stolen by a hacked package deactivate themselves.
      </h1>
      <p className="max-w-xl text-lg leading-relaxed text-text-secondary">
        Proven malicious by a sandboxed rebuild, a maintainer&rsquo;s on-chain kill switch, a
        security advisory, or another victim&rsquo;s signed report — the exposed AWS key
        quarantines itself. Scroll down: everything below the problem is live right now, not a mock.
      </p>
      <div className="flex flex-wrap items-center gap-5 pt-2">
        <a
          href="#proof"
          className="pulse rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-contrast transition-transform duration-300 [transition-timing-function:var(--ease)] hover:scale-[1.03]"
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

/**
 * The problem, shown concretely (playbook #1): a before/after pair on the same grid, same card
 * shape, one panel inverted to mark "the solution" against "the problem" next to it (#3) --
 * never a paragraph of abstract prose.
 */
export function Problem() {
  return (
    <Reveal>
      <section className="flex flex-col gap-6 border-t border-border pt-10">
        <SectionHeader
          kicker="The gap"
          headline="A public leak dies in seconds. A malware theft gets nothing."
          lede={
            <>
              AWS&rsquo;s own <code className="font-mono text-sm">AWSCompromisedKeyQuarantineV3</code>{" "}
              already kills a key leaked publicly on GitHub or npm in about 10 seconds — that part is
              solved. Nothing does the same for a key stolen quietly by a package already running on
              your machine.
            </>
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:pl-[25%]">
          <Card className="flex flex-col gap-2">
            <p className="label text-xs text-text-tertiary">Without Shankh</p>
            <p className="font-display text-xl font-bold tracking-tight">
              The key stays live for hours. Nobody notices.
            </p>
            <p className="text-sm leading-relaxed text-text-secondary">
              LiteLLM 1.107.0, October 2026: the malicious release was live for roughly two hours
              before PyPI pulled it. Stolen AWS keys were seen in use about 4.5 hours after theft.
            </p>
          </Card>
          <Card tone="inverted" className="flex flex-col gap-2">
            <p className="label text-xs text-accent">With Shankh</p>
            <p className="font-display text-xl font-bold tracking-tight">
              The key deactivates itself before you notice it&rsquo;s gone.
            </p>
            <p className="text-sm leading-relaxed text-background/70">
              Triggered by evidence a compromised publisher can&rsquo;t suppress: a sandboxed
              rebuild, the maintainer&rsquo;s own ENS revoke, an advisory, or a signed peer report.
            </p>
          </Card>
        </div>
      </section>
    </Reveal>
  );
}

const SIGNALS = [
  {
    step: "01",
    title: "Notice",
    body: "Watches what gets installed and which credentials each package could reach — never the credential values, just reachability.",
    span: "sm:col-span-7",
  },
  {
    step: "02",
    title: "Verify",
    body: "Rebuilds a new release from its public source in a sandbox with no network, and diffs it file-by-file against what's actually installed.",
    span: "sm:col-span-5",
  },
  {
    step: "03",
    title: "Kill",
    body: "On any of four signals — a rebuild mismatch, the maintainer's own ENS revocation, an advisory, or a trusted peer's report — the exposed key deactivates. Never deleted, always reversible.",
    span: "sm:col-span-5",
  },
  {
    step: "04",
    title: "Survive",
    body: "The alarm lives on ENS and Arkiv, under keys a compromised publisher's GitHub account never holds. One person's catch saves everyone else.",
    span: "sm:col-span-7",
  },
];

export function Mechanism() {
  return (
    <Reveal>
      <section className="flex flex-col gap-6 border-t border-border pt-10">
        <SectionHeader kicker="How it works" headline="Four signals, one kill." />
        <div className="grid grid-cols-12 gap-4 sm:pl-[25%]">
          {SIGNALS.map((s, i) => (
            <Reveal key={s.step} delayMs={i * 80} className={`col-span-12 ${s.span}`}>
              <Card className="flex h-full flex-col gap-2">
                <span className="label text-xs text-text-tertiary">{s.step}</span>
                <h3 className="font-display text-lg font-bold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">{s.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-4 flex flex-col gap-1 border-t border-border py-10 text-xs text-text-tertiary">
      <p>
        Shankh — ETHGlobal Mumbai 2026, built for the ENS, Ethereum Foundation and Arkiv partner
        tracks. Sepolia + Arkiv testnet. Nothing here is production.
      </p>
      <p>
        <a href="https://github.com/krishnan74/shankh" className="underline underline-offset-2 hover:text-foreground">
          github.com/krishnan74/shankh
        </a>
      </p>
    </footer>
  );
}
