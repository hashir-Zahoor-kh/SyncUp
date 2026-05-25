import React from 'react';
import { Image } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Avatar } from '../../src/components/Avatar';
import { AvatarPicker } from '../../src/components/AvatarPicker';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      }),
    },
  },
}));

const BASE_PROFILE = {
  display_name: 'Alex',
  avatar_color: null,
  avatar_emoji: null,
  avatar_url: null,
};

describe('Avatar component', () => {
  it('renders photo when avatar_url is set', () => {
    const { UNSAFE_getByType } = render(
      <Avatar
        profile={{
          ...BASE_PROFILE,
          avatar_url:
            'https://ilykfwtiebfyaljlhsrx.supabase.co/storage/v1/object/public/avatars/uid/avatar.jpg',
        }}
        size={40}
      />,
    );
    const img = UNSAFE_getByType(Image);
    expect(img.props.source.uri).toContain('avatars');
  });

  it('renders emoji when avatar_emoji is set and avatar_url is null', () => {
    render(<Avatar profile={{ ...BASE_PROFILE, avatar_emoji: '🌟' }} size={40} />);
    expect(screen.getByText('🌟')).toBeTruthy();
  });

  it('renders initial letter when only avatar_color is set', () => {
    render(<Avatar profile={{ ...BASE_PROFILE, avatar_color: '#D85A30' }} size={40} />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('renders fallback "?" when no avatar type is set', () => {
    render(<Avatar profile={BASE_PROFILE} size={40} />);
    expect(screen.getByText('?')).toBeTruthy();
  });
});

describe('AvatarPicker component', () => {
  const PICKER_PROPS = {
    userId: 'test-user-id',
    selectedEmoji: null,
    selectedUrl: null,
    onEmojiSelect: jest.fn(),
    onUrlSelect: jest.fn(),
  };

  it('renders emoji tab by default', () => {
    render(<AvatarPicker {...PICKER_PROPS} />);
    expect(screen.getByTestId('emoji-grid')).toBeTruthy();
  });

  it('switches to photo tab on tap', () => {
    render(<AvatarPicker {...PICKER_PROPS} />);
    fireEvent.press(screen.getByText('Photo'));
    expect(screen.getByTestId('photo-tab')).toBeTruthy();
  });

  it('shows checkmark overlay on selected emoji', () => {
    render(<AvatarPicker {...PICKER_PROPS} selectedEmoji="🌟" />);
    expect(screen.getByTestId('checkmark-🌟')).toBeTruthy();
  });

  it('calls onEmojiSelect when an emoji is tapped', () => {
    const onEmojiSelect = jest.fn();
    render(<AvatarPicker {...PICKER_PROPS} onEmojiSelect={onEmojiSelect} />);
    fireEvent.press(screen.getByText('🌟'));
    expect(onEmojiSelect).toHaveBeenCalledWith('🌟');
  });
});
