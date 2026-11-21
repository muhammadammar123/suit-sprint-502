import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

const RED = '#C74448';
const INK = '#102D24';

export default function AnimatedCard({ card, playable, onPress, index = 0, total = 1, compact = false }) {
  const lift = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 75, delay: Math.min(index * 45, 360), useNativeDriver: true }).start();
  }, [enter]);
  useEffect(() => {
    Animated.spring(lift, { toValue: playable ? 1 : 0, friction: 5, tension: 95, useNativeDriver: true }).start();
  }, [lift, playable]);
  const angle = compact ? 0 : Math.max(-13, Math.min(13, (index - (total - 1) / 2) * 3));
  const color = card.suit === '♥' || card.suit === '♦' ? RED : INK;
  return <Animated.View style={{ opacity: enter, transform: [
    { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }), lift.interpolate({ inputRange: [0, 1], outputRange: [0, -20] })) },
    { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }) },
    { rotate: `${angle}deg` },
  ] }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${card.rank} of ${card.suit}`}
      disabled={!onPress} onPress={onPress} style={[styles.card, compact && styles.compact,
        playable && styles.playable, !playable && !compact && styles.quiet]}>
      <Text style={[styles.corner, { color }]}>{card.rank}{card.suit}</Text>
      <View style={[styles.symbolRing, { borderColor: color + '33' }]}><Text style={[styles.symbol, { color }]}>{card.suit}</Text></View>
      <Text style={[styles.bottom, { color }]}>{card.rank}{card.suit}</Text>
    </Pressable>
  </Animated.View>;
}

const styles = StyleSheet.create({
  card: { width: 66, height: 106, borderRadius: 13, backgroundColor: '#FFF9F2', padding: 6,
    borderWidth: 2, borderColor: '#FFF9F2', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  compact: { width: 80, height: 118 },
  playable: { borderColor: '#F6D78E', elevation: 12, shadowColor: '#E9C880', shadowOpacity: 0.8, shadowRadius: 13 },
  quiet: { opacity: 0.62 },
  corner: { position: 'absolute', top: 6, left: 7, fontSize: 14, fontWeight: '900' },
  bottom: { position: 'absolute', bottom: 6, right: 7, fontSize: 12, fontWeight: '900', transform: [{ rotate: '180deg' }] },
  symbolRing: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontSize: 27, fontWeight: '900' },
});
