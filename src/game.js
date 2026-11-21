const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function deck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ id: `${rank}${suit}`, rank, suit })));
}

function shuffle(cards, rng = Math.random) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isSevenHearts(card) { return card.rank === '7' && card.suit === '♥'; }
function isAceSpades(card) { return card.rank === 'A' && card.suit === '♠'; }
function isNeutralStart(card) {
  return card.rank !== '2' && card.rank !== 'J' && card.rank !== 'A' && !isSevenHearts(card);
}

function points(card) {
  if (isSevenHearts(card) || isAceSpades(card)) return 100;
  if (['2', '8', 'J'].includes(card.rank)) return 30;
  if (card.rank === 'A') return 20;
  if (['10', 'Q', 'K'].includes(card.rank)) return 10;
  return 5;
}

function handPoints(hand) { return hand.reduce((sum, card) => sum + points(card), 0); }

function nextActive(players, index) {
  for (let step = 1; step <= players.length; step++) {
    const next = (index + step) % players.length;
    if (players[next].active) return next;
  }
  return index;
}

function beginRound(base, rng = Math.random) {
  const players = base.players.map((player) => ({ ...player, hand: [] }));
  const cards = shuffle(deck(), rng);
  for (let n = 0; n < 7; n++) {
    for (const player of players) if (player.active) player.hand.push(cards.pop());
  }
  let start = cards.pop();
  while (!isNeutralStart(start)) {
    cards.unshift(start);
    start = cards.pop();
  }
  const previousWinner = players.findIndex((player) => player.id === base.winnerId && player.active);
  return {
    ...base, players, drawPile: cards, discardPile: [start], declaredSuit: null,
    pending: null, turn: previousWinner >= 0 ? previousWinner : players.findIndex((p) => p.active),
    phase: 'playing', round: (base.round || 0) + 1, roundResult: null,
    message: `Round ${(base.round || 0) + 1} begins`, passes: 0, moveCount: 0,
  };
}

function newMatch(botCount = 1, humanName = 'You', rng = Math.random) {
  if (!Number.isInteger(botCount) || botCount < 1 || botCount > 5) throw new Error('Choose 1 to 5 bots');
  const cleanName = humanName.trim().slice(0, 18) || 'You';
  const players = [
    { id: 'human', name: cleanName, bot: false, active: true, score: 0, hand: [] },
    ...Array.from({ length: botCount }, (_, i) => ({ id: `bot${i + 1}`, name: `Bot ${i + 1}`, bot: true, active: true, score: 0, hand: [] })),
  ];
  return beginRound({ players, round: 0, winnerId: null, matchWinnerId: null }, rng);
}

function topCard(state) { return state.discardPile[state.discardPile.length - 1]; }

function playable(state, card) {
  if (state.phase !== 'playing') return false;
  if (state.pending) {
    if (state.pending.type === 'two') return card.rank === '2';
    if (state.pending.type === 'ace') return card.rank === 'A';
    return card.rank === '8';
  }
  if (isSevenHearts(card) || card.rank === 'J') return true;
  if (state.declaredSuit) return card.suit === state.declaredSuit;
  const top = topCard(state);
  return card.suit === top.suit || card.rank === top.rank;
}

function refillDraw(state, rng = Math.random) {
  if (state.drawPile.length || state.discardPile.length <= 1) return state;
  return { ...state, drawPile: shuffle(state.discardPile.slice(0, -1), rng), discardPile: [topCard(state)] };
}

function drawCards(state, playerIndex, count, rng = Math.random) {
  let next = state;
  const players = state.players.map((player) => ({ ...player, hand: [...player.hand] }));
  for (let n = 0; n < count; n++) {
    next = refillDraw(next, rng);
    if (!next.drawPile.length) break;
    const drawPile = [...next.drawPile];
    players[playerIndex].hand.push(drawPile.pop());
    next = { ...next, drawPile };
  }
  return { ...next, players };
}

