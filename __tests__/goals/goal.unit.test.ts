import { goalSchema } from '../../src/schemas/goal';

describe('goalSchema — unit tests', () => {
  it('accepts a valid goal', () => {
    expect(goalSchema.safeParse({ text: 'Walk 30 mins', tag: 'Health' }).success).toBe(true);
  });

  it('rejects text over 140 characters', () => {
    const result = goalSchema.safeParse({ text: 'a'.repeat(141), tag: 'Health' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('140');
    }
  });

  it('rejects empty text', () => {
    const result = goalSchema.safeParse({ text: '', tag: 'Health' });
    expect(result.success).toBe(false);
  });

  it('rejects text with control characters', () => {
    const result = goalSchema.safeParse({ text: 'Walk\x00outside', tag: 'Health' });
    expect(result.success).toBe(false);
  });

  it('rejects text with HTML tags', () => {
    const result = goalSchema.safeParse({ text: '<script>bad</script>', tag: 'Health' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid tag', () => {
    const result = goalSchema.safeParse({ text: 'Walk 30 mins', tag: 'BadTag' });
    expect(result.success).toBe(false);
  });

  it('accepts all four valid tags', () => {
    const tags = ['Health', 'Focus', 'Life', 'Custom'] as const;
    for (const tag of tags) {
      expect(goalSchema.safeParse({ text: 'Some goal', tag }).success).toBe(true);
    }
  });
});
