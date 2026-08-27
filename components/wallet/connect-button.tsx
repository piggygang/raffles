"use client";

import { useWallet } from "./wallet-provider";

const shorten = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;

/**
 * The navbar's wallet control: one button whatever is installed, opening the
 * chooser. Brand-styled rather than accent-styled — `--accent` is set per
 * collection inside the editor and does not reach the header.
 */
export function ConnectButton() {
  const { address, openModal } = useWallet();

  return (
    <button
      type="button"
      onClick={openModal}
      className="shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink-muted transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {/* Server-rendered as the disconnected label; `address` only becomes
          non-null after mount, so there is nothing to mismatch. */}
      {address ? <span className="font-mono">{shorten(address)}</span> : "Connect wallet"}
    </button>
  );
}
