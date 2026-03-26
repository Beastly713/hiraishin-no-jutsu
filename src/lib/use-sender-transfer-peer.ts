"use client";

import { useEffect, useState } from "react";
import type Peer from "peerjs";
import type { DataConnection } from "peerjs";

type UseSenderTransferPeerOptions = {
  peer: Peer | null;
  sessionId: string | null;
};

type SenderTransferPeerSnapshot = {
  connection: DataConnection | null;
  remotePeerId: string | null;
  status: "idle" | "listening" | "connected" | "closed" | "failed";
  errorMessage: string | null;
};

const INITIAL_STATE: SenderTransferPeerSnapshot = {
  connection: null,
  remotePeerId: null,
  status: "idle",
  errorMessage: null,
};

function isMatchingSessionConnection(
  connection: DataConnection,
  sessionId: string | null,
) {
  if (!sessionId) {
    return false;
  }

  if (
    typeof connection.metadata !== "object" ||
    connection.metadata === null ||
    !("sessionId" in connection.metadata)
  ) {
    return false;
  }

  return connection.metadata.sessionId === sessionId;
}

export function useSenderTransferPeer({
  peer,
  sessionId,
}: UseSenderTransferPeerOptions) {
  const [snapshot, setSnapshot] =
    useState<SenderTransferPeerSnapshot>(INITIAL_STATE);

  useEffect(() => {
    if (!peer || !sessionId) {
      setSnapshot(INITIAL_STATE);
      return;
    }

    let activeConnection: DataConnection | null = null;

    setSnapshot({
      connection: null,
      remotePeerId: null,
      status: "listening",
      errorMessage: null,
    });

    const cleanupActiveConnection = () => {
      if (!activeConnection) {
        return;
      }

      activeConnection.removeAllListeners("open");
      activeConnection.removeAllListeners("close");
      activeConnection.removeAllListeners("error");
      activeConnection = null;
    };

    const handleIncomingConnection = (connection: DataConnection) => {
      if (!isMatchingSessionConnection(connection, sessionId)) {
        connection.close();
        return;
      }

      if (activeConnection && activeConnection !== connection) {
        connection.close();
        return;
      }

      activeConnection = connection;

      setSnapshot({
        connection,
        remotePeerId: connection.peer,
        status: connection.open ? "connected" : "listening",
        errorMessage: null,
      });

      const handleOpen = () => {
        setSnapshot({
          connection,
          remotePeerId: connection.peer,
          status: "connected",
          errorMessage: null,
        });
      };

      const handleClose = () => {
        cleanupActiveConnection();
        setSnapshot({
          connection: null,
          remotePeerId: connection.peer,
          status: "closed",
          errorMessage: null,
        });
      };

      const handleError = (error: Error) => {
        cleanupActiveConnection();
        setSnapshot({
          connection: null,
          remotePeerId: connection.peer,
          status: "failed",
          errorMessage: error.message,
        });
      };

      connection.on("open", handleOpen);
      connection.on("close", handleClose);
      connection.on("error", handleError);
    };

    const handlePeerError = (error: Error) => {
      cleanupActiveConnection();
      setSnapshot({
        connection: null,
        remotePeerId: null,
        status: "failed",
        errorMessage: error.message,
      });
    };

    peer.on("connection", handleIncomingConnection);
    peer.on("error", handlePeerError);

    return () => {
      peer.off("connection", handleIncomingConnection);
      peer.off("error", handlePeerError);

      if (activeConnection) {
        activeConnection.close();
      }

      cleanupActiveConnection();
    };
  }, [peer, sessionId]);

  return snapshot;
}