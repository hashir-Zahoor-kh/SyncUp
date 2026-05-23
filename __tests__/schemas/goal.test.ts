import { goalSchema } from '../../src/schemas/goal';

describe('goalSchema', () => {
  it('accepts a valid goal', () => {
    expect(goalSchema.safeParse({ text: 'Run 5k today', tag: 'Health' }).success).toBe(true);
  });

  it('rejects empty goal text', () => {
    const result = goalSchema.safeParse({ text: '', tag: 'Focus' });
    expect(result.success).toBe(false);
  });

  it('rejects goal text over 140 characters', () => {
    const result = goalSchema.safeParse({ text: 'a'.repeat(141), tag: 'Life' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('140 characters');
    }
  });

  it('accepts goal text exactly 140 characters', () => {
    expect(goalSchema.safeParse({ text: 'a'.repeat(140), tag: 'Custom' }).success).toBe(true);
  });

  it('rejects goal text with HTML', () => {
    const result = goalSchema.safeParse({ text: '<b>bold goal</b>', tag: 'Health' });
    expect(result.success).toBe(false);
  });

  it('rejects goal text with control characters', () => {
    const result = goalSchema.safeParse({ text: 'goal\x01here', tag: 'Focus' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid tag', () => {
    const result = goalSchema.safeParse({ text: 'Valid goal', tag: 'Unknown' });
    expect(result.success).toBe(false);
  });
});
