import {
  CreateTransferSessionInput,
  TransferSession,
} from "@/types/session";
import { InMemorySessionRepository } from "@/lib/session-repositories/in-memory-session-repository";

export interface SessionRepository {
  createSession(input: CreateTransferSessionInput): TransferSession;
  getSession(id: string): TransferSession | null;
  touchSession(id: string): TransferSession | null;
  closeSession(id: string): TransferSession | null;
  joinSession(id: string, receiverPeerId: string): TransferSession | null;
  verifySessionPassword(id: string, password: string): boolean | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __hiraishinSessionRepository: SessionRepository | undefined;
}

function createSessionRepository(): SessionRepository {
  const repositoryDriver = process.env.SESSION_REPOSITORY_DRIVER ?? "memory";

  switch (repositoryDriver) {
    case "memory":
      return new InMemorySessionRepository();
    default:
      throw new Error(
        `Unsupported session repository driver: ${repositoryDriver}`,
      );
  }
}

export function getSessionRepository(): SessionRepository {
  if (!globalThis.__hiraishinSessionRepository) {
    globalThis.__hiraishinSessionRepository = createSessionRepository();
  }

  return globalThis.__hiraishinSessionRepository;
}