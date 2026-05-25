import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

function getTodayIndex(): number {
  const day = new Date().getDay(); // 0=Sun
  return day === 0 ? 6 : day - 1; // 0=Mon … 6=Sun
}

export function WeekBar(): React.JSX.Element {
  const todayIndex = getTodayIndex();

  return (
    <View style={styles.container}>
      {DAY_LABELS.map((label, index) => {
        const isPast = index < todayIndex;
        const isToday = index === todayIndex;

        return (
          <View key={index} style={styles.dayCol}>
            <Text style={styles.dayLabel}>{label}</Text>
            <View
              style={[
                styles.dot,
                isPast && styles.dotPast,
                isToday && styles.dotToday,
                !isPast && !isToday && styles.dotFuture,
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  dayCol: { alignItems: 'center', gap: 4 },
  dayLabel: { fontSize: 11, color: '#888', fontFamily: 'DMSans_400Regular' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotPast: { backgroundColor: '#D85A30' },
  dotToday: {
    backgroundColor: '#D85A30',
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#D85A30',
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  dotFuture: { backgroundColor: '#D3D1C7' },
});
