"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DataConnection } from "peerjs";
import { getLocalDeviceInfo } from "@/lib/device";
import {
  createErrorMessage,
  createRequestInfoMessage,
  getUnexpectedHandshakeMessageError,
  isTransferChunkMessage,
  isTransferDoneMessage,
  isTransferErrorMessage,
  isTransferInfoMessage,
} from "@/lib/transfer-protocol";
import { DeviceInfo, TransferInfoPayload } from "@/types/transfer";

type UseReceiverTransferMetadataOptions = {
  connection: DataConnection | null;
};

type ReceiverTransferMetadataSnapshot = {
  status: "idle" | "syncing" | "ready" | "failed";
  deviceInfo: DeviceInfo | null;
  infoPayload: TransferInfoPayload | null;
  errorMessage: string | null;
};

const INITIAL_STATE: ReceiverTransferMetadataSnapshot = {
  status: "idle",
  deviceInfo: null,
  infoPayload: null,
  errorMessage: null,
};

export function useReceiverTransferMetadata({
  connection,
}: UseReceiverTransferMetadataOptions) {
  const [snapshot, setSnapshot] =
    useState<ReceiverTransferMetadataSnapshot>(INITIAL_STATE);

  const snapshotRef = useRef(snapshot);
  const deviceInfo = useMemo(() => getLocalDeviceInfo(), []);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!connection) {
      setSnapshot(INITIAL_STATE);
      return;
    }

    const failHandshake = (message: string) => {
      try {
        connection.send(createErrorMessage(message));
      } catch {
        // Best effort only.
      }

      setSnapshot({
        status: "failed",
        deviceInfo,
        infoPayload: null,
        errorMessage: message,
      });

      connection.close();
    };

    const sendRequestInfo = () => {
      try {
        connection.send(createRequestInfoMessage(deviceInfo));
        setSnapshot({
          status: "syncing",
          deviceInfo,
          infoPayload: null,
          errorMessage: null,
        });
      } catch (error) {
        setSnapshot({
          status: "failed",
          deviceInfo,
          infoPayload: null,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Failed to request transfer metadata.",
        });
      }
    };

    const handleOpen = () => {
      sendRequestInfo();
    };

    const handleData = (value: unknown) => {
      if (isTransferErrorMessage(value)) {
        setSnapshot({
          status: "failed",
          deviceInfo,
          infoPayload: null,
          errorMessage: value.payload.message,
        });
        connection.close();
        return;
      }

      const hasCompletedHandshake = snapshotRef.current.status === "ready";

      if (
        hasCompletedHandshake &&
        (isTransferChunkMessage(value) || isTransferDoneMessage(value))
      ) {
        return;
      }

      if (!isTransferInfoMessage(value)) {
        failHandshake(getUnexpectedHandshakeMessageError(value, "info"));
        return;
      }

      setSnapshot({
        status: "ready",
        deviceInfo,
        infoPayload: value.payload,
        errorMessage: null,
      });
    };

    const handleError = (error: Error) => {
      setSnapshot((current) => ({
        ...current,
        status: "failed",
        errorMessage: error.message,
      }));
    };

    connection.on("open", handleOpen);
    connection.on("data", handleData);
    connection.on("error", handleError);

    if (connection.open) {
      sendRequestInfo();
    }

    return () => {
      connection.off("open", handleOpen);
      connection.off("data", handleData);
      connection.off("error", handleError);
    };
  }, [connection, deviceInfo]);

  return snapshot;
}