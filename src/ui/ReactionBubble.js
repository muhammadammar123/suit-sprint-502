import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export default function ReactionBubble({ reaction }) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    rise.setValue(0);
    if (reaction) Animated.spring(rise, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, [reaction?.id]);
  if (!reaction) return null;
  return <Animated.View style={[styles.bubble, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
    <Text style={styles.emoji}>{reaction.emoji}</Text>
    <View><Text style={styles.name}>{reaction.name}</Text><Text style={styles.caption}>{reaction.caption}</Text></View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  bubble: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E7FFFB',
    borderRadius: 18, paddingHorizontal: 15, paddingVertical: 10, marginVertical: 8, maxWidth: '92%', elevation: 12 },
  emoji: { fontSize: 27 }, name: { color: '#21153B', fontWeight: '900', fontSize: 11 },
  caption: { color: '#4D4162', fontWeight: '700', fontSize: 12 },
});
