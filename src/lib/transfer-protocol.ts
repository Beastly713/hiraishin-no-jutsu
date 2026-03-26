import {
  DeviceInfo,
  TransferChunkAckMessage,
  TransferChunkAckPayload,
  TransferChunkMessage,
  TransferChunkPayload,
  TransferDoneMessage,
  TransferErrorMessage,
  TransferInfoMessage,
  TransferInfoPayload,
  TransferMessage,
  TransferRequestInfoMessage,
  TransferStartMessage,
  TransferStartPayload,
} from "@/types/transfer";

export type TransferHandshakeMessage =
  | TransferRequestInfoMessage
  | TransferInfoMessage
  | TransferErrorMessage;

export type TransferExecutionMessage =
  | TransferStartMessage
  | TransferChunkMessage
  | TransferChunkAckMessage
  | TransferDoneMessage
  | TransferErrorMessage;

export function createRequestInfoMessage(
  deviceInfo: DeviceInfo,
): TransferRequestInfoMessage {
  return {
    type: "request_info",
    payload: deviceInfo,
  };
}

export function createInfoMessage(
  payload: TransferInfoPayload,
): TransferInfoMessage {
  return {
    type: "info",
    payload,
  };
}

export function createStartMessage(
  payload: TransferStartPayload,
): TransferStartMessage {
  return {
    type: "start",
    payload,
  };
}

export function createChunkMessage(
  payload: TransferChunkPayload,
): TransferChunkMessage {
  return {
    type: "chunk",
    payload,
  };
}

export function createChunkAckMessage(
  payload: TransferChunkAckPayload,
): TransferChunkAckMessage {
  return {
    type: "chunk_ack",
    payload,
  };
}

export function createDoneMessage(): TransferDoneMessage {
  return {
    type: "done",
    payload: null,
  };
}

export function createErrorMessage(message: string): TransferErrorMessage {
  return {
    type: "error",
    payload: {
      message,
    },
  };
}

export function isTransferRequestInfoMessage(
  value: unknown,
): value is TransferRequestInfoMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.type === "request_info" &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
}

export function isTransferInfoMessage(
  value: unknown,
): value is TransferInfoMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.type === "info" &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null &&
    "files" in candidate.payload &&
    Array.isArray((candidate.payload as Record<string, unknown>).files)
  );
}

export function isTransferStartMessage(
  value: unknown,
): value is TransferStartMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    candidate.type !== "start" ||
    typeof candidate.payload !== "object" ||
    candidate.payload === null
  ) {
    return false;
  }

  const payload = candidate.payload as Record<string, unknown>;

  return (
    typeof payload.fileName === "string" &&
    payload.fileName.length > 0 &&
    typeof payload.offset === "number" &&
    Number.isFinite(payload.offset) &&
    payload.offset >= 0
  );
}

export function isTransferChunkMessage(
  value: unknown,
): value is TransferChunkMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    candidate.type !== "chunk" ||
    typeof candidate.payload !== "object" ||
    candidate.payload === null
  ) {
    return false;
  }

  const payload = candidate.payload as Record<string, unknown>;

  return (
    typeof payload.fileName === "string" &&
    payload.fileName.length > 0 &&
    typeof payload.offset === "number" &&
    Number.isFinite(payload.offset) &&
    payload.offset >= 0 &&
    payload.bytes instanceof ArrayBuffer &&
    typeof payload.final === "boolean"
  );
}

export function isTransferChunkAckMessage(
  value: unknown,
): value is TransferChunkAckMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    candidate.type !== "chunk_ack" ||
    typeof candidate.payload !== "object" ||
    candidate.payload === null
  ) {
    return false;
  }

  const payload = candidate.payload as Record<string, unknown>;

  return (
    typeof payload.fileName === "string" &&
    payload.fileName.length > 0 &&
    typeof payload.offset === "number" &&
    Number.isFinite(payload.offset) &&
    payload.offset >= 0 &&
    typeof payload.bytesReceived === "number" &&
    Number.isFinite(payload.bytesReceived) &&
    payload.bytesReceived >= 0
  );
}

export function isTransferDoneMessage(
  value: unknown,
): value is TransferDoneMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return candidate.type === "done" && candidate.payload === null;
}

export function isTransferErrorMessage(
  value: unknown,
): value is TransferErrorMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    candidate.type !== "error" ||
    typeof candidate.payload !== "object" ||
    candidate.payload === null
  ) {
    return false;
  }

  const payload = candidate.payload as Record<string, unknown>;

  return typeof payload.message === "string" && payload.message.length > 0;
}

export function getUnexpectedHandshakeMessageError(
  value: unknown,
  expectedMessageType: "request_info" | "info",
) {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return `Unexpected handshake payload. Expected ${expectedMessageType}.`;
  }

  const candidate = value as Record<string, unknown>;
  const messageType =
    typeof candidate.type === "string" ? candidate.type : "unknown";

  return `Unexpected handshake message "${messageType}". Expected ${expectedMessageType}.`;
}

export function getUnexpectedExecutionMessageError(
  value: unknown,
  expectedMessageTypes: TransferMessage["type"][],
) {
  const expectedLabel = expectedMessageTypes.join(", ");

  if (typeof value !== "object" || value === null || !("type" in value)) {
    return `Unexpected transfer payload. Expected one of: ${expectedLabel}.`;
  }

  const candidate = value as Record<string, unknown>;
  const messageType =
    typeof candidate.type === "string" ? candidate.type : "unknown";

  return `Unexpected transfer message "${messageType}". Expected one of: ${expectedLabel}.`;
}