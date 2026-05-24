import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AVATAR_COLORS, type AvatarColor } from '../schemas/profile';

interface AvatarColorPickerProps {
  value: AvatarColor;
  onChange: (color: AvatarColor) => void;
}

export function AvatarColorPicker({ value, onChange }: AvatarColorPickerProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      {AVATAR_COLORS.map((color) => (
        <TouchableOpacity
          key={color}
          style={[styles.swatch, { backgroundColor: color }, value === color && styles.selected]}
          onPress={() => onChange(color)}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === color }}
          accessibilityLabel={`Select color ${color}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  selected: {
    borderWidth: 3,
    borderColor: '#1A1A2E',
    transform: [{ scale: 1.15 }],
  },
});
