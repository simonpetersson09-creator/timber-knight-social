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
    <div className="captured-row">{Array.from({ length: 15 }, (_, i) => {
      const type = captured[mine][i];
      return <span key={i} data-type={type} data-empty={type ? undefined : true} className={type && i >= initial.current ? "captured-new" : undefined}>
        {type && <Piece color={other} type={type} />}
      </span>;
    })}</div>
  </div>;
}