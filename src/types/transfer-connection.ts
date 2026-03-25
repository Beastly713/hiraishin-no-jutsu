import { DeviceInfo } from "@/types/transfer";

export type TransferRole = "sender" | "receiver";

export type TransferConnectionStatus =
  | "idle"
  | "resolving_session"
  | "waiting_for_peer"
  | "connecting"
  | "connected"
  | "syncing_metadata"
  | "ready"
  | "transferring"
  | "paused"
  | "completed"
  | "failed"
  | "closed";

export type TransferProgressSnapshot = {
  fileName: string | null;
  fileIndex: number;
  totalFiles: number;
  fileBytesTransferred: number;
  fileBytesTotal: number;
  totalBytesTransferred: number;
  totalBytesTotal: number;
};

export type TransferConnectionState = {
  role: TransferRole;
  status: TransferConnectionStatus;
  sessionId: string | null;
  localPeerId: string | null;
  remotePeerId: string | null;
  deviceInfo: DeviceInfo | null;
  errorMessage: string | null;
  progress: TransferProgressSnapshot;
};

export type CreateTransferConnectionStateInput = {
  role: TransferRole;
  sessionId?: string | null;
};

export const EMPTY_TRANSFER_PROGRESS: TransferProgressSnapshot = {
  fileName: null,
  fileIndex: 0,
  totalFiles: 0,
  fileBytesTransferred: 0,
  fileBytesTotal: 0,
  totalBytesTransferred: 0,
  totalBytesTotal: 0,
};