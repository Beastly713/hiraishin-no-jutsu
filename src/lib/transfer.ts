import { TransferMessage } from "@/types/transfer";

export function isTransferMessage(value: unknown): value is TransferMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("type" in value)) {
    return false;
  }

  return typeof value.type === "string";
}

export function assertTransferMessage(value: unknown): TransferMessage {
  if (!isTransferMessage(value)) {
    throw new Error("Invalid transfer message.");
  }

  return value;
}