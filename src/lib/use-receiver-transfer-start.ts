"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DataConnection } from "peerjs";
import { createStartMessage } from "@/lib/transfer-protocol";
import { TransferInfoPayload } from "@/types/transfer";

type UseReceiverTransferStartOptions = {
  connection: DataConnection | null;
  infoPayload: TransferInfoPayload | null;
};

type ReceiverTransferStartSnapshot = {
  status: "idle" | "starting" | "started" | "failed";
  requestedFileName: string | null;
  errorMessage: string | null;
};

const INITIAL_STATE: ReceiverTransferStartSnapshot = {
  status: "idle",
  requestedFileName: null,
  errorMessage: null,
};

export function useReceiverTransferStart({
  connection,
  infoPayload,
}: UseReceiverTransferStartOptions) {
  const [snapshot, setSnapshot] =
    useState<ReceiverTransferStartSnapshot>(INITIAL_STATE);

  const firstFile = useMemo(() => {
    return infoPayload?.files[0] ?? null;
  }, [infoPayload]);

  useEffect(() => {
    if (!connection || !firstFile) {
      setSnapshot(INITIAL_STATE);
      return;
    }

    setSnapshot((current) => {
      if (
        current.status === "started" &&
        current.requestedFileName === firstFile.name
      ) {
        return current;
      }

      return INITIAL_STATE;
    });
  }, [connection, firstFile]);

  const startTransfer = useCallback(() => {
    if (!connection || !firstFile) {
      setSnapshot({
        status: "failed",
        requestedFileName: null,
        errorMessage: "Transfer metadata is not ready yet.",
      });
      return;
    }

    setSnapshot({
      status: "starting",
      requestedFileName: firstFile.name,
      errorMessage: null,
    });

    try {
      connection.send(
        createStartMessage({
          fileName: firstFile.name,
          offset: 0,
        }),
      );

      setSnapshot({
        status: "started",
        requestedFileName: firstFile.name,
        errorMessage: null,
      });
    } catch (error) {
      setSnapshot({
        status: "failed",
        requestedFileName: firstFile.name,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Failed to request transfer start.",
      });
    }
  }, [connection, firstFile]);

  return {
    ...snapshot,
    canStart:
      !!connection &&
      !!firstFile &&
      snapshot.status !== "starting" &&
      snapshot.status !== "started",
    startTransfer,
  };
}