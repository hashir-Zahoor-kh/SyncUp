import { passwordSchema, signUpSchema } from '../../src/schemas/auth';

describe('passwordSchema — all validation paths', () => {
  const valid = 'SecurePass1!';

  it('accepts a valid password', () => {
    expect(passwordSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects < 10 chars', () => {
    expect(passwordSchema.safeParse('Short1').success).toBe(false);
  });

  it('rejects exactly 9 chars', () => {
    expect(passwordSchema.safeParse('Secure1ab').success).toBe(false);
  });

  it('accepts exactly 10 chars with letter+number', () => {
    expect(passwordSchema.safeParse('SecureP1ss').success).toBe(true);
  });

  it('rejects no letters', () => {
    const r = passwordSchema.safeParse('1234567890');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toContain('letter');
  });

  it('rejects no numbers', () => {
    const r = passwordSchema.safeParse('passwordonly');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toContain('number');
  });

  it('accepts Unicode letters + digit', () => {
    expect(passwordSchema.safeParse('Pässwördé1').success).toBe(true);
  });
});

describe('signUpSchema — age gate', () => {
  const base = {
    email: 'test@test.com',
    password: 'ValidPass123',
    confirmPassword: 'ValidPass123',
  };

  it('requires isAgeConfirmed = true', () => {
    expect(signUpSchema.safeParse({ ...base, isAgeConfirmed: true }).success).toBe(true);
  });

  it('rejects isAgeConfirmed = false', () => {
    expect(signUpSchema.safeParse({ ...base, isAgeConfirmed: false }).success).toBe(false);
  });

  it('rejects when age field is missing', () => {
    expect(signUpSchema.safeParse(base).success).toBe(false);
  });
});
