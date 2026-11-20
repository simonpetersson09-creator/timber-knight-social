# Stockfish – source and release evidence

This document records verified references and unresolved provenance. It is not legal certification or a declaration of GPL compliance.

## Distributed files

- `/engine/stockfish.js`: Stockfish.js 18, copyright 2026 Chess.com, LLC; GPLv3. Credits: T. Romstad, M. Costalba, J. Kiiski, G. Linscott and other Stockfish contributors. SHA-256: `5243fd9b276cab7dfe3ad1d43ab9ead73568fac76468c614242977a210c4a391`.
- `/engine/COPYING.txt`: full GPL version 3 text. SHA-256: `0b383d5a63da644f628d99c33976ea6487ed89aaa59f0b3257992deac1171e6b`.
- `src/assets/stockfish-wasm.asset.json` identifies `stockfish-18-lite.wasm`, declared size 7,295,411 bytes, asset ID `cd01dc5a-9e9e-4a2b-85a3-555b5da866db`. These metadata do not verify binary provenance.
- `src/lib/stockfish.ts` passes the asset URL to the JavaScript worker.

## Verified upstream references

- JavaScript port: https://github.com/nmrugg/stockfish.js
- Underlying engine: https://github.com/official-stockfish/Stockfish
- Verified tag: `v18.0.0`
- Tag commit: `31a98753a5d932511693f44775da908377c24513`
- Tag evidence: https://api.github.com/repos/nmrugg/stockfish.js/git/ref/tags/v18.0.0
- Pinned source: https://github.com/nmrugg/stockfish.js/tree/31a98753a5d932511693f44775da908377c24513
- Source archive: https://github.com/nmrugg/stockfish.js/archive/31a98753a5d932511693f44775da908377c24513.tar.gz
- License: https://github.com/nmrugg/stockfish.js/blob/31a98753a5d932511693f44775da908377c24513/Copying.txt
- Build instructions: https://github.com/nmrugg/stockfish.js/blob/31a98753a5d932511693f44775da908377c24513/README.md
- Build script: https://github.com/nmrugg/stockfish.js/blob/31a98753a5d932511693f44775da908377c24513/build.js

These are corresponding-source reference candidates, not proof that this commit is the corresponding source of the distributed JS/WASM. The exact distributed build commit and underlying Stockfish revision remain unverified.

## Neural network

The local JavaScript header credits Linmiao Xu (linrock) and links:
https://tests.stockfishchess.org/nns?network_name=nn-9067e33176e

The pinned upstream `src/lite_nets.h` specifies `nn-9067e33176e8.nnue`:
https://github.com/nmrugg/stockfish.js/blob/31a98753a5d932511693f44775da908377c24513/src/lite_nets.h

This verifies upstream's network identifier, not the actual contents of the remotely stored WASM. No separate network license is inferred here.

## Rebuild procedure from the verified upstream source

The pinned README specifies Emscripten 3.1.7 on PATH. With Git, Node.js and that toolchain available:

```sh
git clone https://github.com/nmrugg/stockfish.js.git
cd stockfish.js
git checkout --detach 31a98753a5d932511693f44775da908377c24513
node build.js --help
node build.js --all
```

The build script also exposes lite and single-threaded variants. This procedure was not executed during this review. Bit-for-bit reproducibility and the exact variant, flags, patches and toolchain used for this application's files are unknown.

## Required external provenance before release sign-off

Obtain and retain:

- The actual WASM bytes and SHA-256.
- Exact build commit, local changes, variant, build command and toolchain.
- Evidence matching both distributed JS and WASM to those sources.
- Network payload identity and applicable distribution terms.
- A complete, durable corresponding-source package or appropriate source distribution arrangement covering the actual shipped build.

Keep GPLv3 text and copyright notices with distributions. Verify source and license accessibility in each release artifact. A generic upstream link alone does not establish satisfaction of GPL corresponding-source obligations.
