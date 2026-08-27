"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_ENDPOINT,
  isValidEndpoint,
  readOverride,
  writeOverride,
} from "@/lib/rpc-endpoint";
import {
  connect as connectWallet,
  disconnect as disconnectWallet,
  listWallets,
  onAccountsChange,
  onWalletsChange,
  type SolanaWallet,
  type WalletAccount,
} from "@/lib/wallet";
import { WalletModal } from "./wallet-modal";

/**
 * Everything wallet-shaped, held once for the whole app so the navbar, the
 * raffle pages and the dev harness all read the same connection.
 *
 * Unlike dressme's provider this one holds no holdings reads — raffles has no
 * consumer for them yet. When raffle eligibility needs `ownedMints`, dressme's
 * wallet-provider is the reference implementation of the keyed-read idiom to
 * reintroduce (store the result against the key of the inputs that produced
 * it; derive loading and error rather than resetting them in effects).
 */
type WalletState = {
  wallets: SolanaWallet[];
  wallet: SolanaWallet | null;
  /**
   * The authorised account, kept whole: signing must present it (with its
   * publicKey bytes) back to the wallet.
   */
  account: WalletAccount | null;
  /** The account's address — most consumers only render it. */
  address: string | null;
  /** The endpoint in use, default or override. */
  endpoint: string;
  /** The holder's own endpoint, or "" when they are on the shipped default. */
  override: string;
  error: string | null;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  connect: (wallet: SolanaWallet) => Promise<void>;
  disconnect: () => Promise<void>;
  saveEndpoint: (value: string) => boolean;
};

const WalletContext = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const state = useContext(WalletContext);
  if (!state) throw new Error("useWallet must be used inside <WalletProvider>");
  return state;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<SolanaWallet[]>([]);
  const [wallet, setWallet] = useState<SolanaWallet | null>(null);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  // "" means the shipped default; the state holds only a holder's own override
  // so the server and first client render agree.
  const [override, setOverride] = useState("");
  const endpoint = override || DEFAULT_ENDPOINT;
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const address = account?.address ?? null;

  // Wallets register asynchronously and localStorage is browser-only, so both
  // are read after hydration rather than during render.
  useEffect(() => {
    const saved = readOverride();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration of browser-only state
    setWallets(listWallets());
    setOverride(saved);
    return onWalletsChange(setWallets);
  }, []);

  // The holder can switch or lock accounts inside the wallet while we are
  // open. The listener replaces the whole account object, not just the
  // address: a transaction signed after a switch must carry the *new*
  // account's key, and wallets match the account we pass back to
  // signAndSendTransaction against what they authorised.
  useEffect(() => {
    if (!wallet) return;
    return onAccountsChange(wallet, ([next]) => setAccount(next ?? null));
  }, [wallet]);

  const connect = useCallback(async (candidate: SolanaWallet) => {
    setConnectionError(null);
    try {
      const [first] = await connectWallet(candidate);
      if (!first) {
        setConnectionError("That wallet did not share an account.");
        return;
      }
      setWallet(candidate);
      setAccount(first);
    } catch {
      setConnectionError("Connection was declined.");
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (wallet) await disconnectWallet(wallet).catch(() => {});
    setWallet(null);
    setAccount(null);
    setConnectionError(null);
  }, [wallet]);

  /** An empty value clears the override and returns to the shipped default. */
  const saveEndpoint = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed && !isValidEndpoint(trimmed)) {
      setConnectionError("That does not look like an https:// endpoint.");
      return false;
    }
    writeOverride(trimmed);
    setOverride(trimmed);
    setConnectionError(null);
    return true;
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      wallets,
      wallet,
      account,
      address,
      endpoint,
      override,
      error: connectionError,
      modalOpen,
      openModal: () => setModalOpen(true),
      closeModal: () => setModalOpen(false),
      connect,
      disconnect,
      saveEndpoint,
    }),
    [wallets, wallet, account, address, endpoint, override, connectionError, modalOpen, connect, disconnect, saveEndpoint],
  );

  // A fragment, deliberately: <body> is a flex column whose children are the
  // header, main and footer, and a wrapper element would break that. A closed
  // <dialog> is display:none, so the modal adds no layout either.
  return (
    <WalletContext value={value}>
      {children}
      <WalletModal />
    </WalletContext>
  );
}
