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
  fileIndex: number;
  totalFiles: number;
  fileSize: number;
  offset: number;
  bytesSent: number;
  bytesAcknowledged: number;
  totalBytesAcknowledged: number;
  completedFiles: number;
  errorMessage: string | null;
};

type ActiveTransfer = {
  file: File;
  fileIndex: number;
  bytesSent: number;
  bytesAcknowledged: number;
  transferredBytesBeforeCurrent: number;
};

const INITIAL_STATE: SenderTransferStreamSnapshot = {
  status: "idle",
  fileName: null,
  fileIndex: 0,
  totalFiles: 0,
  fileSize: 0,
  offset: 0,
  bytesSent: 0,
  bytesAcknowledged: 0,
  totalBytesAcknowledged: 0,
  completedFiles: 0,
  errorMessage: null,
};

function findTransferFileIndex(files: File[], fileName: string) {
  return files.findIndex((file) => file.name === fileName);
}

function getTransferredBytesBeforeIndex(files: File[], index: number) {
  return files.slice(0, index).reduce((sum, file) => sum + file.size, 0);
}

export function useSenderTransferStream({
  connection,
  files,
}: UseSenderTransferStreamOptions) {
  const [snapshot, setSnapshot] =
    useState<SenderTransferStreamSnapshot>(INITIAL_STATE);

  const snapshotRef = useRef(snapshot);
  const activeTransferRef = useRef<ActiveTransfer | null>(null);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!connection) {
      activeTransferRef.current = null;
      isCancelledRef.current = false;
      setSnapshot(INITIAL_STATE);
      return;
    }

    isCancelledRef.current = false;

    const failTransfer = (message: string) => {
      try {
        connection.send(createErrorMessage(message));
      } catch {
        // Best effort only.
      }

      activeTransferRef.current = null;

      setSnapshot((current) => ({
        ...current,
        status: "failed",
        errorMessage: message,
      }));

      connection.close();
    };

    const sendNextChunk = async () => {
      const activeTransfer = activeTransferRef.current;

      if (!activeTransfer || isCancelledRef.current || !connection.open) {
        return;
      }

      const { file } = activeTransfer;
      const startOffset = activeTransfer.bytesAcknowledged;

      if (startOffset >= file.size) {
        return;
      }

      const endOffset = Math.min(file.size, startOffset + MAX_CHUNK_SIZE);
      const final = endOffset >= file.size;

      try {
        const bytes = await file.slice(startOffset, endOffset).arrayBuffer();

        if (isCancelledRef.current || !connection.open) {
          return;
        }

        connection.send(
          createChunkMessage({
            fileName: file.name,
            offset: startOffset,
            bytes,
            final,
          }),
        );

        activeTransferRef.current = {
          ...activeTransfer,
          bytesSent: endOffset,
        };

        setSnapshot({
          status: "streaming",
          fileName: file.name,
          fileIndex: activeTransfer.fileIndex + 1,
          totalFiles: files.length,
          fileSize: file.size,
          offset: endOffset,
          bytesSent: endOffset,
          bytesAcknowledged: activeTransfer.bytesAcknowledged,
          totalBytesAcknowledged:
            activeTransfer.transferredBytesBeforeCurrent +
            activeTransfer.bytesAcknowledged,
          completedFiles: activeTransfer.fileIndex,
          errorMessage: null,
        });
      } catch (error) {
        failTransfer(
          error instanceof Error
            ? error.message
            : "Failed to stream file chunk.",
        );
      }
    };

    const beginTransfer = async (
      file: File,
      fileIndex: number,
      startOffset: number,
    ) => {
      const transferredBytesBeforeCurrent = getTransferredBytesBeforeIndex(
        files,
        fileIndex,
      );

      activeTransferRef.current = {
        file,
        fileIndex,
        bytesSent: startOffset,
        bytesAcknowledged: startOffset,
        transferredBytesBeforeCurrent,
      };

      setSnapshot({
        status: "streaming",
        fileName: file.name,
        fileIndex: fileIndex + 1,
        totalFiles: files.length,
        fileSize: file.size,
        offset: startOffset,
        bytesSent: startOffset,
        bytesAcknowledged: startOffset,
        totalBytesAcknowledged:
          transferredBytesBeforeCurrent + startOffset,
        completedFiles: fileIndex,
        errorMessage: null,
      });

      await sendNextChunk();
    };

    const handleChunkAck = async (
      fileName: string,
      bytesReceived: number,
    ) => {
      const activeTransfer = activeTransferRef.current;

      if (!activeTransfer || activeTransfer.file.name !== fileName) {
        failTransfer(
          `Received chunk acknowledgement for unexpected file "${fileName}".`,
        );
        return;
      }

      if (bytesReceived < activeTransfer.bytesAcknowledged) {
        failTransfer(`Received out-of-order acknowledgement for "${fileName}".`);
        return;
      }

      if (bytesReceived === activeTransfer.bytesAcknowledged) {
        return;
      }

      if (bytesReceived > activeTransfer.bytesSent) {
        failTransfer(
          `Received acknowledgement beyond sent bytes for "${fileName}".`,
        );
        return;
      }

      const nextActiveTransfer: ActiveTransfer = {
        ...activeTransfer,
        bytesAcknowledged: bytesReceived,
      };

      activeTransferRef.current = nextActiveTransfer;

      const transferCompleted = bytesReceived === activeTransfer.file.size;

      setSnapshot((previous) => ({
        ...previous,
        status: transferCompleted ? "idle" : "streaming",
        fileName: activeTransfer.file.name,
        fileIndex: activeTransfer.fileIndex + 1,
        totalFiles: files.length,
        fileSize: activeTransfer.file.size,
        offset: activeTransfer.bytesSent,
        bytesSent: activeTransfer.bytesSent,
        bytesAcknowledged: bytesReceived,
        totalBytesAcknowledged:
          activeTransfer.transferredBytesBeforeCurrent + bytesReceived,
        completedFiles: transferCompleted
          ? activeTransfer.fileIndex + 1
          : previous.completedFiles,
        errorMessage: null,
      }));

      if (transferCompleted) {
        activeTransferRef.current = null;
        return;
      }

      await sendNextChunk();
    };

    const handleData = (value: unknown) => {
      if (isTransferErrorMessage(value)) {
        activeTransferRef.current = null;

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
        void handleChunkAck(value.payload.fileName, value.payload.bytesReceived);
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

      if (activeTransferRef.current) {
        failTransfer("Received a transfer start request while already streaming.");
        return;
      }

      const fileIndex = findTransferFileIndex(files, value.payload.fileName);

      if (fileIndex === -1) {
        failTransfer(`Requested file "${value.payload.fileName}" was not found.`);
        return;
      }

      const file = files[fileIndex];

      if (value.payload.offset < 0 || value.payload.offset > file.size) {
        failTransfer(
          `Invalid start offset ${value.payload.offset} for "${value.payload.fileName}".`,
        );
        return;
      }

      void beginTransfer(file, fileIndex, value.payload.offset);
    };

    const handleClose = () => {
      activeTransferRef.current = null;
    };

    const handleError = (error: Error) => {
      activeTransferRef.current = null;

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
      isCancelledRef.current = true;
      activeTransferRef.current = null;
      connection.off("data", handleData);
      connection.off("close", handleClose);
      connection.off("error", handleError);
    };
  }, [connection, files]);

  return snapshot;
}