import { useRef } from "react";
import type { Chess } from "chess.js";
import { capturedPieces } from "@/lib/game-presentation";
import { Piece } from "./Piece";

export function CapturedPieces({ game, mine }: { game: Chess; mine: "w" | "b" }) {
  const captured = capturedPieces(game);
  const other = mine === "w" ? "b" : "w";
  // Pieces already captured at mount show at once; later ones wait for the flying piece to land.
  const initial = useRef(captured[mine].length);
  return <div className="captured-tray" data-owner={mine}>
    <div className="captured-row">{captured[mine].map((type, i) => <span key={i} data-type={type} className={i >= initial.current ? "captured-new" : undefined}><Piece color={other} type={type} /></span>)}</div>
  </div>;
}