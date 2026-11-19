import { Bot } from "lucide-react";
import { PlayerAvatar } from "./PlayerAvatar";

export function GamePlayerCard({ name, avatar, computer, time, active, low, color }: {
  name: string; avatar?: string | undefined; computer?: boolean; time: string;
  active?: "you" | "opp" | undefined; low?: boolean; color: "w" | "b";
}) {
  return <div className="game-player-card" data-active={active} data-piece={color}>
    <span className="game-player-photo">{computer ? <Bot /> : <PlayerAvatar avatar={avatar} />}</span>
    <span className="game-player-name" title={name}>{name}</span>
    <span className="clock" data-running={!!active} data-low={low}>{time}</span>
  </div>;
}
