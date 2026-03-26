"use client";

import { useEffect, useState } from "react";
import type Peer from "peerjs";
import type { DataConnection } from "peerjs";

type UseReceiverTransferPeerOptions = {
  peer: Peer | null;
  sessionId: string | null;
  senderPeerId: string | null;
  enabled: boolean;
};

type ReceiverTransferPeerSnapshot = {
  connection: DataConnection | null;
  remotePeerId: string | null;
  status: "idle" | "connecting" | "connected" | "closed" | "failed";
  errorMessage: string | null;
};

const INITIAL_STATE: ReceiverTransferPeerSnapshot = {
  connection: null,
  remotePeerId: null,
  status: "idle",
  errorMessage: null,
};

export function useReceiverTransferPeer({
  peer,
  sessionId,
  senderPeerId,
  enabled,
}: UseReceiverTransferPeerOptions) {
  const [snapshot, setSnapshot] =
    useState<ReceiverTransferPeerSnapshot>(INITIAL_STATE);

  useEffect(() => {
    if (!peer || !senderPeerId || !sessionId || !enabled) {
      setSnapshot(INITIAL_STATE);
      return;
    }

    const connection = peer.connect(senderPeerId, {
      reliable: true,
      metadata: {
        sessionId,
      },
    });

    setSnapshot({
      connection,
      remotePeerId: senderPeerId,
      status: "connecting",
      errorMessage: null,
    });

    const handleOpen = () => {
      setSnapshot({
        connection,
        remotePeerId: senderPeerId,
        status: "connected",
        errorMessage: null,
      });
    };

    const handleClose = () => {
      setSnapshot({
        connection: null,
        remotePeerId: senderPeerId,
        status: "closed",
        errorMessage: null,
      });
    };

    const handleError = (error: Error) => {
      setSnapshot({
        connection: null,
        remotePeerId: senderPeerId,
        status: "failed",
        errorMessage: error.message,
      });
    };

    connection.on("open", handleOpen);
    connection.on("close", handleClose);
    connection.on("error", handleError);

    return () => {
      connection.off("open", handleOpen);
      connection.off("close", handleClose);
      connection.off("error", handleError);

      if (connection.open) {
        connection.close();
      }
    };
  }, [enabled, peer, senderPeerId, sessionId]);

  return snapshot;
}