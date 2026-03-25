const PEER_ID_LENGTH = 12;
const PEER_ID_PATTERN = /^[a-f0-9]{12}$/i;

export function createPeerId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, PEER_ID_LENGTH);
}

export function isValidPeerId(value: string) {
  return PEER_ID_PATTERN.test(value);
}