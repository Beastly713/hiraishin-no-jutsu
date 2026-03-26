"use client";

import { useEffect, useRef, useState } from "react";
import type { DataConnection } from "peerjs";
import { createStartMessage } from "@/lib/transfer-protocol";
import { TransferInfoPayload } from "@/types/transfer";

type ReceiverTransferSequenceOptions = {
  connection: DataConnection | null;
  infoPayload: TransferInfoPayload | null;
  completedFileCount: number;
};

type ReceiverTransferSequenceSnapshot = {
  status: "idle" | "requesting_next" | "waiting" | "complete" | "failed";
  requestedFileName: string | null;
  errorMessage: string | null;
};

const INITIAL_STATE: ReceiverTransferSequenceSnapshot = {
  status: "idle",
  requestedFileName: null,
  errorMessage: null,
};

export function useReceiverTransferSequence({
  connection,
  infoPayload,
  completedFileCount,
}: ReceiverTransferSequenceOptions) {
  const [snapshot, setSnapshot] =
    useState<ReceiverTransferSequenceSnapshot>(INITIAL_STATE);

  const lastHandledCompletedCountRef = useRef(0);

  useEffect(() => {
    if (!connection || !infoPayload) {
      lastHandledCompletedCountRef.current = 0;
      setSnapshot(INITIAL_STATE);
      return;
    }

    if (completedFileCount === 0) {
      return;
    }

    if (completedFileCount <= lastHandledCompletedCountRef.current) {
      return;
    }

    lastHandledCompletedCountRef.current = completedFileCount;

    if (completedFileCount >= infoPayload.files.length) {
      setSnapshot({
        status: "complete",
        requestedFileName: null,
        errorMessage: null,
      });
      return;
    }

    const nextFile = infoPayload.files[completedFileCount];

    setSnapshot({
      status: "requesting_next",
      requestedFileName: nextFile.name,
      errorMessage: null,
    });

    try {
      connection.send(
        createStartMessage({
          fileName: nextFile.name,
          offset: 0,
        }),
      );

      setSnapshot({
        status: "waiting",
        requestedFileName: nextFile.name,
        errorMessage: null,
      });
    } catch (error) {
      setSnapshot({
        status: "failed",
        requestedFileName: nextFile.name,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Failed to request the next file transfer.",
      });
    }
  }, [completedFileCount, connection, infoPayload]);

  return snapshot;
}