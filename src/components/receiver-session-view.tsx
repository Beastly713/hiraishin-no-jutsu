"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SessionFileList } from "@/components/session-file-list";
import { TransferConnectionCard } from "@/components/transfer-connection-card";
import { formatBytes } from "@/lib/format";
import { createTransferConnectionState } from "@/lib/transfer-connection";
import { isValidSessionId } from "@/lib/session";
import { useBrowserPeer } from "@/lib/use-browser-peer";
import { useReceiverTransferPeer } from "@/lib/use-receiver-transfer-peer";
import { TransferSession } from "@/types/session";
import { TransferConnectionState } from "@/types/transfer-connection";
import { useReceiverTransferMetadata } from "@/lib/use-receiver-transfer-metadata";

type ReceiverSessionViewProps = {
  sessionId: string;
};

const SESSION_POLL_INTERVAL_MS = 5000;

export function ReceiverSessionView({
  sessionId,
}: ReceiverSessionViewProps) {
  const browserPeer = useBrowserPeer();
  const receiverPeerId = browserPeer.peerId;

  const [session, setSession] = useState<TransferSession | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [transportRetryNonce, setTransportRetryNonce] = useState(0);
  const [connection, setConnection] = useState<TransferConnectionState>(() =>
    createTransferConnectionState({
      role: "receiver",
      sessionId,
    }),
  );

  const isValidId = useMemo(() => isValidSessionId(sessionId), [sessionId]);
  const isClosedSession = session?.status === "closed";

  const receiverTransferPeer = useReceiverTransferPeer({
    peer: browserPeer.peer,
    sessionId: session?.status === "closed" ? null : session?.id ?? null,
    senderPeerId: session?.senderPeerId ?? null,
    enabled:
      !!receiverPeerId &&
      !!session &&
      session.status !== "closed" &&
      session.receiverPeerId === receiverPeerId,
    retryKey: transportRetryNonce,
  });

  const receiverTransferMetadata = useReceiverTransferMetadata({
    connection: receiverTransferPeer.connection,
  });

  useEffect(() => {
    setConnection((current) => ({
      ...current,
      localPeerId: receiverPeerId,
      status:
        browserPeer.status === "failed"
          ? "failed"
          : current.status === "resolving_session" &&
              browserPeer.status === "initializing"
            ? "connecting"
            : current.status,
      errorMessage: browserPeer.errorMessage,
    }));
  }, [browserPeer.errorMessage, browserPeer.status, receiverPeerId]);

  useEffect(() => {
    setConnection((current) => {
      if (receiverTransferPeer.status === "connecting") {
        return {
          ...current,
          remotePeerId: receiverTransferPeer.remotePeerId,
          status: "connecting",
          errorMessage: null,
        };
      }

      if (receiverTransferPeer.status === "connected") {
        return {
          ...current,
          remotePeerId: receiverTransferPeer.remotePeerId,
          status: "connected",
          errorMessage: null,
        };
      }

      if (receiverTransferPeer.status === "failed") {
        return {
          ...current,
          remotePeerId: receiverTransferPeer.remotePeerId,
          status: "failed",
          errorMessage: receiverTransferPeer.errorMessage,
        };
      }

      if (receiverTransferPeer.status === "closed") {
        return {
          ...current,
          remotePeerId: receiverTransferPeer.remotePeerId,
          status:
            current.sessionId && current.remotePeerId
              ? "closed"
              : current.status,
          errorMessage: null,
        };
      }

      return current;
    });
  }, [
    receiverTransferPeer.errorMessage,
    receiverTransferPeer.remotePeerId,
    receiverTransferPeer.status,
  ]);

  useEffect(() => {
    setConnection((current) => {
      if (receiverTransferMetadata.status === "syncing") {
        return {
          ...current,
          status: "syncing_metadata",
          deviceInfo: receiverTransferMetadata.deviceInfo,
          errorMessage: null,
        };
      }

      if (receiverTransferMetadata.status === "ready") {
        const totalBytesTotal =
          receiverTransferMetadata.infoPayload?.files.reduce(
            (sum, file) => sum + file.size,
            0,
          ) ?? current.progress.totalBytesTotal;

        return {
          ...current,
          status: "ready",
          deviceInfo: receiverTransferMetadata.deviceInfo,
          errorMessage: null,
          progress: {
            ...current.progress,
            totalFiles:
              receiverTransferMetadata.infoPayload?.files.length ??
              current.progress.totalFiles,
            totalBytesTotal,
          },
        };
      }

      if (receiverTransferMetadata.status === "failed") {
        return {
          ...current,
          status: "failed",
          errorMessage: receiverTransferMetadata.errorMessage,
        };
      }

      return current;
    });
  }, [
    receiverTransferMetadata.deviceInfo,
    receiverTransferMetadata.errorMessage,
    receiverTransferMetadata.infoPayload,
    receiverTransferMetadata.status,
  ]);

  useEffect(() => {
    if (!isValidId) {
      setSession(null);
      setLookupError("Invalid transfer link.");
      setConnection((current) => ({
        ...current,
        status: "failed",
        localPeerId: receiverPeerId,
        remotePeerId: null,
        errorMessage: "Invalid transfer link.",
      }));
      return;
    }

    if (!receiverPeerId) {
      return;
    }

    let isCancelled = false;
    let intervalId: number | null = null;

    async function loadSession() {
      setConnection((current) => ({
        ...current,
        status:
          current.status === "ready" ||
          current.status === "syncing_metadata" ||
          current.status === "connecting" ||
          current.status === "connected" ||
          current.status === "closed"
            ? current.status
            : "resolving_session",
        localPeerId: receiverPeerId,
        errorMessage: null,
      }));

      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: "GET",
          cache: "no-store",
        });
        const data: unknown = await response.json();

        if (!response.ok) {
          const errorMessage =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Failed to load transfer session.";

          throw new Error(errorMessage);
        }

        if (isCancelled) {
          return;
        }

        const nextSession = data as TransferSession;

        setSession(nextSession);
        setLookupError(null);

        if (nextSession.status === "closed") {
          setConnection((current) => ({
            ...current,
            sessionId: nextSession.id,
            localPeerId: receiverPeerId,
            remotePeerId: nextSession.senderPeerId,
            status: "closed",
            errorMessage: "This transfer session is closed.",
          }));
          return;
        }

        if (nextSession.receiverPeerId !== receiverPeerId) {
          const joinResponse = await fetch(`/api/sessions/${sessionId}/join`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              receiverPeerId,
            }),
          });
          const joinData: unknown = await joinResponse.json();

          if (!joinResponse.ok) {
            const errorMessage =
              typeof joinData === "object" &&
              joinData !== null &&
              "error" in joinData &&
              typeof joinData.error === "string"
                ? joinData.error
                : "Failed to join transfer session.";

            throw new Error(errorMessage);
          }

          if (isCancelled) {
            return;
          }

          const joinedSession = joinData as TransferSession;

          setSession(joinedSession);
          setConnection((current) => ({
            ...current,
            sessionId: joinedSession.id,
            localPeerId: receiverPeerId,
            remotePeerId: joinedSession.senderPeerId,
            status: "connecting",
            errorMessage: null,
          }));
          return;
        }

        setConnection((current) => ({
          ...current,
          sessionId: nextSession.id,
          localPeerId: receiverPeerId,
          remotePeerId: nextSession.senderPeerId,
          status:
            current.status === "ready"
              ? "ready"
              : current.status === "syncing_metadata"
                ? "syncing_metadata"
                : current.status === "connected"
                  ? "connected"
                  : "connecting",
          errorMessage: null,
        }));
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load transfer session.";

        setSession(null);
        setLookupError(errorMessage);
        setConnection((current) => ({
          ...current,
          localPeerId: receiverPeerId,
          remotePeerId: null,
          status: "failed",
          errorMessage,
        }));
      }
    }

    void loadSession();

    intervalId = window.setInterval(() => {
      void loadSession();
    }, SESSION_POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [isValidId, receiverPeerId, retryNonce, sessionId]);

  const handleRetryLookup = () => {
    setRetryNonce((current) => current + 1);
  };

  const handleRetryTransport = () => {
    setTransportRetryNonce((current) => current + 1);
  };

  const isRetrying = connection.status === "resolving_session";

  return (
    <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
        Receiver
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
        Incoming transfer
      </h1>
      <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base">
        Resolve the shared session and prepare for the upcoming direct transfer
        flow.
      </p>

      <div className="mt-8 grid gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Session ID
          </p>
          <p className="mt-2 break-all text-sm text-zinc-200">{sessionId}</p>
        </div>

        <TransferConnectionCard connection={connection} />

        {session && !isClosedSession && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Session status
            </p>
            <p className="mt-2 text-sm text-zinc-200">
              {connection.status === "ready"
                ? "Transfer metadata is synced. The connection is ready for the first transfer actions."
                : connection.status === "syncing_metadata"
                  ? "Live connection is open. Requesting transfer metadata from the sender..."
                  : connection.status === "connected"
                    ? "Receiver is connected to the sender. Metadata exchange is next."
                    : connection.status === "closed"
                      ? "The live browser-to-browser channel was closed. You can try reconnecting while the session remains active."
                      : session.receiverPeerId
                        ? "Receiver joined. Opening live browser-to-browser connection..."
                        : "Joining receiver to session..."}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Session availability is checked every 5 seconds.
            </p>
          </div>
        )}

        {session &&
          !isClosedSession &&
          (connection.status === "closed" || connection.status === "failed") && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Live channel
              </p>
              <p className="mt-2 text-sm text-zinc-200">
                {connection.status === "failed"
                  ? "The peer channel failed before transfer began."
                  : "The peer channel closed before transfer began."}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                The session is still active, so you can retry the live browser connection without creating a new link.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleRetryTransport}
                  className="inline-flex items-center rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
                >
                  Reconnect channel
                </button>
              </div>
            </div>
          )}

        {isClosedSession && session && (
          <div className="rounded-2xl border border-amber-900/60 bg-amber-950/40 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-amber-400">
              Status
            </p>
            <p className="mt-2 text-sm text-amber-100">
              This transfer session is closed.
            </p>
            <p className="mt-1 text-xs text-amber-200/80">
              The sender is no longer keeping this link active, so the transfer
              cannot continue from this page.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRetryLookup}
                disabled={isRetrying}
                className="inline-flex items-center rounded-full border border-amber-800 px-4 py-2 text-sm font-medium text-amber-100 transition disabled:cursor-not-allowed disabled:opacity-60 enabled:hover:bg-amber-900/30"
              >
                {isRetrying ? "Checking..." : "Check again"}
              </button>
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-950"
              >
                Back to sender page
              </Link>
            </div>
          </div>
        )}

        {lookupError && (
          <div className="rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-red-400">
              Status
            </p>
            <p className="mt-2 text-sm text-red-100">{lookupError}</p>
            <p className="mt-1 text-xs text-red-200/80">
              The link may be expired, invalid, or no longer available.
            </p>
            {isValidId && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleRetryLookup}
                  disabled={isRetrying}
                  className="inline-flex items-center rounded-full border border-red-800 px-4 py-2 text-sm font-medium text-red-100 transition disabled:cursor-not-allowed disabled:opacity-60 enabled:hover:bg-red-900/30"
                >
                  {isRetrying ? "Retrying..." : "Retry now"}
                </button>
              </div>
            )}
          </div>
        )}

        {session && (
          <>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Session summary
              </p>
              <div className="mt-3 grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Status</span>
                  <span className="font-medium text-zinc-200">
                    {session.status === "closed" ? "Closed" : "Ready"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Sender peer</span>
                  <span className="font-medium text-zinc-200">
                    {session.senderPeerId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Receiver peer</span>
                  <span className="font-medium text-zinc-200">
                    {session.receiverPeerId ?? "Waiting..."}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Receiver joined</span>
                  <span className="font-medium text-zinc-200">
                    {session.receiverJoinedAt
                      ? new Date(session.receiverJoinedAt).toLocaleTimeString()
                      : "Not yet"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Files</span>
                  <span className="font-medium text-zinc-200">
                    {session.fileCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total size</span>
                  <span className="font-medium text-zinc-200">
                    {formatBytes(session.totalSize)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Expires</span>
                  <span className="font-medium text-zinc-200">
                    {new Date(session.expiresAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <SessionFileList files={session.files} />
          </>
        )}
      </div>
    </div>
  );
}