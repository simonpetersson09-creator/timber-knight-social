export const PIECE_ASSET_VERSION = "20261119-7";

export function Piece({ color, type, className = "" }: { color: "w" | "b"; type: string; className?: string }) {
  return <img src={`/pieces/${color}${type}.webp?v=${PIECE_ASSET_VERSION}`} alt="" draggable={false} decoding="sync" className={`piece-img ${className}`} />;
}

export const PIECE_URLS = ["w", "b"].flatMap((c) => ["k", "q", "r", "b", "n", "p"].map((t) => `/pieces/${c}${t}.webp?v=${PIECE_ASSET_VERSION}`));
