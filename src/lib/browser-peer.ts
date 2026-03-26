import Peer from "peerjs";
import { createPeerId } from "@/lib/peer";

export type BrowserPeerStatus =
  | "idle"
  | "initializing"
  | "open"
  | "failed"
  | "closed";

export type BrowserPeerSnapshot = {
  peer: Peer | null;
  peerId: string | null;
  status: BrowserPeerStatus;
  errorMessage: string | null;
};

export function createBrowserPeer(initialPeerId?: string) {
  const requestedPeerId = initialPeerId ?? createPeerId();

  return new Peer(requestedPeerId);
}

export function destroyBrowserPeer(peer: Peer | null) {
  if (!peer) {
    return;
  }

  if (!peer.destroyed) {
    peer.destroy();
  }
}