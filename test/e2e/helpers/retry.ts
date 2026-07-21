/**
 * Retry an async fn with exponential backoff (network / IPN lag).
 */
export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts?: {
    attempts?: number;
    delayMs?: number;
    /** Return true to retry even when fn threw / returned. */
    shouldRetry?: (err: unknown, attempt: number) => boolean;
  },
): Promise<T> {
  const attempts = opts?.attempts ?? 8;
  const delayMs = opts?.delayMs ?? 500;
  let lastErr: unknown;

  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retry =
        opts?.shouldRetry?.(err, i) ?? i < attempts;
      if (!retry) throw err;
      const wait = delayMs * Math.min(i, 6);
      console.log(`[retry] ${label} attempt ${i}/${attempts} — wait ${wait}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

/**
 * Poll until predicate returns a truthy value (or timeout).
 */
export async function pollUntil<T>(
  label: string,
  fn: () => Promise<T | null | undefined | false>,
  opts?: { timeoutMs?: number; intervalMs?: number },
): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? 30_000;
  const intervalMs = opts?.intervalMs ?? 750;
  const started = Date.now();
  let last: T | null | undefined | false;

  while (Date.now() - started < timeoutMs) {
    last = await fn();
    if (last) return last as T;
    await sleep(intervalMs);
  }
  throw new Error(
    `[pollUntil] ${label} timed out after ${timeoutMs}ms (last=${JSON.stringify(last)})`,
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
