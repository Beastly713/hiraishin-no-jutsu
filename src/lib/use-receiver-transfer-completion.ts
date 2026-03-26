"use client";

import { useEffect, useRef, useState } from "react";
import type { DataConnection } from "peerjs";
import {
  createDoneMessage,
  createErrorMessage,
  isTransferErrorMessage,
} from "@/lib/transfer-protocol";

type UseReceiverTransferCompletionOptions = {
  connection: DataConnection | null;
  completedFileCount: number;
  totalFiles: number;
};

type ReceiverTransferCompletionSnapshot = {
  status: "idle" | "sending_done" | "completed" | "failed";
  errorMessage: string | null;
};

const INITIAL_STATE: ReceiverTransferCompletionSnapshot = {
  status: "idle",
  errorMessage: null,
};

export function useReceiverTransferCompletion({
  connection,
  completedFileCount,
  totalFiles,
}: UseReceiverTransferCompletionOptions) {
  const [snapshot, setSnapshot] =
    useState<ReceiverTransferCompletionSnapshot>(INITIAL_STATE);

  const hasSentDoneRef = useRef(false);

  useEffect(() => {
    if (!connection) {
      hasSentDoneRef.current = false;
      setSnapshot(INITIAL_STATE);
      return;
    }

    if (totalFiles === 0 || completedFileCount !== totalFiles) {
      return;
    }

    if (hasSentDoneRef.current) {
      return;
    }

    hasSentDoneRef.current = true;

    setSnapshot({
      status: "sending_done",
      errorMessage: null,
    });

    try {
      connection.send(createDoneMessage());

      setSnapshot({
        status: "completed",
        errorMessage: null,
      });
    } catch (error) {
      setSnapshot({
        status: "failed",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Failed to finalize transfer completion.",
      });
    }
  }, [completedFileCount, connection, totalFiles]);

  useEffect(() => {
    if (!connection) {
      return;
    }

    const handleData = (value: unknown) => {
      if (!isTransferErrorMessage(value)) {
        return;
      }

      setSnapshot({
        status: "failed",
        errorMessage: value.payload.message,
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
  }, [connection]);

  return snapshot;
}