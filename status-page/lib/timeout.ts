/**
 * Caps how long the page waits on any one live read. Without this, a single stalled endpoint
 * (observed: the Arkiv testnet RPC hanging for over a minute) blocks the entire dynamic render --
 * the page never arrives at all. With it, the slow read rejects, its section shows the honest
 * "couldn't reach … just now" state, and everything else still renders live.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
