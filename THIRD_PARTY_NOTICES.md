# Mr B Chess — third-party and media notices

Scope: Stockfish and application media/fonts reviewed for release readiness. This is an evidence inventory, not legal certification or a complete dependency-license audit.

## Stockfish

Stockfish.js 18 — copyright 2026 Chess.com, LLC. Based on Stockfish by T. Romstad, M. Costalba, J. Kiiski, G. Linscott and other contributors. The local header states GPLv3. Network credit in the header: Linmiao Xu (linrock).

- https://github.com/nmrugg/stockfish.js
- https://github.com/official-stockfish/Stockfish
- Local full GPLv3 text: [public/engine/COPYING.txt](public/engine/COPYING.txt)
- Deployed license location: `/engine/COPYING.txt`
- Source references, pinned tag/commit, build instructions and limitations: [public/engine/SOURCE.md](public/engine/SOURCE.md)
- Deployed source notice location: `/engine/SOURCE.md`

The GPL text is present. Exact corresponding-source provenance of the distributed JS/WASM remains unresolved; see SOURCE.md.

## Fonts

`src/routes/__root.tsx` requests Bodoni Moda, Inter and Space Grotesk through Google Fonts. `src/styles.css` references those families and system fallback fonts. No local font binaries were found in the reviewed application media inventory.

The following upstream font license files identify SIL Open Font License 1.1:

| Family | Upstream copyright | License text |
| --- | --- | --- |
| Inter | Copyright 2020 The Inter Project Authors | https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt |
| Bodoni Moda | Copyright 2020 The Bodoni Moda Project Authors | https://github.com/google/fonts/blob/main/ofl/bodonimoda/OFL.txt |
| Space Grotesk | Copyright 2020 The Space Grotesk Project Authors | https://github.com/google/fonts/blob/main/ofl/spacegrotesk/OFL.txt |

These references verify family-level license declarations, not immutable versions or hashes of Google Fonts responses. If fonts are bundled or self-hosted later, retain the exact font files, copyright statements and full applicable OFL text with that release. System fallback fonts are not asserted to be bundled or licensed by this app.

## Images and graphics

| Asset | Verified observation | Rights/provenance status |
| --- | --- | --- |
| `public/pieces/{w,b}{k,q,b,n,r,p}.webp` | Twelve WebP files used by `src/components/Piece.tsx` | Creator, original source and license unverified |
| `src/assets/wood-light.jpg` | Referenced by board CSS | Creator, original source and license unverified |
| `src/assets/wood-dark.jpg` | Referenced by board CSS | Creator, original source and license unverified |
| `src/assets/chess-mascot.png.asset.json` | Hosted asset pointer; original filename `chess-mascot-ebony-pawn.png`; used by BrandIcon and root metadata | Creator, creation method, original source and license unverified |

A filename, hosted asset ID, visual style or test label such as “Mr B Signature pieces” is not ownership or licensing evidence. No reviewed graphic is certified here as original, commissioned, AI-generated, public domain or covered by a particular image license.

Native icons and splash assets are outside this review's provenance determination; no ownership or license conclusion is made for them.

## External provenance required

Before media release sign-off, obtain creator/source records and explicit distribution rights for the pieces, both wood textures and mascot. For commissioned or generated artwork, retain the relevant agreements, creation records and applicable service terms, including any third-party inputs. Record required attribution and modification restrictions.

The existing piece tests validate file structure and component usage, not copyright ownership or permission.
