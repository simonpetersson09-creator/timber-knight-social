import icon from "@/assets/chess-mascot.png.asset.json";

export function BrandIcon({ className = "" }: { className?: string }) {
  return <img src={icon.url} alt="Mr B Chess – bonde med hatt och monokel" className={`brand-icon ${className}`} />;
}