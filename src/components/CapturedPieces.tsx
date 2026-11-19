import type { Chess } from "chess.js";
import { capturedPieces } from "@/lib/game-presentation";
import { Piece } from "./Piece";

export function CapturedPieces({ game, mine }: { game: Chess; mine: "w" | "b" }) {
  const captured = capturedPieces(game);
  const other = mine === "w" ? "b" : "w";
  return <div className="captured-tray">
    <div className="captured-row">{captured[mine].map((type, i) => <Piece key={i} color={other} type={type} />)}</div>
  </div>;
}