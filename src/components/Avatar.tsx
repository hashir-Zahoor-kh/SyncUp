import React from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';

interface AvatarProfile {
  display_name: string;
  avatar_color?: string | null | undefined;
  avatar_emoji?: string | null | undefined;
  avatar_url?: string | null | undefined;
}

interface AvatarProps {
  profile: AvatarProfile;
  size?: number | undefined;
  style?: ViewStyle | undefined;
}

export function Avatar({ profile, size = 40, style }: AvatarProps): React.JSX.Element {
  const circleStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (profile.avatar_url) {
    return (
      <View style={[circleStyle, style]} accessibilityLabel={`${profile.display_name}'s avatar`}>
        <Image
          source={{ uri: profile.avatar_url }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      </View>
    );
  }

  if (profile.avatar_emoji) {
    return (
      <View
        style={[circleStyle, styles.emojiCircle, style]}
        accessibilityLabel={`${profile.display_name}'s avatar`}
      >
        <Text style={{ fontSize: size * 0.5 }}>{profile.avatar_emoji}</Text>
      </View>
    );
  }

  if (profile.avatar_color) {
    const initial = profile.display_name.charAt(0).toUpperCase();
    return (
      <View
        style={[circleStyle, { backgroundColor: profile.avatar_color }, styles.centered, style]}
        accessibilityLabel={`${profile.display_name}'s avatar`}
      >
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
      </View>
    );
  }

  return (
    <View
      style={[circleStyle, styles.fallback, style]}
      accessibilityLabel={`${profile.display_name}'s avatar`}
    >
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emojiCircle: {
    backgroundColor: '#FBF7F2',
    borderWidth: 1,
    borderColor: '#E8E0D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'DMSans_700Bold',
    textAlign: 'center',
  },
  fallback: {
    backgroundColor: '#D3D1C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
