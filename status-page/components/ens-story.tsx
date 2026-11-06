/**
 * The ENS section in plain language: three ideas, then "we tried to break it" with the chain's
 * real, live answer. Every status here is a request-time read (isEmancipated(), the resolver's
 * records, and eth_call re-simulations of the two attacks from lib/proofs.ts). Raw revert strings
 * stay one click away under "Show the raw error" -- present for anyone checking, out of the way
 * for anyone just reading. The full tree with every address lives in the More detail section.
 */
import type { PackageEnsInfo } from "@/lib/ens";
import type { ProofOutcome } from "@/lib/proofs";
import type { RegistryInfo } from "@/lib/registry";
import { Reveal } from "./reveal";
import { Card } from "./ui";

function Chip({ tone, children }: { tone: "ok" | "bad" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "border-accent/50 text-accent"
      : tone === "bad"
        ? "border-red-400 text-red-700 dark:text-red-400"
        : "border-border text-text-secondary";
  return <span className={`label inline-flex w-fit rounded-full border px-2 py-0.5 text-[9px] ${cls}`}>{children}</span>;
}

function Attempt({ label, proof }: { label: string; proof: ProofOutcome | null }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 shrink-0 rounded-full bg-red-600 dark:bg-red-500" aria-hidden="true" />
          {label}
        </span>
        {proof?.outcome === "reverted" && <Chip tone="ok">✓ Blocked by Sepolia</Chip>}
        {proof?.outcome === "succeeded" && <Chip tone="bad">Not blocked — guarantee failing</Chip>}
        {(!proof || proof.outcome === "unavailable") && <Chip tone="muted">Couldn&rsquo;t check just now</Chip>}
      </div>
      {proof?.outcome === "reverted" && (
        <details className="group text-xs">
          <summary className="cursor-pointer list-none text-text-secondary underline decoration-border underline-offset-2 hover:text-foreground">
            Show the raw error
          </summary>
          <code className="mt-2 block break-all rounded-md bg-red-50 p-2 font-mono text-red-800 dark:bg-red-950/40 dark:text-red-300">{proof.error}</code>
        </details>
      )}
    </div>
  );
}

export function EnsStory({
  pypiRegistry,
  packageEns,
  proofs,
}: {
  pypiRegistry: RegistryInfo | null;
  packageEns: PackageEnsInfo | null;
  proofs: { regrant: ProofOutcome; writeRevoked: ProofOutcome } | null;
}) {
  const cards = [
    {
      title: "We locked the name space",
      body: "We created pypi.shankh.eth, then gave up our own power to change it or take back names in it — permanently.",
      chip:
        pypiRegistry === null ? (
          <Chip tone="muted">Couldn&rsquo;t check just now</Chip>
        ) : pypiRegistry.emancipated ? (
          <Chip tone="ok">✓ Locked · checked just now</Chip>
        ) : (
          <Chip tone="bad">Not locked</Chip>
        ),
    },
    {
      title: "Two keys, two locks",
      body: "The package's maintainer can only set where its code lives. Our kill-switch contract can only set the list of bad builds. Neither can touch the other's.",
      chip: packageEns?.source ? <Chip tone="ok">✓ Source set by maintainer</Chip> : <Chip tone="muted">Couldn&rsquo;t check just now</Chip>,
    },
    {
      title: "Flag fast, unflag slow",
      body: "Only the maintainer can flag a bad build, and it works instantly. Unflagging waits 48 hours, so someone with a stolen wallet can't quietly undo it.",
      chip: packageEns ? (
        <Chip tone="ok">
          {packageEns.revokedArtifacts.length} build{packageEns.revokedArtifacts.length === 1 ? "" : "s"} flagged
        </Chip>
      ) : (
        <Chip tone="muted">Couldn&rsquo;t check just now</Chip>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <p className="text-center font-mono text-xs text-text-secondary">
        shankh.eth <span className="text-text-tertiary">→</span> pypi.shankh.eth <span className="text-text-tertiary">→</span>{" "}
        <span className="text-foreground">shankh-demo.pypi.shankh.eth</span>
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {cards.map((c, i) => (
          <Reveal key={c.title} delayMs={i * 80}>
            <Card className="flex h-full flex-col gap-3">
              <p className="font-medium">{c.title}</p>
              <p className="flex-1 text-sm leading-relaxed text-text-secondary">{c.body}</p>
              {c.chip}
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <Card className="flex flex-col">
          <p className="font-medium">We tried to break it — using our own deploy key.</p>
          <p className="mt-2 text-sm text-text-secondary">
            Every time this page loads, both attacks are re-tried against the live Sepolia network. This is what the chain says right now.
          </p>
          <div className="mt-4">
            <Attempt label="Take back control of the name space" proof={proofs?.regrant ?? null} />
            <Attempt label="Write the bad-builds list without the kill switch" proof={proofs?.writeRevoked ?? null} />
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
