import { getWallets } from "@wallet-standard/app";
import { base58Encode } from "@/lib/base58";
import { CHAIN, type SolanaChain } from "@/lib/cluster";

/**
 * Wallet Standard discovery and signing. dressme's copy of this file only
 * reads an address; raffles also signs, so connect() keeps the full account
 * objects — signAndSendTransaction takes the account (with its publicKey
 * bytes) back, not a bare address string. Still one small dependency, still
 * structural types.
 */

const CONNECT = "standard:connect";
const DISCONNECT = "standard:disconnect";
const EVENTS = "standard:events";
const SIGN_AND_SEND = "solana:signAndSendTransaction";

/**
 * The slice of a Wallet Standard account we actually touch. `publicKey` is
 * the 32 raw bytes of the address, which is exactly what the transaction
 * builder needs — decoding the base58 address would be a pointless roundtrip.
 */
export type WalletAccount = {
  readonly address: string;
  readonly publicKey: Uint8Array;
  readonly chains: readonly string[];
  readonly features: readonly string[];
};

/**
 * The slice of the standard we actually touch. Declared structurally rather
 * than imported so the app does not take a second dependency for types.
 */
export type SolanaWallet = {
  readonly name: string;
  readonly icon: string;
  readonly chains: readonly string[];
  readonly features: Readonly<Record<string, unknown>>;
  readonly accounts: readonly WalletAccount[];
};

type ConnectFeature = { connect: () => Promise<{ accounts: readonly WalletAccount[] }> };
type DisconnectFeature = { disconnect: () => Promise<void> };
type EventsFeature = { on: (event: "change", listener: () => void) => () => void };
// The spec input also allows `options` (preflightCommitment, skipPreflight,
// maxRetries, minContextSlot); we send none and let the wallet default.
type SignAndSendFeature = {
  signAndSendTransaction: (input: {
    account: WalletAccount;
    transaction: Uint8Array;
    chain: SolanaChain;
  }) => Promise<readonly { signature: Uint8Array }[]>;
};

/**
 * A wallet must list the chain this build is configured for, and must be able
 * to sign — this app exists to send transactions, so a read-only wallet in
 * the chooser would connect and then dead-end at every action. In practice
 * Phantom, Solflare and Backpack all register mainnet, devnet and testnet, so
 * the same filter works on both clusters; a wallet that omits devnet is
 * correctly hidden on a devnet build, because handing it a devnet chain
 * string would only make signAndSendTransaction throw later.
 */
function isSolanaWallet(wallet: SolanaWallet): boolean {
  return wallet.chains.includes(CHAIN) && CONNECT in wallet.features && SIGN_AND_SEND in wallet.features;
}

/** Registered Solana wallets right now. Empty during SSR and before hydration. */
export function listWallets(): SolanaWallet[] {
  if (typeof window === "undefined") return [];
  // Through unknown: the library brands account publicKeys as ReadonlyUint8Array
  // (Uint8Array minus the mutators), which our plainer structural type does not
  // name. The runtime object is a real Uint8Array either way.
  return (getWallets().get() as unknown as readonly SolanaWallet[]).filter(isSolanaWallet);
}

/**
 * Wallets register asynchronously, and a holder may install one with the tab
 * open, so the list is a subscription rather than a one-shot read.
 */
export function onWalletsChange(listener: (wallets: SolanaWallet[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const wallets = getWallets();
  const emit = () => listener(listWallets());
  const off = [wallets.on("register", emit), wallets.on("unregister", emit)];
  return () => off.forEach((remove) => remove());
}

/** Prompts the wallet and returns the accounts it authorised, if any. */
export async function connect(wallet: SolanaWallet): Promise<readonly WalletAccount[]> {
  const feature = wallet.features[CONNECT] as ConnectFeature | undefined;
  if (!feature) throw new Error(`${wallet.name} cannot connect`);
  const { accounts } = await feature.connect();
  return accounts;
}

/** Not every wallet implements disconnect; where it does not, forgetting locally is enough. */
export async function disconnect(wallet: SolanaWallet): Promise<void> {
  const feature = wallet.features[DISCONNECT] as DisconnectFeature | undefined;
  await feature?.disconnect();
}

/**
 * Fires when the holder switches or locks accounts inside the wallet. Full
 * account objects, not addresses: after a switch, the *new* account must be
 * the one presented back to signAndSendTransaction.
 */
export function onAccountsChange(
  wallet: SolanaWallet,
  listener: (accounts: readonly WalletAccount[]) => void,
): () => void {
  const feature = wallet.features[EVENTS] as EventsFeature | undefined;
  if (!feature) return () => {};
  return feature.on("change", () => listener(wallet.accounts));
}

/**
 * Signs with the wallet and lets the wallet broadcast — one approval popup,
 * no sendTransaction RPC on our side. The spec returns the raw 64-byte
 * signature; everything downstream (getSignatureStatuses, the explorer)
 * speaks base58, so it is encoded here and the bytes never escape.
 */
export async function signAndSendTransaction(
  wallet: SolanaWallet,
  account: WalletAccount,
  chain: SolanaChain,
  transaction: Uint8Array,
): Promise<string> {
  const feature = wallet.features[SIGN_AND_SEND] as SignAndSendFeature | undefined;
  if (!feature) throw new Error(`${wallet.name} cannot sign transactions`);
  const [result] = await feature.signAndSendTransaction({ account, transaction, chain });
  if (!result) throw new Error(`${wallet.name} returned no signature`);
  return base58Encode(result.signature);
}
