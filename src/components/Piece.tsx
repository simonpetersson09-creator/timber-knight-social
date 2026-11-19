const PIECE_ASSET_VERSION = "20261119-5";

export function Piece({ color, type, className = "" }: { color: "w" | "b"; type: string; className?: string }) {
  return <img src={`/pieces/${color}${type}.webp?v=${PIECE_ASSET_VERSION}`} alt="" draggable={false} className={`piece-img ${className}`} />;
}
