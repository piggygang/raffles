"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { explorerTxUrl } from "@/lib/cluster";
import { ConfirmationTimeoutError, confirmTransaction } from "@/lib/solana-rpc";
import { useWallet } from "@/components/wallet/wallet-provider";

/**
 * Transaction toasts: every broadcast signature gets a card that watches it to
 * confirmation. A separate provider from the wallet on purpose — toast state
 * flips on a two-second poll cadence, and merging it into the wallet context
 * would re-render every wallet consumer on every tick. Mounted inside
 * <WalletProvider> because the poll reads the endpoint from it.
 */
type TxState = {
  /**
   * Hand a just-broadcast signature to the toast stack. Fire-and-forget by
   * design: the caller's button unbusies immediately and confirmation is this
   * provider's problem. Signing itself is NOT tracked here — before the
   * wallet returns a signature there is nothing to link to, and the button's
   * own "Approve in wallet…" label already covers that phase.
   */
  track: (label: string, signature: string) => void;
};

const TxContext = createContext<TxState | null>(null);

export function useTx(): TxState {
  const state = useContext(TxContext);
  if (!state) throw new Error("useTx must be used inside <TxProvider>");
  return state;
}

type Toast = {
  id: number;
  label: string;
  signature: string;
  status: "pending" | "confirmed" | "failed" | "timeout";
  /** Failure detail, shown only for "failed". */
  message: string | null;
};

const STATUS_TEXT: Record<Toast["status"], string> = {
  pending: "Confirming…",
  confirmed: "Confirmed",
  failed: "Failed",
  timeout: "Not confirmed in time — it may still land.",
};

export function TxProvider({ children }: { children: ReactNode }) {
  const { endpoint } = useWallet();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const controllers = useRef(new Map<number, AbortController>());

  const patch = useCallback((id: number, changes: Partial<Toast>) => {
    setToasts((previous) => previous.map((toast) => (toast.id === id ? { ...toast, ...changes } : toast)));
  }, []);

  const dismiss = useCallback((id: number) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const track = useCallback(
    (label: string, signature: string) => {
      const id = nextId.current++;
      setToasts((previous) => [...previous, { id, label, signature, status: "pending", message: null }]);
      const controller = new AbortController();
      controllers.current.set(id, controller);
      // Imperative rather than a keyed effect: a broadcast signature is a
      // one-shot fact, not a derived read — no input change should restart
      // it. The poll keeps the endpoint it started with; a mid-flight
      // override switch must not re-ask a different node about a transaction
      // the first one sent.
      confirmTransaction(endpoint, signature, controller.signal)
        .then(() => {
          patch(id, { status: "confirmed" });
          // Success needs a glance, not a decision.
          setTimeout(() => dismiss(id), 6_000);
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return; // dismissed — nobody is listening
          if (cause instanceof ConfirmationTimeoutError) patch(id, { status: "timeout" });
          else patch(id, { status: "failed", message: cause instanceof Error ? cause.message : "Transaction failed." });
        })
        .finally(() => controllers.current.delete(id));
    },
    [endpoint, patch, dismiss],
  );

  // The provider lives for the app's lifetime, but strict-mode remounts and
  // navigation teardown must not leak pollers.
  useEffect(() => {
    const map = controllers.current;
    return () => map.forEach((controller) => controller.abort());
  }, []);

  const value = useMemo<TxState>(() => ({ track }), [track]);

  return (
    <TxContext value={value}>
      {children}
      {/* position:fixed — out of flow, so <body>'s flex column never sees it. */}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </TxContext>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    // Always rendered, even empty: a live region announced reliably is one
    // that existed before its first message. z-40 is the codebase's second and
    // last z-index (the header is z-30; the dialog needs none — top layer).
    // An open dialog covering toasts is correct: a modal decision outranks a
    // status line.
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-80"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto rounded-card border border-line bg-surface p-3 text-sm motion-safe:animate-[toast-in_150ms_ease-out]"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{toast.label}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss"
              className="rounded-full px-1 text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              ✕
            </button>
          </div>
          {toast.status === "failed" ? (
            <p role="alert" className="mt-1 text-xs text-brand">
              {toast.message ?? STATUS_TEXT.failed}
            </p>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">{STATUS_TEXT[toast.status]}</p>
          )}
          <a
            href={explorerTxUrl(toast.signature)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs text-ink-muted transition-colors hover:text-brand"
          >
            View on explorer →
          </a>
        </div>
      ))}
    </div>
  );
}
