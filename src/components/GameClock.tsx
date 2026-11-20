import { Clock3 } from "lucide-react";

export function GameClock({ time, active, low, color }: {
  time: string; active?: "you" | "opp" | undefined; low?: boolean; color: "w" | "b";
}) {
  return <div className="game-clock" data-active={active} data-piece={color} data-running={!!active} data-low={low}><Clock3 className="size-4" aria-hidden="true" /><span>{time}</span></div>;
}
