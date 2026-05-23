import { profileSchema, onboardingSchema, AVATAR_COLORS } from '../../src/schemas/profile';

describe('profileSchema', () => {
  it('accepts a valid profile', () => {
    expect(
      profileSchema.safeParse({ displayName: 'Alice', avatarColor: AVATAR_COLORS[0] }).success,
    ).toBe(true);
  });

  it('rejects an empty display name', () => {
    const result = profileSchema.safeParse({ displayName: '', avatarColor: AVATAR_COLORS[0] });
    expect(result.success).toBe(false);
  });

  it('rejects a display name longer than 50 characters', () => {
    const result = profileSchema.safeParse({
      displayName: 'a'.repeat(51),
      avatarColor: AVATAR_COLORS[0],
    });
    expect(result.success).toBe(false);
  });

  it('rejects display names with HTML tags', () => {
    const result = profileSchema.safeParse({
      displayName: '<script>alert(1)</script>',
      avatarColor: AVATAR_COLORS[0],
    });
    expect(result.success).toBe(false);
  });

  it('rejects display names with control characters', () => {
    const result = profileSchema.safeParse({
      displayName: 'Alice\x00',
      avatarColor: AVATAR_COLORS[0],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid avatar color', () => {
    const result = profileSchema.safeParse({
      displayName: 'Alice',
      avatarColor: '#FFFFFF',
    });
    expect(result.success).toBe(false);
  });
});

describe('onboardingSchema', () => {
  it('accepts valid onboarding data', () => {
    expect(
      onboardingSchema.safeParse({
        displayName: 'Bob',
        avatarColor: AVATAR_COLORS[1],
        connectionType: 'Friends',
      }).success,
    ).toBe(true);
  });

  it('rejects an invalid connection type', () => {
    const result = onboardingSchema.safeParse({
      displayName: 'Bob',
      avatarColor: AVATAR_COLORS[1],
      connectionType: 'Enemy',
    });
    expect(result.success).toBe(false);
  });
});
