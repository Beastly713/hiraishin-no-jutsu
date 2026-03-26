import {
  DeviceInfo,
  TransferErrorMessage,
  TransferInfoMessage,
  TransferInfoPayload,
  TransferRequestInfoMessage,
} from "@/types/transfer";

export type TransferHandshakeMessage =
  | TransferRequestInfoMessage
  | TransferInfoMessage
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