import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Pressable, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import gameRules from './src/game';
import AnimatedCard from './src/ui/AnimatedCard';
import TurnClock from './src/ui/TurnClock';
import ReactionBubble from './src/ui/ReactionBubble';
import RoundTable from './src/ui/RoundTable';
import reactionEvents from './src/presentation/reactions';
import useCloudHistory from './src/services/useCloudHistory';
import { LinearGradient } from 'expo-linear-gradient';

const { SUITS, newMatch, beginRound, topCard, playable, playCard, drawOrAccept, botMove } = gameRules;
const C = { background: '#071D18', panel: '#12372C', panelLight: '#214B3C', mint: '#E9C880', gold: '#E9C880', cream: '#FFF5DF', muted: '#A8C0B3', red: '#F08578', green: '#68C7A1' };

function Button({ title, onPress, secondary = false, disabled = false, style, trailing = false }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, disabled && styles.disabled, pressed && !disabled && { opacity: 0.75 }, style]}>
    <View style={styles.buttonLabel}><Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{title}</Text>{trailing && <View style={[styles.chevron, secondary && { borderColor: C.cream }]} />}</View>
  </Pressable>;
}

function suitName(suit) { return ({ '♠': 'Spades', '♥': 'Hearts', '♦': 'Diamonds', '♣': 'Clubs' })[suit]; }

