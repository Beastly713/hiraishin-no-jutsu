import { getSessionRepository } from "@/lib/session-repository";
import { CreateTransferSessionInput } from "@/types/session";

export function createTransferSession(input: CreateTransferSessionInput) {
  return getSessionRepository().createSession(input);
}

export function getTransferSession(sessionId: string) {
  return getSessionRepository().getSession(sessionId);
}

export function touchTransferSession(sessionId: string) {
  return getSessionRepository().touchSession(sessionId);
}

export function closeTransferSession(sessionId: string) {
  return getSessionRepository().closeSession(sessionId);
}

export function joinTransferSession(sessionId: string, receiverPeerId: string) {
  return getSessionRepository().joinSession(sessionId, receiverPeerId);
}

export function verifyTransferSessionPassword(
  sessionId: string,
  password: string,
) {
  return getSessionRepository().verifySessionPassword(sessionId, password);
}