"use client";

import { useEffect, useState } from "react";
import type { DataConnection } from "peerjs";
import {
  createErrorMessage,
  createInfoMessage,
  isTransferChunkAckMessage,
  isTransferChunkMessage,
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

  useEffect(() => {
    if (!connection) {
      setSnapshot(INITIAL_STATE);
      return;
    }

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

      if (
        isTransferStartMessage(value) ||
        isTransferChunkMessage(value) ||
        isTransferChunkAckMessage(value) ||
        isTransferDoneMessage(value)
      ) {
        return;
      }

      if (!isTransferRequestInfoMessage(value)) {
        try {
          connection.send(
            createErrorMessage(
              'Unexpected handshake message. Expected "request_info".',
            ),
          );
        } catch {
          // Best effort only.
        }

        setSnapshot({
          status: "failed",
          deviceInfo: null,
          errorMessage: 'Unexpected handshake message. Expected "request_info".',
        });

        connection.close();
        return;
      }

      try {
        connection.send(
          createInfoMessage({
            files,
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
          deviceInfo: null,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Failed to send transfer metadata.",
        });

        connection.close();
      }
    };

    const handleError = (error: Error) => {
      setSnapshot((current) => ({
        ...current,
        status: "failed",
        errorMessage: error.message,
      }));
    };

    connection.on("data", handleData);
    connection.on("error", handleError);

    return () => {
      connection.off("data", handleData);
      connection.off("error", handleError);
    };
  }, [connection, files]);

  return snapshot;
}