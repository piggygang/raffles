/**
 * Base58 (Bitcoin alphabet), the only encoding Solana speaks for addresses,
 * blockhashes and signatures. BigInt base conversion rather than manual
 * byte-array long division: at 32–64 byte inputs the difference is
 * unmeasurable and this version fits on one screen.
 */
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58Encode(bytes: Uint8Array): string {
  let n = 0n;
  for (const byte of bytes) n = (n << 8n) | BigInt(byte);
  let out = "";
  for (; n > 0n; n /= 58n) out = ALPHABET[Number(n % 58n)] + out;
  // Leading zero bytes carry no place value, so the conversion drops them;
  // base58 restores each as a literal "1".
  for (const byte of bytes) {
    if (byte !== 0) break;
    out = "1" + out;
  }
  return out;
}

export function base58Decode(text: string): Uint8Array {
  let n = 0n;
  for (const char of text) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Not a base58 string.");
    n = n * 58n + BigInt(index);
  }
  const bytes: number[] = [];
  for (; n > 0n; n >>= 8n) bytes.unshift(Number(n & 0xffn));
  for (const char of text) {
    if (char !== "1") break;
    bytes.unshift(0);
  }
  return new Uint8Array(bytes);
}
