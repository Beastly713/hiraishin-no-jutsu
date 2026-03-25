import { createSessionId } from "@/lib/session";
import {
  CreateTransferSessionInput,
  TransferSession,
} from "@/types/session";

const SESSION_TTL_MS = 1000 * 60 * 60;

type SessionStore = Map<string, TransferSession>;

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

export function createTransferSession({
  files,
  origin,
}: CreateTransferSessionInput): TransferSession {
  const id = createSessionId();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const session: TransferSession = {
    id,
    shareUrl: `${origin}/receive/${id}`,
    files,
    fileCount: files.length,
    totalSize: calculateTotalSize(files),
    createdAt,
    expiresAt,
    status: "ready",
  };

  getSessionStore().set(id, session);

  return session;
}

export function getTransferSession(id: string) {
  const session = getSessionStore().get(id);

  if (!session) {
    return null;
  }

  const isExpired = Date.parse(session.expiresAt) <= Date.now();

  if (isExpired) {
    getSessionStore().delete(id);
    return null;
  }

  return session;
}