# Aurelis Protocol Specification

**Status:** DRAFT (Locked for Implementation Phase 1)
**Version:** 1.0.0

## 1. General Info
- **Name:** Aurelis
- **Symbol:** AUC
- **Consensus:** Proof of Work (PoW)
- **Hashing Algorithm:** SHA-256d (Double SHA-256)

## 2. Supply & Emission
- **Total Supply Cap:** 5,000,000,000 AUC (5 Billion)
- **Unit Subdivision:** 10^8 (Satoshis equivalent, let's call them "Aurels")
- **Block Time Target:** 120 seconds (2 minutes)
- **Initial Block Reward:** 2,500 AUC
- **Halving Interval:** 1,000,000 blocks (approx. 3.8 years)
  - *Calculation:* 2500 * 2 * 1,000,000 = 5,000,000,000 AUC.
- **Coinbase Maturity:** 100 blocks
- **Premine/Genesis Treasury:** None (unless explicitly amended in `genesis.md`). Emission is purely uniform.

## 3. Difficulty Adjustment
- **Algorithm:** Standard moving average or bounded adjustment.
- **Retarget Interval:** 2016 blocks (approx. 2.8 days @ 2 min/block).
- **Adjustment Limits:** Max 4x increase, max 4x decrease per retarget.

## 4. Block & Transaction Format
- **Block Header:**
  - `version` (int32)
  - `prev_block_hash` (32 bytes)
  - `merkle_root` (32 bytes)
  - `timestamp` (uint32)
  - `bits` (uint32, compact target)
  - `nonce` (uint32)
- **Transactions:** UTXO Model.
  - Inputs: TxID + index + scriptSig.
  - Outputs: Value (int64) + scriptPubKey.
  - Signatures: secp256k1 ECDSA.

## 5. Address Format
- **Prefix:** `AUR`
- **Encoding:** Base58Check
- **Payload:** `RIPEMD160(SHA256(PubKey))` (20 bytes)
- **Example:** `AUR...` (Follows regex `^AUR[1-9A-HJ-NP-Za-km-z]{25,34}$`)

## 6. Networking
- **P2P Port:** 18888 (Mainnet), 28888 (Testnet)
- **RPC Port:** 18883 (Mainnet), 28883 (Testnet)
- **Magic Bytes:** 0xA0 0x52 0x45 0x4C ('A' 'R' 'E' 'L' with high bit tweaks, tentative `0xD9B4BEF9` standard or custom `0x41555245` "AURE") -> Decision: `0x41555245` ("AURE")

## 7. Fees
- **Structure:** Fee per byte (Satoshis/byte).
- **Minimum Relay Fee:** 1 Satoshi/byte.
