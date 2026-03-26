import {
  DeviceInfo,
  TransferInfoMessage,
  TransferInfoPayload,
  TransferRequestInfoMessage,
} from "@/types/transfer";

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