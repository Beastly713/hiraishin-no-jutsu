import { getSessionRepository } from "@/lib/session-repository";
import { CreateTransferSessionInput } from "@/types/session";

export function createTransferSession(input: CreateTransferSessionInput) {
  return getSessionRepository().createSession(input);
}

export function getTransferSession(id: string) {
  return getSessionRepository().getSession(id);
}

export function touchTransferSession(id: string) {
  return getSessionRepository().touchSession(id);
}

export function closeTransferSession(id: string) {
  return getSessionRepository().closeSession(id);
}