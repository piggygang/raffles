/**
 * The entire chain-reading surface of the app, over plain fetch so
 * @solana/web3.js and its Buffer polyfill stay out of the bundle. In raffles
 * that surface is a blockhash before signing and a signature status after —
 * resist growing this. (dressme's holdings reads return here, verbatim, when
 * raffle eligibility needs them.)
 */

export class RpcError extends Error {
  readonly code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.code = code;
  }
}

async function call(endpoint: string, method: string, params: unknown, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal,
  });
  if (!response.ok) throw new Error(`RPC returned ${response.status}`);
  // JSON-RPC reports failures in the body with a 200, so the status check
  // above is not enough.
  const payload: unknown = await response.json();
  const body = payload as { result?: unknown; error?: { code?: number; message?: string } };
  if (body.error) throw new RpcError(body.error.message ?? "RPC error", body.error.code);
  return body.result;
}

/**
 * The blockhash a new transaction must reference; "confirmed" is fresh enough
 * and matches the commitment the confirmation poll waits for.
 */
export async function getLatestBlockhash(endpoint: string, signal?: AbortSignal): Promise<string> {
  const result = await call(endpoint, "getLatestBlockhash", [{ commitment: "confirmed" }], signal);
  const blockhash = (result as { value?: { blockhash?: unknown } })?.value?.blockhash;
  if (typeof blockhash !== "string") throw new Error("Blockhash response was malformed.");
  return blockhash;
}

/** The transaction executed and failed — distinct from "not seen yet". */
export class TransactionFailedError extends Error {}

/** Polling gave up; the transaction may still land. Callers must say so, with an explorer link. */
export class ConfirmationTimeoutError extends Error {}

const CONFIRM_INTERVAL_MS = 2_000;
const CONFIRM_TIMEOUT_MS = 90_000;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Resolves once the signature reaches "confirmed" or "finalized". The status
 * cache getSignatureStatuses reads (without searchTransactionHistory) only
 * covers recent slots, which is exactly right for a signature broadcast
 * seconds ago — the history flag would push a heavier query per poll for
 * nothing. A null status just means "not seen yet"; err is checked before the
 * commitment level because a failed transaction confirms too.
 */
export async function confirmTransaction(endpoint: string, signature: string, signal?: AbortSignal): Promise<void> {
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const result = await call(endpoint, "getSignatureStatuses", [[signature]], signal);
    const status = (result as { value?: ({ err?: unknown; confirmationStatus?: unknown } | null)[] })?.value?.[0];
    if (status && status.err != null) {
      throw new TransactionFailedError(`Transaction failed on chain: ${JSON.stringify(status.err)}`);
    }
    const level = status?.confirmationStatus;
    if (level === "confirmed" || level === "finalized") return;
    await sleep(CONFIRM_INTERVAL_MS, signal);
  }
  throw new ConfirmationTimeoutError("Not confirmed within 90 seconds.");
}
