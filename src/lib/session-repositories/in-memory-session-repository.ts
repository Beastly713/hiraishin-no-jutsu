import { createSessionId } from "@/lib/session";
import {
  CreateTransferSessionInput,
  TransferSession,
} from "@/types/session";
import {
  JoinSessionResult,
  SessionRepository,
} from "@/lib/session-repository";

const SESSION_TTL_MS = 1000 * 60 * 60;

type PersistedTransferSession = TransferSession & {
  transferPassword: string | null;
  authorizedReceiverPeerId: string | null;
};

type StoredTransferSession = {
  session: PersistedTransferSession;
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

function toPublicSession(session: PersistedTransferSession): TransferSession {
  return {
    id: session.id,
    senderPeerId: session.senderPeerId,
    receiverPeerId: session.receiverPeerId,
    receiverJoinedAt: session.receiverJoinedAt,
    shareUrl: session.shareUrl,
    files: session.files,
    fileCount: session.fileCount,
    totalSize: session.totalSize,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    status: session.status,
    hasPassword: session.hasPassword,
  };
}

function storeTransferSession(session: PersistedTransferSession) {
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
    transferPassword,
  }: CreateTransferSessionInput): TransferSession {
    const id = createSessionId();
    const createdAt = new Date().toISOString();

    const session: PersistedTransferSession = {
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
      hasPassword: Boolean(transferPassword),
      transferPassword: transferPassword ?? null,
      authorizedReceiverPeerId: null,
    };

    storeTransferSession(session);

    return toPublicSession(session);
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

    return toPublicSession(stored.session);
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

    const nextSession: PersistedTransferSession = {
      ...stored.session,
      expiresAt: createExpiresAt(),
      status: "ready",
    };

    storeTransferSession(nextSession);

    return toPublicSession(nextSession);
  }

  closeSession(id: string) {
    const stored = getSessionStore().get(id);

    if (!stored) {
      return null;
    }

    const nextSession: PersistedTransferSession = {
      ...stored.session,
      status: "closed",
      expiresAt: new Date().toISOString(),
    };

    clearTimeout(stored.timeoutId);
    getSessionStore().delete(id);

    return toPublicSession(nextSession);
  }

  joinSession(id: string, receiverPeerId: string): JoinSessionResult {
    const stored = getSessionStore().get(id);

    if (!stored) {
      return { ok: false, reason: "not_found" };
    }

    const isExpired = Date.parse(stored.session.expiresAt) <= Date.now();

    if (isExpired || stored.session.status === "closed") {
      clearTimeout(stored.timeoutId);
      getSessionStore().delete(id);
      return { ok: false, reason: "not_found" };
    }

    if (
      stored.session.hasPassword &&
      stored.session.authorizedReceiverPeerId !== receiverPeerId
    ) {
      return { ok: false, reason: "unauthorized" };
    }

    const nextSession: PersistedTransferSession = {
      ...stored.session,
      receiverPeerId,
      receiverJoinedAt: new Date().toISOString(),
    };

    storeTransferSession(nextSession);

    return {
      ok: true,
      session: toPublicSession(nextSession),
    };
  }

  verifySessionPassword(id: string, receiverPeerId: string, password: string) {
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

    if (!stored.session.hasPassword) {
      return true;
    }

    if (stored.session.transferPassword !== password) {
      return false;
    }

    const nextSession: PersistedTransferSession = {
      ...stored.session,
      authorizedReceiverPeerId: receiverPeerId,
    };

    storeTransferSession(nextSession);

    return true;
  }
}