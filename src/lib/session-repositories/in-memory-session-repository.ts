import { createSessionId } from "@/lib/session";
import {
  CreateTransferSessionInput,
  TransferSession,
} from "@/types/session";
import { SessionRepository } from "@/lib/session-repository";

const SESSION_TTL_MS = 1000 * 60 * 60;

type StoredTransferSession = {
  session: TransferSession;
  timeoutId: ReturnType<typeof setTimeout>;
};

type SessionStore = Map<string, StoredTransferSession>;

declare global {
  // eslint-disable-next-line no-var
  var __hiraishinSessionStore: SessionStore | undefined;
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
      receiverPeerId: null,
      receiverJoinedAt: null,
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

  joinSession(id: string, receiverPeerId: string) {
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
      receiverPeerId,
      receiverJoinedAt: new Date().toISOString(),
    };

    storeTransferSession(nextSession);

    return nextSession;
  }
}