"use client";

import { useEffect, useRef, useState } from "react";
import type { DataConnection } from "peerjs";
import {
  createChunkMessage,
  createErrorMessage,
  getUnexpectedExecutionMessageError,
  isTransferChunkAckMessage,
  isTransferDoneMessage,
  isTransferErrorMessage,
  isTransferStartMessage,
} from "@/lib/transfer-protocol";

const MAX_CHUNK_SIZE = 256 * 1024;

type UseSenderTransferStreamOptions = {
  connection: DataConnection | null;
  files: File[];
};

type SenderTransferStreamSnapshot = {
  status: "idle" | "streaming" | "failed";
  fileName: string | null;
  offset: number;
  bytesSent: number;
  errorMessage: string | null;
};

const INITIAL_STATE: SenderTransferStreamSnapshot = {
  status: "idle",
  fileName: null,
  offset: 0,
  bytesSent: 0,
  errorMessage: null,
};

function findTransferFile(files: File[], fileName: string) {
  return files.find((file) => file.name === fileName) ?? null;
}

export function useSenderTransferStream({
  connection,
  files,
}: UseSenderTransferStreamOptions) {
  const [snapshot, setSnapshot] =
    useState<SenderTransferStreamSnapshot>(INITIAL_STATE);

  const snapshotRef = useRef(snapshot);
  const sendTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!connection) {
      setSnapshot(INITIAL_STATE);

      if (sendTimeoutRef.current !== null) {
        window.clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }

      return;
    }

    let isCancelled = false;

    const clearScheduledSend = () => {
      if (sendTimeoutRef.current !== null) {
        window.clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }
    };

    const failTransfer = (message: string) => {
      clearScheduledSend();

      try {
        connection.send(createErrorMessage(message));
      } catch {
        // Best effort only.
      }

      setSnapshot({
        status: "failed",
        fileName: snapshotRef.current.fileName,
        offset: snapshotRef.current.offset,
        bytesSent: snapshotRef.current.bytesSent,
        errorMessage: message,
      });

      connection.close();
    };

    const streamFileFromOffset = async (file: File, startOffset: number) => {
      let offset = startOffset;

      const sendNextChunk = () => {
        sendTimeoutRef.current = window.setTimeout(async () => {
          if (isCancelled || !connection.open) {
            return;
          }

          const end = Math.min(file.size, offset + MAX_CHUNK_SIZE);
          const final = end >= file.size;

          try {
            const bytes = await file.slice(offset, end).arrayBuffer();

            if (isCancelled || !connection.open) {
              return;
            }

            connection.send(
              createChunkMessage({
                fileName: file.name,
                offset,
                bytes,
                final,
              }),
            );

            const bytesSent = end;

            setSnapshot({
              status: final ? "idle" : "streaming",
              fileName: file.name,
              offset: bytesSent,
              bytesSent,
              errorMessage: null,
            });

            offset = end;

            if (!final) {
              sendNextChunk();
            }
          } catch (error) {
            failTransfer(
              error instanceof Error
                ? error.message
                : "Failed to stream file chunk.",
            );
          }
        }, 0);
      };

      setSnapshot({
        status: "streaming",
        fileName: file.name,
        offset: startOffset,
        bytesSent: startOffset,
        errorMessage: null,
      });

      sendNextChunk();
    };

    const handleData = (value: unknown) => {
      if (isTransferErrorMessage(value)) {
        clearScheduledSend();

        setSnapshot((current) => ({
          ...current,
          status: "failed",
          errorMessage: value.payload.message,
        }));

        connection.close();
        return;
      }

      if (isTransferChunkAckMessage(value) || isTransferDoneMessage(value)) {
        return;
      }

      if (!isTransferStartMessage(value)) {
        if (snapshotRef.current.status === "idle") {
          return;
        }

        failTransfer(
          getUnexpectedExecutionMessageError(value, [
            "start",
            "chunk_ack",
            "done",
          ]),
        );
        return;
      }

      if (snapshotRef.current.status === "streaming") {
        failTransfer("Received a transfer start request while already streaming.");
        return;
      }

      const file = findTransferFile(files, value.payload.fileName);

      if (!file) {
        failTransfer(`Requested file "${value.payload.fileName}" was not found.`);
        return;
      }

      if (value.payload.offset < 0 || value.payload.offset > file.size) {
        failTransfer(
          `Invalid start offset ${value.payload.offset} for "${value.payload.fileName}".`,
        );
        return;
      }

      void streamFileFromOffset(file, value.payload.offset);
    };

    const handleClose = () => {
      clearScheduledSend();
    };

    const handleError = (error: Error) => {
      clearScheduledSend();

      setSnapshot((current) => ({
        ...current,
        status: "failed",
        errorMessage: error.message,
      }));
    };

    connection.on("data", handleData);
    connection.on("close", handleClose);
    connection.on("error", handleError);

    return () => {
      isCancelled = true;
      clearScheduledSend();
      connection.off("data", handleData);
      connection.off("close", handleClose);
      connection.off("error", handleError);
    };
  }, [connection, files]);

  return snapshot;
}