function App() {
  const [screen, setScreen] = useState('home');
  const [name, setName] = useState('Player');
  const [bots, setBots] = useState(1);
  const [match, setMatch] = useState(null);
  const [jackId, setJackId] = useState(null);
  const { history, status: cloudStatus, busy: cloudBusy, refresh: refreshHistory, save: saveHistory } = useCloudHistory();
  const matchId = useRef('');
  const [reaction, setReaction] = useState(null);
  const recorded = useRef(false);
  const previousMatch = useRef(null);
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 850, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 850, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [glow]);

  useEffect(() => {
    if (!match || match.phase !== 'playing' || !match.players[match.turn].bot) return;
    const timer = setTimeout(() => setMatch((old) => old?.phase === 'playing' && old.players[old.turn].bot ? botMove(old) : old), 1300);
    return () => clearTimeout(timer);
  }, [match]);

  useEffect(() => {
    if (!match || match.phase !== 'gameEnd' || recorded.current) return;
    recorded.current = true;
    const winner = match.players.find((player) => player.id === match.matchWinnerId);
    saveHistory({ id: matchId.current, winner: winner?.name || 'Unknown', humanScore: match.players[0].score,
      rounds: match.round, players: match.players.length, completedAt: Date.now(),
      scores: match.players.map((p) => ({ name: p.name, score: p.score })) });
  }, [match]);

  useEffect(() => {
    const prev = previousMatch.current;
    previousMatch.current = match;
    const event = reactionEvents.reactionForMove(prev, match);
    if (event) setReaction({ ...event, id: Date.now() });
  }, [match]);

  useEffect(() => {
    if (!reaction) return;
    const timer = setTimeout(() => setReaction(null), 3200);
    return () => clearTimeout(timer);
  }, [reaction]);

  useEffect(() => { if (!match || match.players[match.turn]?.id !== 'human') setJackId(null); }, [match?.turn, match?.moveCount]);

  function start() {
    recorded.current = false;
    matchId.current = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    previousMatch.current = null;
    setJackId(null);
    setReaction(null);
    setMatch(newMatch(bots, name));
    setScreen('game');
  }

  function play(card, suit = null) {
    if (!match || match.phase !== 'playing' || match.players[match.turn].id !== 'human') return;
    if (!playable(match, card)) return;
    if (card.rank === 'J' && match.players[0].hand.length > 1 && !suit) {
      setJackId(card.id);
      return;
    }
    setMatch((old) => playCard(old, 'human', card.id, suit));
    setJackId(null);
  }

  const humanTurn = match?.phase === 'playing' && match.players[match.turn].id === 'human';
  const human = match?.players[0];
  const pending = match?.pending;
  const actionText = pending?.type === 'skip' ? 'Accept skip' : pending ? `Draw ${pending.amount}` : 'Draw 1';

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" backgroundColor={C.background} />
    {screen === 'home' && <ScrollView contentContainerStyle={styles.home}>
      <LinearGradient colors={['#285E47', '#0D3025']} style={{ padding: 24, borderRadius: 32, borderWidth: 1, borderColor: '#A98944', marginBottom: 22 }}>
        <Text style={styles.eyebrow}>THE EMERALD CLUB</Text>
        <Text style={[styles.hero, { fontSize: 44 }]}>Suit Sprint<Text style={{ color: C.gold }}> 502</Text></Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 24, paddingBottom: 20, gap: 9 }}>
          {['♠','♥','♣'].map((suit, i) => <AnimatedCard key={suit} card={{ rank: ['A','7','J'][i], suit }} index={i} total={3} playable={i === 1} />)}
        </View>
        <Text style={[styles.subHero, { marginBottom: 0 }]}>Take your seat. Play your hand. Send the pressure back.</Text>
      </LinearGradient>
      <View style={styles.setupPanel}>
        <Text style={styles.label}>YOUR NAME</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={18}
          placeholder="Player" placeholderTextColor={C.muted} autoCapitalize="words" />
        <Text style={styles.label}>COMPUTER OPPONENTS</Text>
        <View style={styles.stepper}>
          <Button title="−" secondary disabled={bots === 1} onPress={() => setBots((n) => n - 1)} style={styles.stepperButton} />
          <Text style={styles.stepperValue}>{bots}</Text>
          <Button title="+" secondary disabled={bots === 5} onPress={() => setBots((n) => n + 1)} style={styles.stepperButton} />
        </View>
        <Text style={styles.helper}>{bots + 1} players total · 7 cards each</Text>
        <Button title="START MATCH" trailing onPress={start} style={styles.startButton} />
      </View>
      <View style={styles.homeActions}>
        <Button title="Rules" secondary onPress={() => setScreen('rules')} style={styles.homeAction} />
        <Button title="History ☁" secondary onPress={() => { setScreen('history'); refreshHistory(); }} style={styles.homeAction} />
      </View>
      <Text style={styles.footer}>A fresh mobile design for the 502 card game</Text>
    </ScrollView>}

    {screen === 'rules' && <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>HOW TO PLAY</Text><Text style={styles.title}>The rules of 502</Text>
      <Rule title="Your turn" body="Play one card matching the middle card by suit or value, or draw one card and end your turn. You may draw even if you can play. Jacks and the 7♥ are wild." />
      <Rule title="Action cards" body="A 2 makes the next player draw 2. More 2s stack. A♠ makes the next player draw 5; another Ace passes that penalty without increasing it. An 8 skips the next player; another 8 passes the skip. A Jack names the suit for the next player. The 7♥ ends the round immediately." />
      <Rule title="Penalty turns" body="When a draw penalty or skip is pending, only the matching response card can be played. Otherwise accept the penalty. Jacks and 7♥ cannot cancel a penalty." />
      <Rule title="Scoring" body="7♥ and A♠: 100 each. Any 2, 8 or Jack: 30. Other Aces: 20. 10, Queen or King: 10. Other cards: 5. Remaining cards score even when 7♥ wins the round." />
      <Rule title="Winning" body="The round ends when someone plays their last card or the 7♥. Scores carry between rounds. At 502 points, a player is eliminated, except the round winner, who is protected that round. The last player remaining wins." />
      <Button title="BACK" onPress={() => setScreen(match ? 'game' : 'home')} />
    </ScrollView>}

    {screen === 'history' && <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>YOUR SCOREBOOK</Text><Text style={styles.title}>Match history</Text>
      <Text style={styles.muted}>{cloudStatus}</Text>
      <Button title={cloudBusy ? 'SYNCING…' : 'RETRY / REFRESH'} disabled={cloudBusy} secondary onPress={refreshHistory} style={{ marginVertical: 16 }} />
      {history.length === 0 ? <Text style={styles.empty}>No finished matches yet.</Text> : history.map((item, i) =>
        <View key={i} style={styles.resultItem}><Text style={styles.resultTitle}>{item.winner} won</Text>
          <Text style={styles.muted}>{item.rounds} rounds · {item.players} players · Your score {item.humanScore}</Text>
          <Text style={styles.resultDate}>{new Date(item.completedAt).toLocaleString()} · {item.synced ? '☁ Saved to cloud' : 'Saved on device · pending sync'}</Text>
          {item.scores?.map((p, index) => <Text key={index} style={styles.muted}>{p.name}: {p.score} points</Text>)}
        </View>)}
      <Button title="BACK" onPress={() => setScreen(match ? 'game' : 'home')} style={styles.backButton} />
    </ScrollView>}

    {screen === 'game' && match && <View style={styles.gamePage}>
      <View style={styles.gameHeader}>
        <View><Text style={styles.eyebrow}>✦  SUIT SPRINT</Text><Text style={styles.roundLabel}>THE ARENA <Text style={{ color: C.mint }}>502</Text></Text></View>
        <View style={{ flexDirection: 'row' }}>
          <Pressable onPress={() => setScreen('rules')} style={styles.rulesLink}><Text style={styles.rulesLinkText}>RULES</Text></Pressable>
          <Pressable onPress={start} style={styles.rulesLink}><Text style={styles.rulesLinkText}>RESTART</Text></Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.gameScroll}>
        <View style={styles.arenaMeta}><Text style={styles.arenaMetaText}>ROUND {match.round}  ·  {match.players.filter((p) => p.active).length} PLAYERS LEFT</Text>
          <TurnClock turnKey={`${match.round}-${match.moveCount || 0}`} active={match.phase === 'playing'} onExpire={() => {
            setMatch((old) => old?.phase === 'playing' && old.players[old.turn].id === 'human' ? drawOrAccept(old, 'human') : old);
          }} /></View>
        <RoundTable match={match} reaction={reaction} canDraw={humanTurn} onDraw={() => setMatch((old) => drawOrAccept(old, 'human'))} />
        <ReactionBubble reaction={reaction} />
        <Animated.View style={[styles.turnBanner, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }]}>
          <Text style={styles.turnText}>{match.phase === 'playing' ? (humanTurn ? 'YOUR TURN' : `${match.players[match.turn].name.toUpperCase()} IS PLAYING`) : 'ROUND COMPLETE'}</Text>
          <Text style={styles.turnHint}>{match.phase === 'playing' ? pending?.type === 'two' ? `Stack a 2 or draw ${pending.amount}`
            : pending?.type === 'ace' ? 'Pass the 5-card penalty with an Ace or draw 5'
            : pending?.type === 'skip' ? 'Pass the skip with an 8 or accept it'
            : match.declaredSuit ? `Declared suit: ${suitName(match.declaredSuit)}`
            : 'Match suit or value · or draw one card' : match.message}</Text>
        </Animated.View>
        {humanTurn && <Button title={actionText.toUpperCase()} secondary onPress={() => setMatch((old) => drawOrAccept(old, 'human'))} style={styles.drawButton} />}
        <View style={styles.handHeader}><View><Text style={styles.label}>YOUR HAND  ·  {human.hand.length} CARDS</Text><Text style={styles.handTip}>Glowing cards are ready to play</Text></View><Text style={styles.myScore}>{human.score} / 502</Text></View>
        {!human.active && <Text style={styles.eliminatedText}>You have been eliminated. Watch the remaining bots finish.</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hand}>{human.hand.map((card, index) =>
          <AnimatedCard key={card.id} card={card} index={index} total={human.hand.length}
            playable={humanTurn && playable(match, card)} onPress={humanTurn && playable(match, card) ? () => play(card) : null} />)}</ScrollView>
        <View style={styles.reactionBar}>{['😂','😎','😱','🔥','👏'].map((emoji) => <Pressable key={emoji} onPress={() => setReaction({ id: Date.now(), playerId: 'human', name: human.name, emoji, caption: 'Your reaction' })} style={styles.reactionButton}><Text style={styles.reactionEmoji}>{emoji}</Text></Pressable>)}</View>
        <Text style={styles.message}>{match.message}</Text>
      </ScrollView>
      {match.phase !== 'playing' && <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.eyebrow}>{match.phase === 'gameEnd' ? 'MATCH COMPLETE' : `ROUND ${match.round} COMPLETE`}</Text>
          <Text style={styles.modalTitle}>{match.phase === 'gameEnd' ? `${match.players.find((p) => p.id === match.matchWinnerId)?.name} wins!` : `${match.players.find((p) => p.id === match.winnerId)?.name} wins the round`}</Text>
          <ScrollView style={styles.scoreList}>{match.roundResult?.scores.map((row) => <View key={row.id} style={styles.scoreRow}>
            <Text style={styles.scoreName}>{row.name}{!row.active ? ' · OUT' : ''}</Text>
            <Text style={styles.scoreValues}>+{row.added}   TOTAL {row.total}</Text>
          </View>)}</ScrollView>
          {match.phase === 'roundEnd' ? <Button title="NEXT ROUND" trailing onPress={() => setMatch((old) => beginRound(old))} />
            : <Button title="PLAY AGAIN" onPress={start} />}
          <Button title="HOME" secondary onPress={() => setScreen('home')} style={styles.modalSecondary} />
        </View>
      </View>}
      {jackId && <View style={styles.overlay}><View style={styles.modal}>
        <Text style={styles.eyebrow}>WILD JACK</Text><Text style={styles.modalTitle}>Choose the next suit</Text>
        <View style={styles.suitChoices}>{SUITS.map((suit) => <Pressable key={suit} accessibilityRole="button" accessibilityLabel={suitName(suit)}
          onPress={() => play(human.hand.find((card) => card.id === jackId), suit)} style={styles.suitChoice}>
          <Text style={[styles.suitChoiceText, { color: suit === '♥' || suit === '♦' ? C.red : C.cream }]}>{suit}</Text>
          <Text style={styles.suitChoiceLabel}>{suitName(suit)}</Text></Pressable>)}</View>
        <Button title="CANCEL" secondary onPress={() => setJackId(null)} />
      </View></View>}
    </View>}
  </SafeAreaView>;
}

