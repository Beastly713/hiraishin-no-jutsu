export function createSessionId() {
  return crypto.randomUUID().slice(0, 8);
}