import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedCard from './AnimatedCard';

const AVATARS = ['🕵️', '🦊', '🐼', '🦁', '🤖', '🐯'];

function Seat({ player, index, current, reaction, x, y }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!current) { pulse.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 750, useNativeDriver: true }),
    ])); animation.start(); return () => animation.stop();
  }, [current]);
  return <View style={[s.seat, { left: x - 43, top: y - 42 }, !player.active && { opacity: 0.4 }]}>
    <View style={s.avatarArea}>
      {current && <Animated.View style={[s.ring, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0.15] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }] }]} />}
      <LinearGradient colors={current ? ['#F5D88D', '#B18135'] : ['#39564E', '#182E29']} style={s.avatar}><Text style={s.face}>{AVATARS[index]}</Text></LinearGradient>
      <Text style={s.count}>{player.active ? player.hand.length : 'OUT'}</Text>
    </View>
    <Text numberOfLines={1} style={s.name}>{index === 0 ? 'YOU' : player.name}</Text>
    <Text style={s.score}>{player.score} pts</Text>
    {index > 0 && player.active && <View style={s.miniHand}>{Array.from({ length: Math.min(player.hand.length, 5) }, (_, i) => <View key={i} style={[s.miniCard, { transform: [{ rotate: `${(i - 2) * 8}deg` }] }]} />)}</View>}
    {reaction?.playerId === player.id && <View style={s.emote}><Text style={{ fontSize: 29 }}>{reaction.emoji}</Text></View>}
  </View>;
}

export default function RoundTable({ match, reaction, canDraw, onDraw }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width - 16, 660);
  const h = 418;
  const centerX = w / 2;
  const bots = match.players.slice(1);
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 550, useNativeDriver: true }).start();
  }, [match.moveCount, match.round]);
  const top = match.discardPile[match.discardPile.length - 1];
  return <View style={[s.stage, { width: w, height: h }]}>
    <LinearGradient colors={['#BE944E', '#745126', '#D2B36E']} style={[s.rail, { left: w * 0.1, width: w * 0.8 }]}>
      <LinearGradient colors={['#236D56', '#124B3B', '#0A3028']} style={s.felt}>
        <View style={s.stitch} />
        <Text style={s.watermark}>S U I T  S P R I N T</Text>
        <Text style={s.tableNumber}>502</Text>
      </LinearGradient>
    </LinearGradient>
    <View style={[s.centerCards, { left: centerX - 85 }]}>
      <Pressable accessibilityLabel="Draw or accept penalty" disabled={!canDraw} onPress={onDraw} style={s.deck}>
        <Text style={s.deckPattern}>♠</Text><Text style={s.deckCount}>{match.drawPile.length}</Text>
      </Pressable>
      <Animated.View style={{ transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-45, 0] }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '8deg'] }) }] }}>
        <AnimatedCard key={`${match.round}-${match.moveCount}`} card={top} compact />
      </Animated.View>
    </View>
    {match.pending && <View style={[s.penalty, { left: centerX - 64 }]}><Text style={s.penaltyText}>{match.pending.type === 'skip' ? 'SKIP TURN' : `DRAW +${match.pending.amount}`}</Text></View>}
    {bots.map((player, i) => {
      const angle = bots.length === 1 ? -Math.PI / 2 : -Math.PI + 0.22 + i * (Math.PI - 0.44) / (bots.length - 1);
      return <Seat key={player.id} player={player} index={i + 1} current={match.phase === 'playing' && match.turn === i + 1} reaction={reaction}
        x={centerX + Math.cos(angle) * (w * 0.39)} y={188 + Math.sin(angle) * 139} />;
    })}
    <Seat player={match.players[0]} index={0} current={match.phase === 'playing' && match.turn === 0} reaction={reaction} x={centerX} y={361} />
    {reaction?.kind === 'return' && <View pointerEvents="none" style={s.returnBanner}><Text style={s.returnText}>↩ RETURN TO SENDER  +{reaction.amount}</Text></View>}
  </View>;
}

const s = StyleSheet.create({
  stage: { alignSelf: 'center', marginTop: 6 },
  rail: { position: 'absolute', top: 79, height: 269, borderRadius: 145, padding: 7, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 18, elevation: 10 },
  felt: { flex: 1, borderRadius: 140, alignItems: 'center', overflow: 'hidden' },
  stitch: { position: 'absolute', inset: 10, borderRadius: 130, borderWidth: 1, borderStyle: 'dashed', borderColor: '#A4C5A34A' },
  watermark: { color: '#78AA8B', fontSize: 8, letterSpacing: 2, marginTop: 43 }, tableNumber: { color: '#81AF8A22', fontSize: 100, fontWeight: '900', position: 'absolute', bottom: 18 },
  centerCards: { position: 'absolute', top: 158, flexDirection: 'row', alignItems: 'center', gap: 20 },
  deck: { width: 63, height: 96, backgroundColor: '#17342D', borderColor: '#D5B16B', borderWidth: 3, borderRadius: 9, transform: [{ rotate: '-8deg' }], alignItems: 'center', justifyContent: 'center' },
  deckPattern: { color: '#D5B16B', fontSize: 38 }, deckCount: { color: '#F9EED5', fontWeight: '900', fontSize: 12 },
  seat: { position: 'absolute', width: 86, alignItems: 'center' }, avatarArea: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#C4A364' },
  face: { fontSize: 28 }, ring: { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#F3D18D' },
  name: { color: '#F7EEDC', fontSize: 11, fontWeight: '800', marginTop: 2, maxWidth: 85 }, score: { color: '#A4BCB1', fontSize: 10, marginTop: 1 },
  count: { position: 'absolute', right: -5, bottom: -1, backgroundColor: '#D9B76F', color: '#102B22', borderRadius: 8, paddingHorizontal: 5, fontSize: 10, fontWeight: '900' },
  miniHand: { flexDirection: 'row', marginTop: 4, height: 16 }, miniCard: { width: 12, height: 17, borderRadius: 2, backgroundColor: '#345D4C', borderColor: '#D6B46A', borderWidth: 1, marginLeft: -3 },
  emote: { position: 'absolute', top: -14, right: -10, backgroundColor: '#FFF2CF', borderRadius: 16, padding: 4, elevation: 20 },
  penalty: { position: 'absolute', top: 286, width: 128, backgroundColor: '#F4D18B', paddingVertical: 6, borderRadius: 12 }, penaltyText: { textAlign: 'center', color: '#2C281C', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  returnBanner: { position: 'absolute', bottom: 6, alignSelf: 'center', backgroundColor: '#D7AF61', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  returnText: { color: '#162D24', fontSize: 11, fontWeight: '900' },
});
