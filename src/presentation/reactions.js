// Presentation events only. This module never changes the game state.
function reactionForMove(before, after) {
  if (!before || !after || before === after || before.round !== after.round || before.phase !== 'playing' || after.moveCount === before.moveCount) return null;
  const actor = before.players[before.turn];
  if (!actor.bot) return null;
  const gained = after.players[before.turn].hand.length - actor.hand.length;
  const target = after.players[after.turn];
  const played = after.discardPile[after.discardPile.length - 1];
  const isReturn = before.pending && gained === -1 && target.id === 'human' &&
    ((before.pending.type === 'ace' && played.rank === 'A') || (before.pending.type === 'two' && played.rank === '2'));
  if (isReturn) return { playerId: actor.id, name: actor.name, emoji: '😂', caption: 'Nice try! Back to you.', kind: 'return', amount: before.pending.type === 'ace' ? 5 : before.pending.amount + 2 };
  if (gained >= 4) return { playerId: actor.id, name: actor.name, emoji: '😤', caption: `${gained} cards?! You got me.`, kind: 'draw', amount: gained };
  return null;
}
module.exports = { reactionForMove };
