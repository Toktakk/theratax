import { UnauthorizedException } from '@nestjs/common';
import { userFromAuthorization } from './auth.guard.js';
import type { PublicUser } from './public-user.js';

const ada: PublicUser = {
  id: 4,
  email: 'ada@example.com',
  name: 'Ada',
  practiceType: 'mobile',
  expenseMethod: 'flat_rate',
  onboardedAt: '2026-04-06T00:00:00.000Z',
};

describe('bearer authorization', () => {
  it('rejects a missing, empty, or non-bearer header', async () => {
    const lookup = () => Promise.resolve(ada);
    await expect(userFromAuthorization(undefined, lookup)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(userFromAuthorization('Bearer', lookup)).rejects.toThrow('Unauthorized');
    await expect(userFromAuthorization('Basic ada', lookup)).rejects.toThrow('Unauthorized');
    await expect(userFromAuthorization('Bearer ', lookup)).rejects.toThrow('Unauthorized');
  });

  it('rejects a token the session store does not accept', async () => {
    const seen: string[] = [];
    await expect(
      userFromAuthorization('Bearer missing', (token) => {
        seen.push(token);
        return Promise.resolve(null);
      }),
    ).rejects.toThrow('Unauthorized');
    expect(seen).toEqual(['missing']);
  });

  it('returns the user for that bearer token', async () => {
    const user = await userFromAuthorization('Bearer live-token', (token) => {
      expect(token).toBe('live-token');
      return Promise.resolve(ada);
    });
    expect(user).toBe(ada);
    expect(user).not.toHaveProperty('passwordHash');
  });
});
