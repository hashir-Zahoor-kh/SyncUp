import { z } from 'zod';

const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/u;
const HTML_TAG_REGEX = /<[^>]*>/u;

export const GOAL_TAGS = ['Health', 'Focus', 'Life', 'Custom'] as const;
export type GoalTag = (typeof GOAL_TAGS)[number];

export const goalSchema = z.object({
  text: z
    .string()
    .min(1, 'Goal text is required')
    .max(140, 'Goal must be at most 140 characters')
    .refine((val) => !CONTROL_CHAR_REGEX.test(val), 'Goal contains invalid characters')
    .refine((val) => !HTML_TAG_REGEX.test(val), 'Goal must not contain HTML'),
  tag: z.enum(GOAL_TAGS, {
    message: 'Please select a valid tag',
  }),
});

export type GoalFormData = z.infer<typeof goalSchema>;
