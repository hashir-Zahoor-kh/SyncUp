import React, { useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

const EMOJIS = [
  '🌟',
  '💪',
  '🎯',
  '🚀',
  '🌱',
  '🔥',
  '🎨',
  '🎵',
  '📚',
  '⚡',
  '🌈',
  '🦋',
  '🐉',
  '🏆',
  '💎',
  '🌙',
  '☀️',
  '🌊',
  '🍀',
  '🦁',
  '🐺',
  '🦊',
  '🐬',
  '🌺',
  '🎸',
  '🏄',
  '🌿',
  '⚽',
] as const;

const SUPABASE_STORAGE_PREFIX =
  'https://ilykfwtiebfyaljlhsrx.supabase.co/storage/v1/object/public/';

type Tab = 'emoji' | 'photo';

interface AvatarPickerProps {
  userId: string;
  selectedEmoji: string | null | undefined;
  selectedUrl: string | null | undefined;
  onEmojiSelect: (emoji: string) => void;
  onUrlSelect: (url: string) => void;
}

export function AvatarPicker({
  userId,
  selectedEmoji,
  selectedUrl,
  onEmojiSelect,
  onUrlSelect,
}: AvatarPickerProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('emoji');
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async (source: 'camera' | 'library'): Promise<void> => {
    const permResult =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permResult.granted) {
      Alert.alert(
        'Permission required',
        source === 'camera'
          ? 'Please enable camera access in Settings to take a photo.'
          : 'Please enable photo library access in Settings to choose a photo.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            allowsMultipleSelection: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            allowsMultipleSelection: false,
          });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const path = `${userId}/avatar.jpg`;

      const { error } = await supabase.storage.from('avatars').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

      if (error) {
        Alert.alert('Upload failed', 'Could not upload photo. Please try again.');
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;

      if (!publicUrl.startsWith(SUPABASE_STORAGE_PREFIX)) {
        Alert.alert('Upload failed', 'Unexpected storage URL. Please try again.');
        return;
      }

      onUrlSelect(publicUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'emoji' && styles.tabActive]}
          onPress={() => setActiveTab('emoji')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'emoji' }}
        >
          <Text style={[styles.tabText, activeTab === 'emoji' && styles.tabTextActive]}>Emoji</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'photo' && styles.tabActive]}
          onPress={() => setActiveTab('photo')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'photo' }}
        >
          <Text style={[styles.tabText, activeTab === 'photo' && styles.tabTextActive]}>Photo</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'emoji' ? (
        <FlatList
          data={EMOJIS}
          numColumns={7}
          scrollEnabled={false}
          keyExtractor={(item) => item}
          columnWrapperStyle={styles.emojiRow}
          renderItem={({ item: emoji }) => {
            const isSelected = selectedEmoji === emoji;
            return (
              <TouchableOpacity
                style={[styles.emojiCell, isSelected && styles.emojiCellSelected]}
                onPress={() => onEmojiSelect(emoji)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`Select emoji ${emoji}`}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
                {isSelected && (
                  <View style={styles.checkmark} testID={`checkmark-${emoji}`}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          testID="emoji-grid"
        />
      ) : (
        <View style={styles.photoTab} testID="photo-tab">
          {selectedUrl ? (
            <Image source={{ uri: selectedUrl }} style={styles.photoPreview} />
          ) : (
            <View style={styles.uploadArea}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadHint} numberOfLines={2}>
                No photo selected
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => void handlePickImage('camera')}
            disabled={uploading}
            accessibilityLabel="Take Photo"
          >
            <Text style={styles.photoBtnText}>{uploading ? 'Uploading…' : 'Take Photo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.photoBtn, styles.photoBtnSecondary]}
            onPress={() => void handlePickImage('library')}
            disabled={uploading}
            accessibilityLabel="Choose from Library"
          >
            <Text style={[styles.photoBtnText, styles.photoBtnTextSecondary]}>
              Choose from Library
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F0EBE3',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#FBF7F2' },
  tabText: { fontSize: 14, color: '#888', fontFamily: 'DMSans_400Regular' },
  tabTextActive: { color: '#2C2C2A', fontFamily: 'DMSans_700Bold' },
  emojiRow: {
    gap: 6,
    marginBottom: 6,
  },
  emojiCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#F5F0EA',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emojiCellSelected: {
    backgroundColor: '#FBF7F2',
    borderWidth: 2,
    borderColor: '#D85A30',
  },
  emojiText: { fontSize: 26 },
  checkmark: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D85A30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: { fontSize: 10, color: '#FFF', fontFamily: 'DMSans_700Bold' },
  photoTab: { alignItems: 'center', gap: 12 },
  uploadArea: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0EBE3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  uploadIcon: { fontSize: 32 },
  uploadHint: {
    fontSize: 11,
    color: '#888',
    fontFamily: 'DMSans_400Regular',
    marginTop: 4,
    maxWidth: 80,
    textAlign: 'center',
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  photoBtn: {
    width: '100%',
    backgroundColor: '#D85A30',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  photoBtnSecondary: { backgroundColor: '#FBEEE8' },
  photoBtnText: { color: '#FFF', fontFamily: 'DMSans_700Bold', fontSize: 15 },
  photoBtnTextSecondary: { color: '#D85A30' },
});
