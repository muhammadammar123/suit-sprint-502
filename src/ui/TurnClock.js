import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function TurnClock({ turnKey, onExpire, active }) {
  const [remaining, setRemaining] = useState(15);
  useEffect(() => {
    setRemaining(15);
    if (!active) return;
    const deadline = Date.now() + 15000;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) { clearInterval(timer); onExpire(); }
    }, 200);
    return () => clearInterval(timer);
  }, [turnKey, active]);
  return <View style={[styles.pill, remaining <= 5 && active && styles.urgent]}>
    <Text style={styles.text}>◷  {remaining}s</Text>
    <View style={styles.track}><View style={[styles.fill, { width: `${remaining / 15 * 100}%` }]} /></View>
  </View>;
}

const styles = StyleSheet.create({
  pill: { backgroundColor: '#214B3C', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 8, minWidth: 82 },
  urgent: { backgroundColor: '#762C57' },
  text: { color: '#FFF9F2', fontWeight: '900', fontSize: 14, textAlign: 'center' },
  track: { height: 3, borderRadius: 3, backgroundColor: '#51476E', marginTop: 5, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: '#E9C880' },
});
