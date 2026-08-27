"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useWallet } from "./wallet-provider";

/**
 * Wallet chooser and connection settings.
 *
 * A native <dialog> rather than a hand-rolled overlay: it renders in the top
 * layer — so it clears the sticky header without needing a z-index — and
 * brings focus trapping, Escape-to-close and ::backdrop with it.
 */
const ROW =
  "flex w-full items-center gap-3 rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-left text-sm transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const INPUT =
  "min-w-0 flex-1 rounded-full border border-line bg-surface-raised px-3.5 py-2 text-sm placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const ACTION =
  "shrink-0 rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const shorten = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;

/**
 * The question this answers is not "is this a touch screen" but "is this a
 * platform where extension wallets cannot exist and the wallet apps register
 * universal links" — iOS and Android. `pointer: coarse` would misfire on
 * touch-screen laptops, where "install the extension" is the right advice.
 */
const isMobileUa = () => /iphone|ipad|ipod|android/i.test(navigator.userAgent);

// Verified universal-link formats: each takes the target URL path-encoded,
// plus a ref back to the requesting origin. Inside any of these in-app
// browsers the wallet registers via Wallet Standard, so the deeplink branch
// never shows there — the normal wallet list does.
const DEEPLINKS = [
  { name: "Phantom", base: "https://phantom.app/ul/browse/" },
  { name: "Solflare", base: "https://solflare.com/ul/v1/browse/" },
  { name: "Backpack", base: "https://backpack.app/ul/v1/browse/" },
] as const;

const deeplinkUrl = (base: string) =>
  `${base}${encodeURIComponent(window.location.href)}?ref=${encodeURIComponent(window.location.origin)}`;

export function WalletModal() {
  const { wallets, address, override, error, modalOpen, closeModal, connect, disconnect, saveEndpoint } = useWallet();
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  // Hydrated after mount, mirroring the provider's idiom, so the server and
  // first client render agree (SSR shows the desktop message; the deeplinks
  // appear at the same moment window.location exists).
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration of browser-only state
    setMobile(isMobileUa());
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (modalOpen && !element.open) element.showModal();
    if (!modalOpen && element.open) element.close();
  }, [modalOpen]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (saveEndpoint(field.current?.value ?? "") && address) closeModal();
  }

  return (
    <dialog
      ref={dialog}
      aria-label="Wallet"
      // Escape and the close button both fire `close`, so state syncs here
      // rather than in every handler.
      onClose={closeModal}
      // The dialog element's own box is the backdrop once padding is removed,
      // so a click that lands on it and not on the panel is a click outside.
      onClick={(event) => {
        if (event.target === dialog.current) closeModal();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">
            {address ? "Wallet" : "Connect a wallet"}
          </h2>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close"
            className="rounded-full px-2 py-1 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            ✕
          </button>
        </div>

        {address ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised px-3 py-2.5">
            <span className="font-mono text-sm">{shorten(address)}</span>
            <button type="button" onClick={() => void disconnect()} className={ACTION}>
              Disconnect
            </button>
          </div>
        ) : wallets.length === 0 ? (
          mobile ? (
            <>
              <p className="text-sm text-ink-muted">
                No wallet can reach this browser. Open this page inside your wallet&apos;s own
                browser instead:
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {DEEPLINKS.map(({ name, base }) => (
                  <li key={name}>
                    {/* A plain navigation, deliberately: universal links must
                        be a real user click for the OS to hand them to the app. */}
                    <a href={deeplinkUrl(base)} className={ROW}>
                      <span className="font-medium">Open in {name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              No Solana wallet detected. Install Phantom, Solflare or Backpack, then reload this
              page.
            </p>
          )
        ) : (
          <ul className="flex flex-col gap-2">
            {wallets.map((candidate) => (
              <li key={candidate.name}>
                <button type="button" onClick={() => void connect(candidate)} className={ROW}>
                  <span
                    aria-hidden
                    // A data URI from the wallet, as a background rather than
                    // an <img>, keeping no-img-element intact.
                    style={{ backgroundImage: `url("${candidate.icon}")` }}
                    className="size-6 shrink-0 rounded-md bg-surface bg-contain bg-center bg-no-repeat"
                  />
                  <span className="font-medium">{candidate.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submit} className="mt-5 border-t border-line pt-4">
          <label htmlFor="wallet-rpc" className="block text-xs text-ink-muted">
            Your own Solana RPC endpoint, if you would rather not use ours. Optional, stored in
            this browser only, and used for blockhashes and transaction confirmations.
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="wallet-rpc"
              ref={field}
              // Uncontrolled, remounted each time the dialog opens, so the saved
              // override is restored and an abandoned edit does not linger.
              key={String(modalOpen)}
              defaultValue={override}
              placeholder="Using the built-in endpoint"
              inputMode="url"
              className={INPUT}
            />
            <button type="submit" className={ACTION}>
              {override ? "Update" : "Use mine"}
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="mt-3 text-xs text-brand">
            {error}
          </p>
        )}
      </div>
    </dialog>
  );
}
