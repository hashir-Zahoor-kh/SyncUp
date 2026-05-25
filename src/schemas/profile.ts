import { z } from 'zod';

const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/u;
const HTML_TAG_REGEX = /<[^>]*>/u;

const sanitizedStringSchema = (maxLength: number, fieldName: string) =>
  z
    .string()
    .min(1, `${fieldName} is required`)
    .max(maxLength, `${fieldName} must be at most ${maxLength} characters`)
    .refine((val) => !CONTROL_CHAR_REGEX.test(val), `${fieldName} contains invalid characters`)
    .refine((val) => !HTML_TAG_REGEX.test(val), `${fieldName} must not contain HTML`);

export const AVATAR_COLORS = [
  '#6C63FF',
  '#FF6584',
  '#43BF8E',
  '#FFB347',
  '#4ECDC4',
  '#FF6B6B',
] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const CONNECTION_TYPES = ['Friends', 'Partners', 'Family', 'Workout Buddy'] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

const SUPABASE_STORAGE_PREFIX =
  'https://ilykfwtiebfyaljlhsrx.supabase.co/storage/v1/object/public/';

export const profileSchema = z
  .object({
    displayName: sanitizedStringSchema(50, 'Display name'),
    avatarColor: z.enum(AVATAR_COLORS).nullable().optional(),
    avatarEmoji: z.string().max(10).nullable().optional(),
    avatarUrl: z
      .string()
      .max(500)
      .refine(
        (val) => val.startsWith(SUPABASE_STORAGE_PREFIX),
        'Avatar URL must be a Supabase Storage URL',
      )
      .nullable()
      .optional(),
  })
  .refine(
    (data) => data.avatarColor != null || data.avatarEmoji != null || data.avatarUrl != null,
    { message: 'Please choose an emoji or photo for your avatar', path: ['avatarEmoji'] },
  );

export const onboardingSchema = profileSchema.extend({
  connectionType: z.enum(CONNECTION_TYPES, {
    message: 'Please select a connection type',
  }),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
export type OnboardingFormData = z.infer<typeof onboardingSchema>;
