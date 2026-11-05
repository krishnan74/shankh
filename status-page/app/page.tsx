export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 p-16 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Shankh status
      </h1>
      <p className="max-w-md text-center text-zinc-600 dark:text-zinc-400">
        Not wired up yet — this page will show live revocation status from the ENS{" "}
        <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-sm dark:bg-white/[.08]">
          shankh.revoked
        </code>{" "}
        record and incoming Arkiv <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-sm dark:bg-white/[.08]">shankh.report</code> entities. See <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-sm dark:bg-white/[.08]">docs/plan.md</code> in the repo for the current status table.
      </p>
    </main>
  );
}
