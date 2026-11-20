import { Chess } from "chess.js";

export type ChessColor = "w" | "b";
export type AutomaticDrawReason = "threefold" | "fifty" | "seventyFive" | "stalemate" | "insufficient";

export const otherColor = (color: ChessColor): ChessColor => color === "w" ? "b" : "w";

/**
 * The app adjudicates threefold repetition and fifty moves automatically.
 * Seventy-five moves takes precedence, while a mating move always wins first.
 */
export function automaticDrawReason(game: Chess): AutomaticDrawReason | null {
  if (game.isCheckmate()) return null;
  const halfmoves = Number(game.fen().split(" ")[4] ?? 0);
  if (halfmoves >= 150) return "seventyFive";
  if (game.isThreefoldRepetition()) return "threefold";
  if (game.isDrawByFiftyMoves()) return "fifty";
  if (game.isStalemate()) return "stalemate";
  if (game.isInsufficientMaterial()) return "insufficient";
  return null;
}

/** FIDE timeout rule: a player with no possible mating sequence cannot win on time. */
export function canPossiblyMate(game: Chess, attacker: ChessColor): boolean {
  const pieces = game.board().flat().filter((piece): piece is NonNullable<typeof piece> => !!piece);
  const own = pieces.filter((piece) => piece.color === attacker && piece.type !== "k");
  if (!own.length) return false;
  if (own.some((piece) => piece.type === "p" || piece.type === "r" || piece.type === "q")) return true;

  const defenders = pieces.some((piece) => piece.color !== attacker && piece.type !== "k");
  const bishops = own.filter((piece) => piece.type === "b");
  const knights = own.filter((piece) => piece.type === "n");
  if (knights.length >= 2 || (bishops.length && knights.length)) return true;
  if (bishops.length >= 2) {
    // Two same-coloured bishops cannot mate a lone king; any defender may self-block.
    if (defenders) return true;
    const squareColors = new Set(bishops.map((piece) => {
      const file = piece.square.charCodeAt(0) - 97;
      const rank = Number(piece.square[1]) - 1;
      return (file + rank) % 2;
    }));
    return squareColors.size === 2;
  }
  // A lone bishop or knight cannot mate a lone king, but enemy material can block escape.
  return defenders;
}

/** Returns the winner on time, or null when the opponent cannot possibly mate. */
export function timeoutWinner(game: Chess, flagFallen: ChessColor): ChessColor | null {
  const opponent = otherColor(flagFallen);
  return canPossiblyMate(game, opponent) ? opponent : null;
}
