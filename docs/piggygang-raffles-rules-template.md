---
schema: "piggygang-raffles-rules/1"
cluster: "{{cluster}}"
program: "{{program}}"
raffle: "{{raffle}}"
creator: "{{creator}}"
organizer:
  name: "{{organizer.name}}"
  contact: "{{organizer.contact}}"
title: "{{title}}"
prize:
  mint: "{{prize.mint}}"
  amount: "{{prize.amount}}"
  display: "{{prize.display}}"
  escrow: "{{prize.escrow}}"
ends_at: "{{ends_at}}"
entry:
  cap: {{entry.cap}}
  full_gang_bonus: {{entry.full_gang_bonus}}
claim_window_days: {{claim_window_days}}
min_age: {{min_age}}
terms_url: "{{terms_url}}"
lang: "{{lang}}"
---

# Official rules — {{title}}

**This is a free prize game (*nagradna igra*).** Nothing is bought, paid or burned to enter or to win. The only cost is the Solana network fee for your own transactions, and the small account deposit you front comes back to you when the raffle is settled or cancelled and your entry accounts close.

## 1. Organizer

The organizer is {{organizer.name}}, contact {{organizer.contact}}. The organizer created this raffle from the Solana wallet `{{creator}}`.

## 2. The raffle

- Raffle account: `{{raffle}}` on Solana {{cluster}}, run by program `{{program}}`.
- The raffle opens when its creation transaction is confirmed on Solana. That time is recorded on-chain and shown on the raffle page.
- The raffle closes at {{ends_at}} (UTC). The program rejects entries claimed after that moment.

## 3. Prize

The prize is {{prize.display}} (asset `{{prize.mint}}`, amount {{prize.amount}} in base units). It is held in escrow account `{{prize.escrow}}` from the moment the raffle is created. Only the program can release it: to the winner, or back to the organizer in the cases sections 6, 7 and 9 describe.

## 4. Who can enter

- You must be at least {{min_age}} years old.
- You must hold, in the wallet you enter with, at least one NFT from the Piggy SOL Gang, Piggy Girl Gang or Piggy Gang collections, as the program recognises them on-chain. Look-alike NFTs don't count.
- NFTs that are listed for sale, escrowed, staked or otherwise held outside your wallet don't count.
- The organizer's wallet `{{creator}}` can't enter this raffle.

## 5. How to enter

- Entering is free. You claim entries on raffles.piggygang.net, or directly on-chain, by signing a transaction with your wallet. You pay only the network fee (about 0.0001 SOL per transaction). You also front a small account deposit (rent), which is returned to you once the raffle is settled or cancelled.
- Each eligible NFT you enter earns 1 entry, up to {{entry.cap}} entries per wallet.
- **Full Gang bonus:** enter at least one NFT from each of the three collections and you receive {{entry.full_gang_bonus}} extra entries, once per wallet. The bonus comes on top of the cap, so one wallet can hold at most {{entry.cap}} + {{entry.full_gang_bonus}} entries. An NFT entered after you reach the cap earns no entry itself, but still counts toward the Full Gang set.
- Each NFT can be entered once in this raffle, whoever holds it. Entries stand once claimed: selling an NFT afterwards doesn't remove your entries, and its new holder can't enter it again in this raffle.

## 6. How the winner is drawn

- After the raffle closes, anyone can trigger the draw. If there are no entries, there is no draw, and the prize returns to the organizer.
- The program requests a random number from Switchboard On-Demand, a verifiable randomness service whose result comes with a public proof. The winning entry is the random number modulo the total number of entries, and the wallet holding that entry wins.
- There is one winner. Anyone can check the draw: the raffle page and the winners page link the randomness proof and the draw transaction, and the winning entry can be recomputed from them.

## 7. Claiming the prize

- The winner is announced by wallet address on the raffle page and the winners page.
- The winner claims the prize by signing with the winning wallet within {{claim_window_days}} days of the draw. The prize is transferred to that wallet.
- If the prize isn't claimed in time, it returns to the organizer. There is no redraw.

## 8. Prize tax

Where a prize is taxable, the PiggyGang DAO handles the organizer's tax obligations off-chain. The DAO may ask the winner for the details it requires. Those details are never written on-chain.

## 9. Cancellation and pauses

- Until the draw is requested, the PiggyGang DAO admin may cancel the raffle, with the reason recorded on-chain. All entries are then void, the prize returns to the organizer, and deposits are refunded.
- Once the draw has been requested, the admin may cancel only after the randomness service has failed to deliver for 7 days, in the same way and with the same outcome.
- A pause can delay claiming entries and the draw. It never extends the closing time, and never blocks a prize claim or a deposit refund.

## 10. These rules

- These rules are fixed when the raffle is created. Their SHA-256 fingerprint is recorded in the raffle account, so nobody can change them afterwards. On Solana mainnet this document is stored permanently on Arweave; on devnet, which is for testing, the copy may be purged after about three days. The raffle page shows whether the copy you are reading matches the fingerprint.
- These rules apply together with the terms of service at {{terms_url}}.
- Questions go to {{organizer.contact}}.
- On-chain, the raffle records people by wallet address only, never by name or other personal data. The published rules document also carries the organizer's name, contact and description.

## About this raffle — from the organizer

The text below is the organizer's description. It can't change sections 1–10.

{{description}}
