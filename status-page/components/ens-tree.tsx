/**
 * shankh.eth -> pypi.shankh.eth (emancipated) -> shankh-demo.pypi.shankh.eth, with the resolver
 * and KillSwitch hanging off the leaf. Every dynamic value is a request-time read: emancipation
 * is isEmancipated() called live, source/revoked are resolve() text records, maintainer is
 * KillSwitch.maintainer(), and the two attack attempts are eth_call simulations re-run against
 * current Sepolia state (lib/proofs.ts) -- not quoted from a log. HTML+CSS connectors, no canvas,
 * stacks vertically on mobile.
 */
import type { KillSwitchInfo } from "@/lib/killswitch";
import type { PackageEnsInfo } from "@/lib/ens";
import type { RegistryInfo } from "@/lib/registry";
import type { ProofOutcome } from "@/lib/proofs";
import { Code } from "./code.client";
import { RevertProof } from "./ui";

const etherscan = (address: string) => `https://sepolia.etherscan.io/address/${address}`;

function TreeNode({
  name,
  tag,
  children,
}: {
  name: string;
  tag?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono font-medium">{name}</span>
        {tag}
      </div>
      {children && <div className="mt-2 flex flex-col gap-1 text-xs text-text-secondary">{children}</div>}
    </div>
  );
}

function Connector() {
  return <div className="ml-6 h-5 w-px bg-border" aria-hidden="true" />;
}

function Attempt({ label, proof }: { label: string; proof: ProofOutcome }) {
  if (proof.outcome === "reverted") return <RevertProof attempt={label} error={proof.error} />;
  if (proof.outcome === "succeeded") {
    return (
      <div className="rounded-lg border-2 border-red-600 p-3 text-xs font-medium text-red-700 dark:text-red-400">
        {label} — this simulation did NOT revert just now. The guarantee shown here is not holding; treat this page&rsquo;s claim as false until it&rsquo;s investigated.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border p-3 text-xs text-text-tertiary">
      {label} — couldn&rsquo;t reach Sepolia to re-run this just now. Reload to retry.
    </div>
  );
}

export function EnsTree({
  shankhRegistry,
  pypiRegistry,
  packageEns,
  killSwitch,
  proofs,
}: {
  shankhRegistry: string | null;
  pypiRegistry: RegistryInfo | null;
  packageEns: PackageEnsInfo | null;
  killSwitch: KillSwitchInfo | null;
  proofs: { regrant: ProofOutcome; writeRevoked: ProofOutcome } | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="flex flex-col">
        <TreeNode name="shankh.eth" tag={<span className="label text-[9px] text-text-tertiary">registry</span>}>
          {shankhRegistry ? (
            <a href={etherscan(shankhRegistry)} className="hover:text-accent">
              <Code copy={false}>{shankhRegistry}</Code> ↗
            </a>
          ) : (
            <span>not configured</span>
          )}
        </TreeNode>
        <Connector />
        <TreeNode
          name="pypi.shankh.eth"
          tag={
            pypiRegistry ? (
              <span
                className={`label inline-flex items-center gap-1 text-[9px] ${pypiRegistry.emancipated ? "text-accent" : "text-red-700 dark:text-red-400"}`}
                title="No one, including us, can seize, redirect, or unregister a name under this registry."
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                {pypiRegistry.emancipated ? "emancipated · live" : "NOT emancipated"}
              </span>
            ) : (
              <span className="label text-[9px] text-text-tertiary">offline</span>
            )
          }
        >
          {pypiRegistry && (
            <span>
              isEmancipated() = <span className="font-mono">{String(pypiRegistry.emancipated)}</span>, read this request —{" "}
              <a href={etherscan(pypiRegistry.address)} className="underline underline-offset-2 hover:text-accent">
                Etherscan ↗
              </a>
            </span>
          )}
        </TreeNode>
        <Connector />
        <TreeNode name="shankh-demo.pypi.shankh.eth" tag={<span className="label text-[9px] text-text-tertiary">package</span>}>
          {packageEns ? (
            <>
              <span>
                resolver <Code>{packageEns.resolver}</Code>
              </span>
              <span>
                shankh.source <span className="font-mono break-all">{packageEns.source ?? "(not set)"}</span>{" "}
                <span className="text-text-tertiary">— maintainer-only</span>
              </span>
              <span>
                shankh.revoked{" "}
                <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-[10px] text-red-800 dark:bg-red-950 dark:text-red-300">
                  {packageEns.revokedArtifacts.length} revoked
                </span>{" "}
                <span className="text-text-tertiary">— KillSwitch-only</span>
              </span>
            </>
          ) : (
            <span>couldn&rsquo;t read the resolver just now — reload to retry</span>
          )}
        </TreeNode>
        <Connector />
        <TreeNode name="KillSwitch" tag={<span className="label text-[9px] text-accent">sole writer of shankh.revoked</span>}>
          {killSwitch ? (
            <>
              <span>
                contract <Code>{killSwitch.address}</Code>
              </span>
              <span>
                maintainer <Code>{killSwitch.maintainer}</Code>
              </span>
            </>
          ) : (
            <span>couldn&rsquo;t read KillSwitch just now — reload to retry</span>
          )}
        </TreeNode>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600 dark:bg-red-500" aria-hidden="true" />
          <span className="label text-[10px] text-red-700 dark:text-red-400">Attacker — even with our own deploy key</span>
        </div>
        <p className="text-xs text-text-tertiary">
          Both calls below are re-simulated against live Sepolia on every page load, from the address that deployed this tree. The result shown is what the chain says right now.
        </p>
        {proofs ? (
          <>
            <div className="border-l border-dashed border-red-400/60 pl-4">
              <Attempt label="Re-grant the revoked roles on pypi.shankh.eth" proof={proofs.regrant} />
            </div>
            <div className="border-l border-dashed border-red-400/60 pl-4">
              <Attempt label="Write shankh.revoked directly, bypassing KillSwitch" proof={proofs.writeRevoked} />
            </div>
          </>
        ) : (
          <p className="text-xs text-text-tertiary">Couldn&rsquo;t reach Sepolia to run the attempts just now — reload to retry.</p>
        )}
      </div>
    </div>
  );
}
