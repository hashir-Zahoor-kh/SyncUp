import { passwordSchema, signUpSchema, signInSchema } from '../../src/schemas/auth';

describe('passwordSchema', () => {
  it('accepts a valid password', () => {
    expect(passwordSchema.safeParse('SecurePass123').success).toBe(true);
    expect(passwordSchema.safeParse('mypassword9!').success).toBe(true);
  });

  it('rejects passwords shorter than 10 characters', () => {
    const result = passwordSchema.safeParse('Short1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('10 characters');
    }
  });

  it('rejects passwords with no letters', () => {
    const result = passwordSchema.safeParse('1234567890');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('letter');
    }
  });

  it('rejects passwords with no numbers', () => {
    const result = passwordSchema.safeParse('passwordonly');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('number');
    }
  });
});

describe('signUpSchema', () => {
  const valid = {
    email: 'test@example.com',
    password: 'ValidPass123',
    confirmPassword: 'ValidPass123',
    isAgeConfirmed: true as const,
  };

  it('accepts valid signup data', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects when passwords do not match', () => {
    const result = signUpSchema.safeParse({ ...valid, confirmPassword: 'DifferentPass123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('do not match');
    }
  });

  it('rejects when age is not confirmed', () => {
    const result = signUpSchema.safeParse({ ...valid, isAgeConfirmed: false });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = signUpSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

describe('signInSchema', () => {
  it('accepts valid credentials', () => {
    expect(
      signInSchema.safeParse({ email: 'user@example.com', password: 'anything' }).success,
    ).toBe(true);
  });

  it('rejects empty password', () => {
    const result = signInSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});
