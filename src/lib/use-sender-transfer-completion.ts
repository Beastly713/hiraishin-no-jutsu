"use client";

import { useEffect, useRef, useState } from "react";
import type { DataConnection } from "peerjs";
import {
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

  const completedFilesRef = useRef(completedFiles);
  const totalFilesRef = useRef(totalFiles);
  const hasReceivedDoneRef = useRef(false);

  useEffect(() => {
    completedFilesRef.current = completedFiles;
    totalFilesRef.current = totalFiles;

    if (
      hasReceivedDoneRef.current &&
      totalFiles > 0 &&
      completedFiles === totalFiles
    ) {
      setSnapshot({
        status: "completed",
        errorMessage: null,
      });
    }
  }, [completedFiles, totalFiles]);

  useEffect(() => {
    if (!connection) {
      hasReceivedDoneRef.current = false;
      setSnapshot(INITIAL_STATE);
      return;
    }

    const tryComplete = () => {
      if (
        hasReceivedDoneRef.current &&
        totalFilesRef.current > 0 &&
        completedFilesRef.current === totalFilesRef.current
      ) {
        setSnapshot({
          status: "completed",
          errorMessage: null,
        });
      }
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

      hasReceivedDoneRef.current = true;
      tryComplete();
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