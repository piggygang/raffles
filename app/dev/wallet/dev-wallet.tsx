"use client";

import { useState } from "react";
import { useTx } from "@/components/tx/tx-provider";
import { useWallet } from "@/components/wallet/wallet-provider";
import { CHAIN, CLUSTER, explorerTxUrl } from "@/lib/cluster";
import { getLatestBlockhash } from "@/lib/solana-rpc";
import { buildMemoTransaction } from "@/lib/tx";
import { signAndSendTransaction } from "@/lib/wallet";

const INPUT =
  "min-w-0 flex-1 rounded-full border border-line bg-surface-raised px-3.5 py-2 text-sm placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const ACTION =
  "shrink-0 rounded-full border border-brand px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60";

const shorten = (signature: string) => `${signature.slice(0, 8)}…${signature.slice(-8)}`;

/**
 * The scaffold's acceptance harness: connect a wallet, sign and send a Memo
 * transaction, watch the toast confirm it. Everything the raffle flows will
 * do later, with the cheapest possible instruction.
 */
export function DevWallet() {
  const { wallet, account, address, endpoint, openModal } = useWallet();
  const { track } = useTx();
  const [memo, setMemo] = useState("piggy raffles wallet test");
  const [busy, setBusy] = useState(false);
  // Kept on screen rather than left to the toast: the toast auto-dismisses,
  // and a test page wants the last signature copyable.
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!wallet || !account || busy) return;
    setBusy(true);
    setError(null);
    try {
      const blockhash = await getLatestBlockhash(endpoint);
      const transaction = buildMemoTransaction(account.publicKey, blockhash, memo);
      const signature = await signAndSendTransaction(wallet, account, CHAIN, transaction);
      setSent(signature);
      track("Memo transaction", signature);
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : "Could not send the transaction.";
      // Wallets word a rejection a dozen ways; one calm sentence covers them all.
      setError(/reject|declin|denied|cancel/i.test(message) ? "Signing was declined." : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16 sm:pt-20">
      <p className="text-sm font-medium tracking-[0.14em] text-ink-muted uppercase">Wallet test</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Sign a memo transaction
      </h1>
      <p className="mt-4 max-w-md text-base text-ink-muted text-pretty">
        Connects a wallet and sends one Memo-program transaction — the whole signing pipeline
        the raffle flows will use, at the cost of gas alone. Your wallet app must be switched
        to the same cluster, or its simulation will fail against the wrong chain.
      </p>

      <div className="mt-8 max-w-md rounded-card border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-ink-muted">Cluster</span>
          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink">
            {CLUSTER}
          </span>
        </div>

        {address ? (
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label htmlFor="dev-memo" className="text-xs text-ink-muted">
              Memo text — lands on chain, so keep it friendly.
            </label>
            <div className="flex gap-2">
              <input
                id="dev-memo"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                className={INPUT}
              />
              <button type="submit" disabled={busy} className={ACTION}>
                {busy ? "Approve in wallet…" : "Sign & send"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">No wallet connected.</p>
            <button
              type="button"
              onClick={openModal}
              className="shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink-muted transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Connect wallet
            </button>
          </div>
        )}

        {sent && (
          <p className="mt-4 font-mono text-xs text-ink-muted">
            {shorten(sent)}{" "}
            <a
              href={explorerTxUrl(sent)}
              target="_blank"
              rel="noreferrer"
              className="text-ink-muted transition-colors hover:text-brand"
            >
              View on explorer →
            </a>
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-xs text-brand">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
