export function ownedByUser(
  userId: number,
  id: number,
): { id: number; userId: number } {
  return { id, userId };
}
