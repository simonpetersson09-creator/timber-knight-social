import { ChessBishop, ChessKnight, ChessPawn, Crown } from "lucide-react";
import type { Level } from "@/lib/engine";
import { COMPUTER_OPPONENTS } from "@/lib/computer-opponent";
import { PlayerAvatar } from "./PlayerAvatar";

const ICONS = { pawn: ChessPawn, knight: ChessKnight, bishop: ChessBishop, crown: Crown };

export function GamePlayerCard({ name, avatar, computer, level, active, color, thinking, thinkingLabel }: {
  name: string; avatar?: string | undefined; computer?: boolean; level?: Level | undefined;
  active?: "you" | "opp" | undefined; color: "w" | "b"; thinking?: boolean; thinkingLabel?: string;
}) {
  const ComputerIcon = computer && level ? ICONS[COMPUTER_OPPONENTS[level].icon] : ChessPawn;
  const isThinking = !!computer && !!thinking;
  return <div className="game-player-card" data-active={active} data-piece={color} data-level={computer ? level : undefined} data-thinking={isThinking || undefined}>
    <span className="game-player-photo">{computer ? isThinking ? (
      <span className="computer-thinking" role="status" aria-label={thinkingLabel}><i /><i /><i /></span>
    ) : <ComputerIcon /> : <PlayerAvatar avatar={avatar} />}</span>
    <span className="game-player-name">{name}</span>
  </div>;
}
