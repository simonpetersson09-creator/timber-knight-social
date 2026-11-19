export function Piece({ color, type, className = "" }: { color: "w" | "b"; type: string; className?: string }) {
  return <img src={`/pieces/${color}${type}.webp`} alt="" draggable={false} className={`piece-img ${className}`} />;
}
