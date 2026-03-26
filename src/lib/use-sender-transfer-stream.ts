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
  fileSize: number;
  offset: number;
  bytesSent: number;
  bytesAcknowledged: number;
  errorMessage: string | null;
};

const INITIAL_STATE: SenderTransferStreamSnapshot = {
  status: "idle",
  fileName: null,
  fileSize: 0,
  offset: 0,
  bytesSent: 0,
  bytesAcknowledged: 0,
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

      setSnapshot((current) => ({
        ...current,
        status: "failed",
        errorMessage: message,
      }));

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

            setSnapshot((current) => ({
              ...current,
              status: "streaming",
              fileName: file.name,
              fileSize: file.size,
              offset: bytesSent,
              bytesSent,
              errorMessage: null,
            }));

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
        fileSize: file.size,
        offset: startOffset,
        bytesSent: startOffset,
        bytesAcknowledged: startOffset,
        errorMessage: null,
      });

      sendNextChunk();
    };

    const handleChunkAck = (fileName: string, bytesReceived: number) => {
      const current = snapshotRef.current;

      if (!current.fileName || current.fileName !== fileName) {
        failTransfer(`Received chunk acknowledgement for unexpected file "${fileName}".`);
        return;
      }

      if (bytesReceived < current.bytesAcknowledged) {
        failTransfer(
          `Received out-of-order acknowledgement for "${fileName}".`,
        );
        return;
      }

      if (bytesReceived > current.bytesSent) {
        failTransfer(
          `Received acknowledgement beyond sent bytes for "${fileName}".`,
        );
        return;
      }

      setSnapshot((previous) => ({
        ...previous,
        bytesAcknowledged: bytesReceived,
        status:
          bytesReceived === previous.fileSize &&
          previous.bytesSent === previous.fileSize
            ? "idle"
            : previous.status,
      }));
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

      if (isTransferDoneMessage(value)) {
        return;
      }

      if (isTransferChunkAckMessage(value)) {
        handleChunkAck(value.payload.fileName, value.payload.bytesReceived);
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