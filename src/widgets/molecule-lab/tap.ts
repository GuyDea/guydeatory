/**
 * What a tap on an atom does: pick it, let go of it, join it to the picked atom, or explain why they
 * cannot join. Pure, so it is tested without a browser (tests/widgets/molecule-lab-tap.test.ts).
 */
import { bond, freeValence } from './model.ts';
import type { Board, Link, Refusal } from './model.ts';

export type TapOutcome =
  /** Nothing (still on the board) was picked: the tapped atom is picked now. */
  | { kind: 'picked'; picked: number }
  /** The picked atom was tapped again: nothing is picked now. */
  | { kind: 'unpicked'; picked: null }
  /** The picked atom and the tapped one cannot join (`atom` stopped it): the tapped atom is picked instead. */
  | { kind: 'refused'; picked: number; reason: Refusal; atom?: number }
  /**
   * The picked atom `a` joined the tapped atom `b`. `a` stays picked while it has free bonds (pick C,
   * then H, H, H, H), so picking `b` again shares one more pair: `raise` is the bond order that
   * would make, or null if they cannot share more.
   */
  | { kind: 'joined'; picked: number | null; a: number; b: number; board: Board; link: Link; raise: number | null };

export function tap(board: Board, picked: number | null, id: number): TapOutcome {
  if (picked === null || !board.atoms.some((atom) => atom.id === picked)) return { kind: 'picked', picked: id };
  if (picked === id) return { kind: 'unpicked', picked: null };
  const outcome = bond(board, picked, id);
  if (!outcome.ok) {
    return outcome.atom === undefined
      ? { kind: 'refused', picked: id, reason: outcome.reason }
      : { kind: 'refused', picked: id, reason: outcome.reason, atom: outcome.atom };
  }
  const stays = freeValence(outcome.board, picked) > 0;
  const again = stays ? bond(outcome.board, picked, id) : null;
  return {
    kind: 'joined',
    picked: stays ? picked : null,
    a: picked,
    b: id,
    board: outcome.board,
    link: outcome.link,
    raise: again?.ok ? again.link.order : null,
  };
}
