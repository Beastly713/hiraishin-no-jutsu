"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SessionFileList } from "@/components/session-file-list";
import { TransferConnectionCard } from "@/components/transfer-connection-card";
import { TransferReadyCard } from "@/components/transfer-ready-card";
import { formatBytes } from "@/lib/format";
import { createTransferConnectionState } from "@/lib/transfer-connection";
import { isTransferReadyToStart } from "@/lib/transfer-readiness";
import { isValidSessionId } from "@/lib/session";
import { useBrowserPeer } from "@/lib/use-browser-peer";
import { useReceiverTransferCompletion } from "@/lib/use-receiver-transfer-completion";
import { useReceiverTransferDownload } from "@/lib/use-receiver-transfer-download";
import { useReceiverTransferMetadata } from "@/lib/use-receiver-transfer-metadata";
import { useReceiverTransferPeer } from "@/lib/use-receiver-transfer-peer";
import { useReceiverTransferSequence } from "@/lib/use-receiver-transfer-sequence";
import { useReceiverTransferStart } from "@/lib/use-receiver-transfer-start";
import { TransferSession } from "@/types/session";
import { TransferConnectionState } from "@/types/transfer-connection";

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

  const receiverTransferStart = useReceiverTransferStart({
    connection: receiverTransferPeer.connection,
    infoPayload: receiverTransferMetadata.infoPayload,
  });

  const receiverTransferDownload = useReceiverTransferDownload({
    connection: receiverTransferPeer.connection,
    infoPayload: receiverTransferMetadata.infoPayload,
  });

  const receiverTransferSequence = useReceiverTransferSequence({
    connection: receiverTransferPeer.connection,
    infoPayload: receiverTransferMetadata.infoPayload,
    completedFileCount: receiverTransferDownload.completedDownloads.length,
  });

  const receiverTransferCompletion = useReceiverTransferCompletion({
    connection: receiverTransferPeer.connection,
    completedFileCount: receiverTransferDownload.completedDownloads.length,
    totalFiles: receiverTransferMetadata.infoPayload?.files.length ?? 0,
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
            current.sessionId && current.remotePeerId ? "closed" : current.status,
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
    setConnection((current) => {
      if (
        receiverTransferDownload.status === "downloading" ||
        receiverTransferDownload.status === "file_ready"
      ) {
        return {
          ...current,
          status: "transferring",
          errorMessage: null,
          progress: {
            ...current.progress,
            fileName: receiverTransferDownload.fileName,
            fileIndex: receiverTransferDownload.fileIndex,
            totalFiles:
              receiverTransferDownload.totalFiles || current.progress.totalFiles,
            fileBytesTransferred: receiverTransferDownload.fileBytesReceived,
            fileBytesTotal: receiverTransferDownload.fileBytesTotal,
            totalBytesTransferred: receiverTransferDownload.totalBytesReceived,
            totalBytesTotal:
              receiverTransferDownload.totalBytesTotal ||
              current.progress.totalBytesTotal,
          },
        };
      }

      if (receiverTransferDownload.status === "failed") {
        return {
          ...current,
          status: "failed",
          errorMessage: receiverTransferDownload.errorMessage,
        };
      }

      return current;
    });
  }, [
    receiverTransferDownload.errorMessage,
    receiverTransferDownload.fileBytesReceived,
    receiverTransferDownload.fileBytesTotal,
    receiverTransferDownload.fileIndex,
    receiverTransferDownload.fileName,
    receiverTransferDownload.status,
    receiverTransferDownload.totalBytesReceived,
    receiverTransferDownload.totalBytesTotal,
    receiverTransferDownload.totalFiles,
  ]);

  useEffect(() => {
    if (receiverTransferSequence.status !== "failed") {
      return;
    }

    setConnection((current) => ({
      ...current,
      status: "failed",
      errorMessage: receiverTransferSequence.errorMessage,
    }));
  }, [receiverTransferSequence.errorMessage, receiverTransferSequence.status]);

  useEffect(() => {
    if (receiverTransferCompletion.status === "completed") {
      setConnection((current) => ({
        ...current,
        status: "completed",
        errorMessage: null,
        progress: {
          ...current.progress,
          fileName: null,
          fileBytesTransferred: current.progress.fileBytesTotal,
          totalBytesTransferred: current.progress.totalBytesTotal,
        },
      }));
      return;
    }

    if (receiverTransferCompletion.status === "failed") {
      setConnection((current) => ({
        ...current,
        status: "failed",
        errorMessage: receiverTransferCompletion.errorMessage,
      }));
    }
  }, [
    receiverTransferCompletion.errorMessage,
    receiverTransferCompletion.status,
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
          current.status === "transferring" ||
          current.status === "completed" ||
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
            current.status === "completed"
              ? "completed"
              : current.status === "transferring"
                ? "transferring"
                : current.status === "ready"
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

        {isTransferReadyToStart(connection.status) && (
          <TransferReadyCard
            connection={connection}
            fileCount={
              connection.progress.totalFiles > 0
                ? connection.progress.totalFiles
                : session?.fileCount ?? 0
            }
            totalSize={
              connection.progress.totalBytesTotal > 0
                ? connection.progress.totalBytesTotal
                : session?.totalSize ?? 0
            }
            formatBytes={formatBytes}
          />
        )}

        {connection.status === "ready" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Transfer start
            </p>

            <p className="mt-2 text-sm text-zinc-200">
              {receiverTransferStart.status === "started"
                ? `Transfer start requested for ${receiverTransferStart.requestedFileName}.`
                : "The live channel is ready. Start the first file request from the receiver side."}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              The first request is manual. After that, the receiver will request
              subsequent files sequentially.
            </p>

            {receiverTransferStart.errorMessage && (
              <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3">
                <p className="text-sm text-red-200">
                  {receiverTransferStart.errorMessage}
                </p>
              </div>
            )}

            <div className="mt-4">
              <button
                type="button"
                onClick={receiverTransferStart.startTransfer}
                disabled={!receiverTransferStart.canStart}
                className="inline-flex items-center rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500 enabled:hover:border-zinc-500 enabled:hover:bg-zinc-900"
              >
                {receiverTransferStart.status === "starting"
                  ? "Starting..."
                  : receiverTransferStart.status === "started"
                    ? "Transfer requested"
                    : "Start transfer"}
              </button>
            </div>
          </div>
        )}

        {(receiverTransferDownload.status === "downloading" ||
          receiverTransferDownload.status === "file_ready") && (
          <div className="rounded-2xl border border-blue-900/60 bg-blue-950/30 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-blue-400">
              Receiver download
            </p>

            <p className="mt-2 text-sm text-blue-100">
              {receiverTransferDownload.status === "file_ready"
                ? "The current file has been fully received."
                : "Receiving real file chunks over the live peer channel."}
            </p>

            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-blue-200/70">File</span>
                <span className="font-medium text-blue-100">
                  {receiverTransferDownload.fileName ?? "Waiting..."}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-blue-200/70">File progress</span>
                <span className="font-medium text-blue-100">
                  {formatBytes(receiverTransferDownload.fileBytesReceived)} /{" "}
                  {formatBytes(receiverTransferDownload.fileBytesTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-blue-200/70">Total progress</span>
                <span className="font-medium text-blue-100">
                  {formatBytes(receiverTransferDownload.totalBytesReceived)} /{" "}
                  {formatBytes(receiverTransferDownload.totalBytesTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-blue-200/70">File index</span>
                <span className="font-medium text-blue-100">
                  {receiverTransferDownload.fileIndex} /{" "}
                  {receiverTransferDownload.totalFiles}
                </span>
              </div>
            </div>

            {receiverTransferSequence.status === "waiting" &&
              receiverTransferSequence.requestedFileName && (
                <p className="mt-4 text-xs text-blue-200/80">
                  Requested next file: {receiverTransferSequence.requestedFileName}
                </p>
              )}
          </div>
        )}

        {connection.status === "completed" && (
          <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-emerald-400">
              Transfer completed
            </p>

            <p className="mt-2 text-sm text-emerald-100">
              All files were received and the transfer finished successfully.
            </p>

            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-emerald-200/70">Files completed</span>
                <span className="font-medium text-emerald-100">
                  {receiverTransferDownload.completedDownloads.length} /{" "}
                  {receiverTransferMetadata.infoPayload?.files.length ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-emerald-200/70">Total received</span>
                <span className="font-medium text-emerald-100">
                  {formatBytes(connection.progress.totalBytesTransferred)} /{" "}
                  {formatBytes(connection.progress.totalBytesTotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        {receiverTransferDownload.completedDownloads.length > 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Received files
            </p>

            <div className="mt-4 grid gap-3">
              {receiverTransferDownload.completedDownloads.map((download) => (
                <div
                  key={`${download.fileIndex}-${download.fileName}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {download.fileName}
                    </p>
                    <p className="text-xs text-zinc-400">
                      File {download.fileIndex} · {formatBytes(download.fileSize)}
                    </p>
                  </div>

                  <a
                    href={download.downloadUrl}
                    download={download.fileName}
                    className="inline-flex items-center rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {receiverTransferDownload.status === "failed" && (
          <div className="rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-red-400">
              Receiver download
            </p>

            <p className="mt-2 text-sm text-red-100">
              {receiverTransferDownload.errorMessage ??
                "Receiver-side transfer failed."}
            </p>
          </div>
        )}

        {session && !isClosedSession && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Session status
            </p>

            <p className="mt-2 text-sm text-zinc-200">
              {connection.status === "completed"
                ? "The transfer has completed successfully."
                : receiverTransferSequence.status === "waiting"
                  ? `The receiver has requested the next file: ${receiverTransferSequence.requestedFileName}.`
                  : receiverTransferDownload.status === "downloading"
                    ? "The receiver is consuming live file chunks from the sender."
                    : receiverTransferDownload.status === "file_ready"
                      ? "The receiver finished one file and is progressing through the remaining queued files."
                      : receiverTransferStart.status === "started"
                        ? "The receiver has sent the first transfer-start request. Waiting for sender-side chunks."
                        : connection.status === "ready"
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
                  ? "The peer channel failed before transfer completed."
                  : "The peer channel closed before transfer completed."}
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                The session is still active, so you can retry the live browser
                connection without creating a new link.
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