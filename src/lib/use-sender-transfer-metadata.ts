"use client";

import { useEffect, useState } from "react";
import type { DataConnection } from "peerjs";
import { createInfoMessage, isTransferRequestInfoMessage } from "@/lib/transfer-protocol";
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
      if (!isTransferRequestInfoMessage(value)) {
        return;
      }

      setSnapshot({
        status: "syncing",
        deviceInfo: value.payload,
        errorMessage: null,
      });

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