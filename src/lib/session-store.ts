import {
  CreateTransferSessionInput,
  TransferSession,
} from "@/types/session";
import { createSessionId } from "@/lib/session";

const SESSION_TTL_MS = 1000 * 60 * 60;

export interface SessionRepository {
  createSession(input: CreateTransferSessionInput): TransferSession;
  getSession(id: string): TransferSession | null;
  touchSession(id: string): TransferSession | null;
  closeSession(id: string): TransferSession | null;
}

type StoredTransferSession = {
  session: TransferSession;
  timeoutId: ReturnType<typeof setTimeout>;
};

type SessionStore = Map<string, StoredTransferSession>;

declare global {
  // eslint-disable-next-line no-var
  var __hiraishinSessionStore: SessionStore | undefined;
  // eslint-disable-next-line no-var
  var __hiraishinSessionRepository: SessionRepository | undefined;
}

function getSessionStore() {
  if (!globalThis.__hiraishinSessionStore) {
    globalThis.__hiraishinSessionStore = new Map();
  }

  return globalThis.__hiraishinSessionStore;
}

function calculateTotalSize(files: CreateTransferSessionInput["files"]) {
  return files.reduce((sum, file) => sum + file.size, 0);
}

function createExpiresAt() {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

function scheduleSessionExpiry(sessionId: string) {
  return setTimeout(() => {
    getSessionStore().delete(sessionId);
  }, SESSION_TTL_MS);
}

function storeTransferSession(session: TransferSession) {
  const existing = getSessionStore().get(session.id);

  if (existing) {
    clearTimeout(existing.timeoutId);
  }

  getSessionStore().set(session.id, {
    session,
    timeoutId: scheduleSessionExpiry(session.id),
  });
}

export class InMemorySessionRepository implements SessionRepository {
  createSession({
    senderPeerId,
    files,
    origin,
  }: CreateTransferSessionInput): TransferSession {
    const id = createSessionId();
    const createdAt = new Date().toISOString();

    const session: TransferSession = {
      id,
      senderPeerId,
      shareUrl: `${origin}/receive/${id}`,
      files,
      fileCount: files.length,
      totalSize: calculateTotalSize(files),
      createdAt,
      expiresAt: createExpiresAt(),
      status: "ready",
    };

    storeTransferSession(session);

    return session;
  }

  getSession(id: string) {
    const stored = getSessionStore().get(id);

    if (!stored) {
      return null;
    }

    const isExpired = Date.parse(stored.session.expiresAt) <= Date.now();

    if (isExpired) {
      clearTimeout(stored.timeoutId);
      getSessionStore().delete(id);
      return null;
    }

    return stored.session;
  }

  touchSession(id: string) {
    const stored = getSessionStore().get(id);

    if (!stored) {
      return null;
    }

    const isExpired = Date.parse(stored.session.expiresAt) <= Date.now();

    if (isExpired || stored.session.status === "closed") {
      clearTimeout(stored.timeoutId);
      getSessionStore().delete(id);
      return null;
    }

    const nextSession: TransferSession = {
      ...stored.session,
      expiresAt: createExpiresAt(),
      status: "ready",
    };

    storeTransferSession(nextSession);

    return nextSession;
  }

  closeSession(id: string) {
    const stored = getSessionStore().get(id);

    if (!stored) {
      return null;
    }

    const nextSession: TransferSession = {
      ...stored.session,
      status: "closed",
      expiresAt: new Date().toISOString(),
    };

    clearTimeout(stored.timeoutId);
    getSessionStore().delete(id);

    return nextSession;
  }
}

export function getSessionRepository(): SessionRepository {
  if (!globalThis.__hiraishinSessionRepository) {
    globalThis.__hiraishinSessionRepository = new InMemorySessionRepository();
  }

  return globalThis.__hiraishinSessionRepository;
}

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