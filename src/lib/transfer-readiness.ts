import { TransferConnectionStatus } from "@/types/transfer-connection";

export function isTransferTransportReady(status: TransferConnectionStatus) {
  return (
    status === "connected" ||
    status === "syncing_metadata" ||
    status === "ready"
  );
}

export function isTransferReadyToStart(status: TransferConnectionStatus) {
  return status === "ready";
}