"use client";

import { useEffect, useState } from "react";
import type { DataConnection } from "peerjs";
import {
  createErrorMessage,
  isTransferDoneMessage,
  isTransferErrorMessage,
} from "@/lib/transfer-protocol";

type UseSenderTransferCompletionOptions = {
  connection: DataConnection | null;
  completedFiles: number;
  totalFiles: number;
};

type SenderTransferCompletionSnapshot = {
  status: "idle" | "completed" | "failed";
  errorMessage: string | null;
};

const INITIAL_STATE: SenderTransferCompletionSnapshot = {
  status: "idle",
  errorMessage: null,
};

export function useSenderTransferCompletion({
  connection,
  completedFiles,
  totalFiles,
}: UseSenderTransferCompletionOptions) {
  const [snapshot, setSnapshot] =
    useState<SenderTransferCompletionSnapshot>(INITIAL_STATE);

  useEffect(() => {
    if (!connection) {
      setSnapshot(INITIAL_STATE);
      return;
    }

    const failTransfer = (message: string) => {
      try {
        connection.send(createErrorMessage(message));
      } catch {
        // Best effort only.
      }

      setSnapshot({
        status: "failed",
        errorMessage: message,
      });

      connection.close();
    };

    const handleData = (value: unknown) => {
      if (isTransferErrorMessage(value)) {
        setSnapshot({
          status: "failed",
          errorMessage: value.payload.message,
        });
        connection.close();
        return;
      }

      if (!isTransferDoneMessage(value)) {
        return;
      }

      if (totalFiles === 0 || completedFiles !== totalFiles) {
        failTransfer(
          "Received transfer completion before all files were acknowledged.",
        );
        return;
      }

      setSnapshot({
        status: "completed",
        errorMessage: null,
      });
    };

    const handleError = (error: Error) => {
      setSnapshot({
        status: "failed",
        errorMessage: error.message,
      });
    };

    connection.on("data", handleData);
    connection.on("error", handleError);

    return () => {
      connection.off("data", handleData);
      connection.off("error", handleError);
    };
  }, [completedFiles, connection, totalFiles]);

  return snapshot;
}