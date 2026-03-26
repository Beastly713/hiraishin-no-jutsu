"use client";

import { useEffect, useState } from "react";
import Peer from "peerjs";
import {
  BrowserPeerSnapshot,
  createBrowserPeer,
  destroyBrowserPeer,
} from "@/lib/browser-peer";

type UseBrowserPeerOptions = {
  requestedPeerId?: string;
};

const INITIAL_BROWSER_PEER_STATE: BrowserPeerSnapshot = {
  peer: null,
  peerId: null,
  status: "idle",
  errorMessage: null,
};

export function useBrowserPeer(options: UseBrowserPeerOptions = {}) {
  const [snapshot, setSnapshot] = useState<BrowserPeerSnapshot>(
    INITIAL_BROWSER_PEER_STATE,
  );

  useEffect(() => {
    const peer = createBrowserPeer(options.requestedPeerId);

    setSnapshot({
      peer,
      peerId: null,
      status: "initializing",
      errorMessage: null,
    });

    const handleOpen = (peerId: string) => {
      setSnapshot({
        peer,
        peerId,
        status: "open",
        errorMessage: null,
      });
    };

    const handleClose = () => {
      setSnapshot((current) => ({
        ...current,
        peer: null,
        status: "closed",
      }));
    };

    const handleError = (error: Error) => {
      setSnapshot((current) => ({
        ...current,
        status: "failed",
        errorMessage: error.message,
      }));
    };

    peer.on("open", handleOpen);
    peer.on("close", handleClose);
    peer.on("error", handleError);

    return () => {
      peer.off("open", handleOpen);
      peer.off("close", handleClose);
      peer.off("error", handleError);
      destroyBrowserPeer(peer);
    };
  }, [options.requestedPeerId]);

  return snapshot;
}