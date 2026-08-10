import { describe, it, expect } from 'vitest';

describe('test harness sanity check', () => {
  it('vitest is running', () => {
    expect(1 + 1).toBe(2);
  });

  it('can import zod (backend dependency)', async () => {
    const { z } = await import('zod');
    const schema = z.object({ name: z.string() });
    expect(schema.parse({ name: 'test' })).toEqual({ name: 'test' });
  });
});
