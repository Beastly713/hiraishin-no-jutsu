"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DataConnection } from "peerjs";
import {
  createChunkAckMessage,
  createErrorMessage,
  getUnexpectedExecutionMessageError,
  isTransferChunkAckMessage,
  isTransferChunkMessage,
  isTransferDoneMessage,
  isTransferErrorMessage,
  isTransferStartMessage,
} from "@/lib/transfer-protocol";
import { TransferInfoPayload } from "@/types/transfer";

type UseReceiverTransferDownloadOptions = {
  connection: DataConnection | null;
  infoPayload: TransferInfoPayload | null;
};

type ReceiverTransferDownloadSnapshot = {
  status: "idle" | "downloading" | "file_ready" | "failed";
  fileName: string | null;
  fileIndex: number;
  totalFiles: number;
  fileBytesReceived: number;
  fileBytesTotal: number;
  totalBytesReceived: number;
  totalBytesTotal: number;
  downloadUrl: string | null;
  lastAcknowledgedOffset: number;
  errorMessage: string | null;
};

const INITIAL_STATE: ReceiverTransferDownloadSnapshot = {
  status: "idle",
  fileName: null,
  fileIndex: 0,
  totalFiles: 0,
  fileBytesReceived: 0,
  fileBytesTotal: 0,
  totalBytesReceived: 0,
  totalBytesTotal: 0,
  downloadUrl: null,
  lastAcknowledgedOffset: 0,
  errorMessage: null,
};

function findFileIndex(infoPayload: TransferInfoPayload, fileName: string) {
  return infoPayload.files.findIndex((file) => file.name === fileName);
}

export function useReceiverTransferDownload({
  connection,
  infoPayload,
}: UseReceiverTransferDownloadOptions) {
  const [snapshot, setSnapshot] =
    useState<ReceiverTransferDownloadSnapshot>(INITIAL_STATE);

  const chunksRef = useRef<ArrayBuffer[]>([]);
  const currentFileNameRef = useRef<string | null>(null);
  const currentFileBytesRef = useRef(0);
  const currentDownloadUrlRef = useRef<string | null>(null);

  const totalBytesTotal = useMemo(() => {
    return infoPayload?.files.reduce((sum, file) => sum + file.size, 0) ?? 0;
  }, [infoPayload]);

  useEffect(() => {
    if (!connection || !infoPayload) {
      if (currentDownloadUrlRef.current) {
        URL.revokeObjectURL(currentDownloadUrlRef.current);
        currentDownloadUrlRef.current = null;
      }

      chunksRef.current = [];
      currentFileNameRef.current = null;
      currentFileBytesRef.current = 0;
      setSnapshot(INITIAL_STATE);
      return;
    }

    const failTransfer = (message: string) => {
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

    const acknowledgeChunk = (fileName: string, bytesReceived: number) => {
      try {
        connection.send(
          createChunkAckMessage({
            fileName,
            offset: bytesReceived,
            bytesReceived,
          }),
        );
      } catch (error) {
        failTransfer(
          error instanceof Error
            ? error.message
            : "Failed to acknowledge received chunk.",
        );
      }
    };

    const handleData = (value: unknown) => {
      if (isTransferErrorMessage(value)) {
        setSnapshot((current) => ({
          ...current,
          status: "failed",
          errorMessage: value.payload.message,
        }));
        connection.close();
        return;
      }

      if (isTransferChunkAckMessage(value) || isTransferStartMessage(value)) {
        return;
      }

      if (isTransferDoneMessage(value)) {
        return;
      }

      if (!isTransferChunkMessage(value)) {
        return;
      }

      const fileIndex = findFileIndex(infoPayload, value.payload.fileName);

      if (fileIndex === -1) {
        failTransfer(`Received chunk for unknown file "${value.payload.fileName}".`);
        return;
      }

      const fileInfo = infoPayload.files[fileIndex];

      if (currentFileNameRef.current === null) {
        currentFileNameRef.current = value.payload.fileName;
        currentFileBytesRef.current = 0;
        chunksRef.current = [];

        if (currentDownloadUrlRef.current) {
          URL.revokeObjectURL(currentDownloadUrlRef.current);
          currentDownloadUrlRef.current = null;
        }
      }

      if (currentFileNameRef.current !== value.payload.fileName) {
        failTransfer(
          getUnexpectedExecutionMessageError(value, ["chunk", "done"]),
        );
        return;
      }

      if (value.payload.offset !== currentFileBytesRef.current) {
        failTransfer(
          `Unexpected chunk offset ${value.payload.offset} for "${value.payload.fileName}". Expected ${currentFileBytesRef.current}.`,
        );
        return;
      }

      const chunkBytes = value.payload.bytes;
      const nextFileBytesReceived = currentFileBytesRef.current + chunkBytes.byteLength;

      if (nextFileBytesReceived > fileInfo.size) {
        failTransfer(`Received too many bytes for "${value.payload.fileName}".`);
        return;
      }

      chunksRef.current = [...chunksRef.current, chunkBytes];
      currentFileBytesRef.current = nextFileBytesReceived;

      acknowledgeChunk(value.payload.fileName, nextFileBytesReceived);

      const nextSnapshotBase: ReceiverTransferDownloadSnapshot = {
        status: value.payload.final ? "file_ready" : "downloading",
        fileName: fileInfo.name,
        fileIndex: fileIndex + 1,
        totalFiles: infoPayload.files.length,
        fileBytesReceived: nextFileBytesReceived,
        fileBytesTotal: fileInfo.size,
        totalBytesReceived: nextFileBytesReceived,
        totalBytesTotal,
        downloadUrl: null,
        lastAcknowledgedOffset: nextFileBytesReceived,
        errorMessage: null,
      };

      if (value.payload.final) {
        if (nextFileBytesReceived !== fileInfo.size) {
          failTransfer(`Final chunk size mismatch for "${value.payload.fileName}".`);
          return;
        }

        const blob = new Blob(chunksRef.current, {
          type: fileInfo.type || "application/octet-stream",
        });

        const downloadUrl = URL.createObjectURL(blob);

        if (currentDownloadUrlRef.current) {
          URL.revokeObjectURL(currentDownloadUrlRef.current);
        }

        currentDownloadUrlRef.current = downloadUrl;

        setSnapshot({
          ...nextSnapshotBase,
          downloadUrl,
        });

        return;
      }

      setSnapshot(nextSnapshotBase);
    };

    const handleClose = () => {
      // Keep current download URL available for the user.
    };

    const handleError = (error: Error) => {
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
      connection.off("data", handleData);
      connection.off("close", handleClose);
      connection.off("error", handleError);

      if (currentDownloadUrlRef.current) {
        URL.revokeObjectURL(currentDownloadUrlRef.current);
        currentDownloadUrlRef.current = null;
      }

      chunksRef.current = [];
      currentFileNameRef.current = null;
      currentFileBytesRef.current = 0;
    };
  }, [connection, infoPayload, totalBytesTotal]);

  return snapshot;
}