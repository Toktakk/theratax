import { ownedByUser } from './owned-by-user.js';

describe('owned record lookup', () => {
  it('requires both the row id and the signed-in user', () => {
    expect(ownedByUser(4, 9)).toEqual({ id: 9, userId: 4 });
    expect(ownedByUser(8, 9)).toEqual({ id: 9, userId: 8 });
  });
});
