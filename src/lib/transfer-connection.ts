import {
  CreateTransferConnectionStateInput,
  EMPTY_TRANSFER_PROGRESS,
  TransferConnectionState,
  TransferConnectionStatus,
} from "@/types/transfer-connection";

const TERMINAL_TRANSFER_CONNECTION_STATUSES: TransferConnectionStatus[] = [
  "completed",
  "failed",
  "closed",
];

export function createTransferConnectionState({
  role,
  sessionId = null,
}: CreateTransferConnectionStateInput): TransferConnectionState {
  return {
    role,
    status: sessionId ? "resolving_session" : "idle",
    sessionId,
    localPeerId: null,
    remotePeerId: null,
    deviceInfo: null,
    errorMessage: null,
    progress: EMPTY_TRANSFER_PROGRESS,
  };
}

export function isTerminalTransferConnectionStatus(
  status: TransferConnectionStatus,
) {
  return TERMINAL_TRANSFER_CONNECTION_STATUSES.includes(status);
}

export function getTransferConnectionStatusLabel(
  status: TransferConnectionStatus,
) {
  switch (status) {
    case "idle":
      return "Idle";
    case "resolving_session":
      return "Resolving session";
    case "waiting_for_peer":
      return "Waiting for peer";
    case "connecting":
      return "Connecting";
    case "connected":
      return "Connected";
    case "syncing_metadata":
      return "Syncing metadata";
    case "ready":
      return "Ready";
    case "transferring":
      return "Transferring";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "closed":
      return "Closed";
  }
}