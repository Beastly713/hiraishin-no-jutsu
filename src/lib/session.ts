const SESSION_ID_LENGTH = 8;
const SESSION_ID_PATTERN = /^[a-f0-9]{8}$/i;

export function createSessionId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, SESSION_ID_LENGTH);
}

export function isValidSessionId(value: string) {
  return SESSION_ID_PATTERN.test(value);
}