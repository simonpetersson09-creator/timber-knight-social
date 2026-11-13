const imgs = import.meta.glob("../assets/pieces/*.webp", { eager: true, import: "default" }) as Record<string, string>;

export function Piece({ color, type, className = "" }: { color: "w" | "b"; type: string; className?: string }) {
  return <img src={imgs[`../assets/pieces/${color}${type}.webp`]} alt="" draggable={false} className={`piece-img ${className}`} />;
}