function finishRound(state, winnerIndex, finalCard, rng = Math.random) {
  let next = state;
  const winner = state.players[winnerIndex];
  if (winner.hand.length === 0 && (finalCard.rank === '2' || isAceSpades(finalCard))) {
    const victimIndex = nextActive(state.players, winnerIndex);
    next = drawCards(next, victimIndex, finalCard.rank === '2' ? state.pending.amount : 5, rng);
  }
  const players = next.players.map((player) => {
    const added = player.active ? handPoints(player.hand) : 0;
    const score = player.score + added;
    return { ...player, score, active: player.active && (player.id === winner.id || score < 502), added };
  });
  const survivors = players.filter((player) => player.active);
  const matchWinnerId = survivors.length === 1 ? survivors[0].id : null;
  return {
    ...next, players, winnerId: winner.id, matchWinnerId,
    phase: matchWinnerId ? 'gameEnd' : 'roundEnd', pending: null,
    roundResult: { winnerId: winner.id, finalCardId: finalCard.id, scores: players.map((p) => ({ id: p.id, name: p.name, added: p.added, total: p.score, active: p.active })) },
    message: `${winner.name} won round ${state.round}`,
  };
}

function playCard(state, playerId, cardId, chosenSuit, rng = Math.random) {
  if (state.phase !== 'playing' || state.players[state.turn].id !== playerId) return state;
  const hand = state.players[state.turn].hand;
  const card = hand.find((item) => item.id === cardId);
  if (!card || !playable(state, card)) return state;
  if (card.rank === 'J' && hand.length > 1 && !SUITS.includes(chosenSuit)) return state;
  const players = state.players.map((player, i) => i === state.turn
    ? { ...player, hand: player.hand.filter((item) => item.id !== card.id) } : player);
  const next = {
    ...state, players, discardPile: [...state.discardPile, card],
    declaredSuit: card.rank === 'J' ? (chosenSuit || card.suit) : null,
    pending: card.rank === '2' ? { type: 'two', amount: (state.pending?.type === 'two' ? state.pending.amount : 0) + 2 }
      : isAceSpades(card) ? { type: 'ace', amount: 5 }
      : state.pending?.type === 'ace' && card.rank === 'A' ? { type: 'ace', amount: 5 }
      : card.rank === '8' ? { type: 'skip', amount: 0 } : null,
    turn: nextActive(players, state.turn), passes: 0,
    message: `${state.players[state.turn].name} played ${card.id}`, moveCount: (state.moveCount || 0) + 1,
  };
  if (players[state.turn].hand.length === 0 || isSevenHearts(card)) return finishRound(next, state.turn, card, rng);
  return next;
}

function drawOrAccept(state, playerId, rng = Math.random) {
  if (state.phase !== 'playing' || state.players[state.turn].id !== playerId) return state;
  const count = state.pending?.type === 'skip' ? 0 : state.pending?.amount || 1;
  const before = state.players[state.turn].hand.length;
  const drawn = count ? drawCards(state, state.turn, count, rng) : state;
  const received = drawn.players[state.turn].hand.length - before;
  return {
    ...drawn, pending: null, turn: nextActive(state.players, state.turn),
    passes: received ? 0 : state.passes + 1, moveCount: (state.moveCount || 0) + 1,
    message: state.pending?.type === 'skip' ? `${state.players[state.turn].name} was skipped`
      : `${state.players[state.turn].name} drew ${received} card${received === 1 ? '' : 's'}`,
  };
}

function bestSuit(hand) {
  return SUITS.reduce((best, suit) =>
    hand.filter((card) => card.suit === suit).length > hand.filter((card) => card.suit === best).length ? suit : best, SUITS[0]);
}

function botMove(state, rng = Math.random) {
  if (state.phase !== 'playing' || !state.players[state.turn].bot) return state;
  const hand = state.players[state.turn].hand;
  const choices = hand.filter((card) => playable(state, card));
  if (!choices.length) return drawOrAccept(state, state.players[state.turn].id, rng);
  const sorted = [...choices].sort((a, b) => {
    if (hand.length === 1) return 0;
    if (isSevenHearts(a)) return 1;
    if (isSevenHearts(b)) return -1;
    return points(b) - points(a);
  });
  const card = sorted[0];
  const remaining = hand.filter((item) => item.id !== card.id);
  return playCard(state, state.players[state.turn].id, card.id, card.rank === 'J' ? bestSuit(remaining) : null, rng);
}

module.exports = { SUITS, RANKS, deck, shuffle, points, handPoints, nextActive, newMatch, beginRound, topCard, playable, playCard, drawOrAccept, botMove, bestSuit, isNeutralStart };