function Rule({ title, body }) { return <View style={styles.ruleCard}><Text style={styles.ruleTitle}>{title}</Text><Text style={styles.ruleBody}>{body}</Text></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background, width: '100%', maxWidth: 760, alignSelf: 'center' },
  home: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  brandMark: { width: 82, height: 82, borderRadius: 24, backgroundColor: C.mint, justifyContent: 'center', alignItems: 'center', marginBottom: 20, transform: [{ rotate: '-7deg' }] },
  brandMarkText: { color: C.background, fontSize: 29, fontWeight: '900' },
  eyebrow: { color: C.mint, letterSpacing: 2.2, fontWeight: '800', fontSize: 11 },
  hero: { color: C.cream, fontSize: 38, lineHeight: 43, fontWeight: '900', marginTop: 10, maxWidth: 320 },
  subHero: { color: C.muted, fontSize: 15, lineHeight: 23, marginTop: 14, marginBottom: 24 },
  setupPanel: { backgroundColor: C.panel, borderRadius: 24, padding: 20 },
  label: { color: C.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: '800' },
  input: { backgroundColor: C.panelLight, color: C.cream, borderRadius: 12, paddingHorizontal: 14, height: 50, fontSize: 17, marginTop: 10, marginBottom: 20 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  stepperButton: { width: 52, height: 48, paddingHorizontal: 0 },
  stepperValue: { width: 60, textAlign: 'center', color: C.cream, fontSize: 24, fontWeight: '800' },
  helper: { color: C.muted, marginTop: 9, fontSize: 12 },
  button: { backgroundColor: C.mint, borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  chevron: { width: 9, height: 9, borderRightWidth: 2, borderBottomWidth: 2, borderColor: C.background, transform: [{ rotate: '-45deg' }] },
  buttonText: { color: C.background, fontWeight: '900', letterSpacing: 0.5, fontSize: 14 },
  secondaryButton: { backgroundColor: C.panelLight }, secondaryButtonText: { color: C.cream }, disabled: { opacity: 0.35 },
  startButton: { marginTop: 20 }, homeActions: { flexDirection: 'row', gap: 10, marginTop: 12 }, homeAction: { flex: 1 },
  footer: { color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 24 },
  page: { padding: 24, paddingBottom: 40 }, title: { color: C.cream, fontSize: 32, fontWeight: '900', marginTop: 8, marginBottom: 20 },
  muted: { color: C.muted, lineHeight: 21 }, ruleCard: { backgroundColor: C.panel, borderRadius: 16, padding: 17, marginBottom: 11 },
  ruleTitle: { color: C.gold, fontSize: 16, fontWeight: '800', marginBottom: 6 }, ruleBody: { color: C.cream, lineHeight: 21, fontSize: 14 },
  empty: { color: C.muted, textAlign: 'center', marginVertical: 70 }, resultItem: { backgroundColor: C.panel, padding: 16, borderRadius: 16, marginBottom: 10 },
  resultTitle: { color: C.cream, fontSize: 18, fontWeight: '800', marginBottom: 5 }, resultDate: { color: C.muted, fontSize: 11, marginTop: 6 }, backButton: { marginTop: 18 },
  gamePage: { flex: 1 }, gameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, backgroundColor: '#0C2B22' },
  roundLabel: { color: C.cream, fontWeight: '900', fontSize: 19, marginTop: 3, letterSpacing: 1 }, rulesLink: { padding: 8 }, rulesLinkText: { color: C.mint, fontSize: 11, fontWeight: '900' },
  gameScroll: { paddingBottom: 36 }, arenaMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 15 },
  arenaMetaText: { color: C.gold, fontWeight: '900', letterSpacing: 1.2, fontSize: 11 },
  opponents: { gap: 10, paddingHorizontal: 20, paddingVertical: 16 },
  opponent: { width: 120, backgroundColor: '#261C48', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#4B3C6E' },
  currentOpponent: { borderColor: C.mint, backgroundColor: '#30465F' }, eliminated: { opacity: 0.45 }, opponentAvatar: { color: C.gold, fontSize: 25 },
  opponentName: { color: C.cream, fontWeight: '800', fontSize: 13, marginTop: 4 }, opponentMeta: { color: C.muted, fontSize: 11, marginTop: 2 },
  score: { color: C.gold, fontWeight: '800', fontSize: 12, marginTop: 8 },
  turnBanner: { backgroundColor: C.panelLight, borderRadius: 18, padding: 15, marginHorizontal: 20, marginTop: 4, borderLeftWidth: 4, borderLeftColor: C.mint },
  turnText: { color: C.mint, fontWeight: '900', letterSpacing: 1.5, fontSize: 12 }, turnHint: { color: C.cream, fontSize: 13, marginTop: 5 },
  arenaSurface: { marginHorizontal: 18, marginTop: 17, borderRadius: 28, backgroundColor: '#222E53', borderWidth: 2, borderColor: '#55467B', paddingTop: 14, paddingBottom: 12, overflow: 'hidden' },
  surfaceTitle: { color: C.gold, textAlign: 'center', letterSpacing: 2, fontSize: 11, fontWeight: '900' },
  surfaceNote: { color: C.mint, textAlign: 'center', fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginTop: 2 },
  table: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 42, marginTop: 18, marginBottom: 8 },
  pile: { alignItems: 'center', minWidth: 95 }, pileLabel: { color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 10 },
  drawStack: { width: 80, height: 118, borderRadius: 13, borderWidth: 3, borderColor: C.mint, backgroundColor: '#583D9A', justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-6deg' }] },
  drawStackSymbol: { color: C.mint, fontSize: 30 }, drawStackNumber: { color: C.cream, fontSize: 12, fontWeight: '800' },
  drawButton: { marginHorizontal: 20, marginTop: 12, marginBottom: 12 }, handHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 12, marginBottom: 18 },
  handTip: { color: C.muted, fontSize: 11, marginTop: 5 },
  myScore: { color: C.gold, fontSize: 13, fontWeight: '800' }, hand: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 21, paddingTop: 24, paddingBottom: 8 },
  reactionBar: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 15 },
  reactionButton: { backgroundColor: C.panelLight, width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  reactionEmoji: { fontSize: 22 },
  message: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 20 },
  eliminatedText: { color: C.red, textAlign: 'center', paddingHorizontal: 20, marginBottom: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,15,24,0.83)', justifyContent: 'center', padding: 22 },
  modal: { backgroundColor: C.panel, borderRadius: 24, padding: 22, maxHeight: '90%' }, modalTitle: { color: C.cream, fontSize: 26, fontWeight: '900', marginTop: 10, marginBottom: 15 },
  scoreList: { maxHeight: 260, marginBottom: 14 }, scoreRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.panelLight },
  scoreName: { color: C.cream, fontSize: 13, flex: 1 }, scoreValues: { color: C.gold, fontWeight: '800', fontSize: 13 }, modalSecondary: { marginTop: 9 },
  suitChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 16 }, suitChoice: { width: '47%', alignItems: 'center', backgroundColor: C.panelLight, borderRadius: 14, padding: 12 },
  suitChoiceText: { fontSize: 31, fontWeight: '800' }, suitChoiceLabel: { color: C.cream, fontSize: 12, marginTop: 3 },
});

export default App;
