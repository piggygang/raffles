import { base58Decode } from "@/lib/base58";

/** SPL Memo v2 — the program the wallet-test memo writes through. */
const MEMO_PROGRAM = base58Decode("MemoSq4gqABAXKb96qnH8TySNcWxMyWCqXgDLGmfcHr");

/**
 * Compact-u16 ("shortvec"): little-endian base-128 with a continuation bit.
 * Every length in the wire format uses it; ours are all single-byte, but the
 * loop is the spec and costs nothing.
 */
function shortvec(length: number): number[] {
  const bytes: number[] = [];
  let rest = length;
  for (;;) {
    const byte = rest & 0x7f;
    rest >>= 7;
    if (rest === 0) return [...bytes, byte];
    bytes.push(byte | 0x80);
  }
}

/**
 * A legacy Solana transaction carrying one Memo instruction, hand-serialized:
 * two accounts and one instruction do not justify a transaction library, and
 * the house rule keeps web3.js (and its Buffer polyfill) out of the bundle.
 *
 * `payer` is the account's publicKey bytes straight from Wallet Standard —
 * the address string would only be decoded back into exactly these bytes.
 */
export function buildMemoTransaction(payer: Uint8Array, recentBlockhash: string, memo: string): Uint8Array {
  if (payer.length !== 32) throw new Error("Payer public key must be 32 bytes.");
  const blockhash = base58Decode(recentBlockhash);
  if (blockhash.length !== 32) throw new Error("Blockhash must decode to 32 bytes.");
  const data = new TextEncoder().encode(memo);

  const message = [
    // Header: 1 required signature (the payer), 0 read-only signed accounts,
    // 1 read-only unsigned account (the Memo program itself).
    1, 0, 1,
    ...shortvec(2), ...payer, ...MEMO_PROGRAM,
    ...blockhash,
    ...shortvec(1),
    1, // program id index → Memo
    // No instruction accounts: the payer's signature over this whole message
    // already binds the memo text to them, and Memo would treat any account
    // we pass as one more signer to verify — cost without information.
    ...shortvec(0),
    ...shortvec(data.length), ...data,
  ];

  // Wire form: signature count, then one zero-filled 64-byte slot the wallet
  // overwrites after signing — byte-identical to web3.js's own serialization
  // of an unsigned transaction, which is why the major wallets accept it.
  return new Uint8Array([...shortvec(1), ...new Array<number>(64).fill(0), ...message]);
}
