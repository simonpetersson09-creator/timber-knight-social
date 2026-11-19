import { Bot } from "lucide-react";
import { PlayerAvatar } from "./PlayerAvatar";

export function GamePlayerCard({ name, avatar, computer, active, color }: {
  name: string; avatar?: string | undefined; computer?: boolean;
  active?: "you" | "opp" | undefined; color: "w" | "b";
}) {
  return <div className="game-player-card" data-active={active} data-piece={color}>
    <span className="game-player-photo">{computer ? <Bot /> : <PlayerAvatar avatar={avatar} />}</span>
    <span className="game-player-name">{name}</span>
  </div>;
}
