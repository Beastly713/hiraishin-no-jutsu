"use client";

import { useEffect, useRef, useState } from "react";
import type { DataConnection } from "peerjs";
import {
  createErrorMessage,
  createInfoMessage,
  getUnexpectedHandshakeMessageError,
  isTransferChunkAckMessage,
  isTransferDoneMessage,
  isTransferErrorMessage,
  isTransferRequestInfoMessage,
  isTransferStartMessage,
} from "@/lib/transfer-protocol";
import { TransferFileSummary } from "@/types/session";
import { DeviceInfo } from "@/types/transfer";

type UseSenderTransferMetadataOptions = {
  connection: DataConnection | null;
  files: TransferFileSummary[];
};

type SenderTransferMetadataSnapshot = {
  status: "idle" | "syncing" | "ready" | "failed";
  deviceInfo: DeviceInfo | null;
  errorMessage: string | null;
};

const INITIAL_STATE: SenderTransferMetadataSnapshot = {
  status: "idle",
  deviceInfo: null,
  errorMessage: null,
};

export function useSenderTransferMetadata({
  connection,
  files,
}: UseSenderTransferMetadataOptions) {
  const [snapshot, setSnapshot] =
    useState<SenderTransferMetadataSnapshot>(INITIAL_STATE);

  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!connection) {
      setSnapshot(INITIAL_STATE);
      return;
    }

    const failHandshake = (message: string) => {
      try {
        connection.send(createErrorMessage(message));
      } catch {
        // Best effort only.
      }

      setSnapshot({
        status: "failed",
        deviceInfo: null,
        errorMessage: message,
      });

      connection.close();
    };

    const handleData = (value: unknown) => {
      if (isTransferErrorMessage(value)) {
        setSnapshot({
          status: "failed",
          deviceInfo: null,
          errorMessage: value.payload.message,
        });
        connection.close();
        return;
      }

      const hasCompletedHandshake = snapshotRef.current.status === "ready";

      if (
        hasCompletedHandshake &&
        (isTransferStartMessage(value) ||
          isTransferChunkAckMessage(value) ||
          isTransferDoneMessage(value))
      ) {
        return;
      }

      if (!isTransferRequestInfoMessage(value)) {
        failHandshake(getUnexpectedHandshakeMessageError(value, "request_info"));
        return;
      }

      try {
        connection.send(
          createInfoMessage({
            files: files.map((file) => ({
              name: file.name,
              size: file.size,
              type: file.type,
            })),
          }),
        );

        setSnapshot({
          status: "ready",
          deviceInfo: value.payload,
          errorMessage: null,
        });
      } catch (error) {
        setSnapshot({
          status: "failed",
          deviceInfo: value.payload,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Failed to send transfer metadata.",
        });
      }
    };

    const handleOpen = () => {
      setSnapshot({
        status: "syncing",
        deviceInfo: null,
        errorMessage: null,
      });
    };

    const handleError = (error: Error) => {
      setSnapshot((current) => ({
        ...current,
        status: "failed",
        errorMessage: error.message,
      }));
    };

    connection.on("open", handleOpen);
    connection.on("data", handleData);
    connection.on("error", handleError);

    return () => {
      connection.off("open", handleOpen);
      connection.off("data", handleData);
      connection.off("error", handleError);
    };
  }, [connection, files]);

  return snapshot;
}