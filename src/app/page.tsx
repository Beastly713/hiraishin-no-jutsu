"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { FileList } from "@/components/file-list";
import { PageShell } from "@/components/page-shell";
import { SessionSummaryCard } from "@/components/session-summary-card";
import { TransferCard } from "@/components/transfer-card";
import { TransferConnectionCard } from "@/components/transfer-connection-card";
import { TransferReadyCard } from "@/components/transfer-ready-card";
import { formatBytes } from "@/lib/format";
import { createTransferConnectionState } from "@/lib/transfer-connection";
import { isTransferReadyToStart } from "@/lib/transfer-readiness";
import { useBrowserPeer } from "@/lib/use-browser-peer";
import { useSenderTransferMetadata } from "@/lib/use-sender-transfer-metadata";
import { useSenderTransferPeer } from "@/lib/use-sender-transfer-peer";
import { useSenderTransferStream } from "@/lib/use-sender-transfer-stream";
import {
  SenderSessionKeepaliveStatus,
  TransferFileSummary,
  TransferSession,
} from "@/types/session";
import { TransferConnectionState } from "@/types/transfer-connection";

const SESSION_TOUCH_INTERVAL_MS = 30000;

function toTransferFileSummary(file: File): TransferFileSummary {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [session, setSession] = useState<TransferSession | null>(null);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [createLinkError, setCreateLinkError] = useState<string | null>(null);
  const [keepaliveStatus, setKeepaliveStatus] =
    useState<SenderSessionKeepaliveStatus>("idle");
  const [lastKeepaliveAt, setLastKeepaliveAt] = useState<string | null>(null);
  const [connection, setConnection] = useState<TransferConnectionState>(() =>
    createTransferConnectionState({ role: "sender" }),
  );

  const browserPeer = useBrowserPeer();
  const senderPeerId = browserPeer.peerId;

  const senderTransferPeer = useSenderTransferPeer({
    peer: browserPeer.peer,
    sessionId: session?.status === "closed" ? null : session?.id ?? null,
  });

  const senderTransferMetadata = useSenderTransferMetadata({
    connection: senderTransferPeer.connection,
    files: session?.files ?? [],
  });

  const senderTransferStream = useSenderTransferStream({
    connection: senderTransferPeer.connection,
    files: selectedFiles,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setConnection((current) => ({
      ...current,
      localPeerId: senderPeerId,
      status:
        browserPeer.status === "failed"
          ? "failed"
          : current.status === "idle" && browserPeer.status === "initializing"
            ? "connecting"
            : current.status,
      errorMessage: browserPeer.errorMessage,
    }));
  }, [browserPeer.errorMessage, browserPeer.status, senderPeerId]);

  useEffect(() => {
    setConnection((current) => {
      if (senderTransferMetadata.status === "syncing") {
        return {
          ...current,
          status: "syncing_metadata",
          deviceInfo: senderTransferMetadata.deviceInfo,
          errorMessage: null,
          progress: session
            ? {
                ...current.progress,
                totalFiles: session.fileCount,
                totalBytesTotal: session.totalSize,
              }
            : current.progress,
        };
      }

      if (senderTransferMetadata.status === "ready") {
        return {
          ...current,
          status:
            senderTransferStream.status === "streaming"
              ? "transferring"
              : "ready",
          deviceInfo: senderTransferMetadata.deviceInfo,
          errorMessage: null,
          progress: session
            ? {
                ...current.progress,
                totalFiles: session.fileCount,
                totalBytesTotal: session.totalSize,
              }
            : current.progress,
        };
      }

      if (senderTransferMetadata.status === "failed") {
        return {
          ...current,
          status: "failed",
          errorMessage: senderTransferMetadata.errorMessage,
        };
      }

      return current;
    });
  }, [
    senderTransferMetadata.deviceInfo,
    senderTransferMetadata.errorMessage,
    senderTransferMetadata.status,
    senderTransferStream.status,
    session,
  ]);

  useEffect(() => {
    setConnection((current) => {
      if (senderTransferPeer.status === "connected") {
        return {
          ...current,
          remotePeerId: senderTransferPeer.remotePeerId,
          status:
            current.status === "transferring" ? "transferring" : "connected",
          errorMessage: null,
        };
      }

      if (senderTransferPeer.status === "failed") {
        return {
          ...current,
          remotePeerId: senderTransferPeer.remotePeerId,
          status: "failed",
          errorMessage: senderTransferPeer.errorMessage,
        };
      }

      if (senderTransferPeer.status === "closed") {
        return {
          ...current,
          remotePeerId: senderTransferPeer.remotePeerId,
          status:
            current.sessionId && current.remotePeerId ? "closed" : current.status,
          errorMessage: null,
        };
      }

      if (
        senderTransferPeer.status === "listening" &&
        current.sessionId &&
        current.remotePeerId &&
        current.status !== "ready" &&
        current.status !== "syncing_metadata" &&
        current.status !== "transferring"
      ) {
        return {
          ...current,
          status: "connecting",
          errorMessage: null,
        };
      }

      return current;
    });
  }, [
    senderTransferPeer.errorMessage,
    senderTransferPeer.remotePeerId,
    senderTransferPeer.status,
  ]);

  useEffect(() => {
    if (senderTransferStream.status === "streaming") {
      setConnection((current) => ({
        ...current,
        status: "transferring",
        errorMessage: null,
        progress: {
          ...current.progress,
          fileName: senderTransferStream.fileName,
          fileBytesTransferred: senderTransferStream.bytesAcknowledged,
          fileBytesTotal: senderTransferStream.fileSize,
          totalBytesTransferred: senderTransferStream.bytesAcknowledged,
        },
      }));
      return;
    }

    if (senderTransferStream.status === "failed") {
      setConnection((current) => ({
        ...current,
        status: "failed",
        errorMessage: senderTransferStream.errorMessage,
      }));
      return;
    }

    if (
      senderTransferStream.status === "idle" &&
      senderTransferMetadata.status === "ready"
    ) {
      setConnection((current) => ({
        ...current,
        status: "ready",
        progress: {
          ...current.progress,
          fileName: senderTransferStream.fileName,
          fileBytesTransferred: senderTransferStream.bytesAcknowledged,
          fileBytesTotal: senderTransferStream.fileSize,
          totalBytesTransferred: senderTransferStream.bytesAcknowledged,
        },
      }));
    }
  }, [
    senderTransferMetadata.status,
    senderTransferStream.bytesAcknowledged,
    senderTransferStream.errorMessage,
    senderTransferStream.fileName,
    senderTransferStream.fileSize,
    senderTransferStream.status,
  ]);

  const totalSize = useMemo(() => {
    return selectedFiles.reduce((sum, file) => sum + file.size, 0);
  }, [selectedFiles]);

  useEffect(() => {
    if (!hasCopiedLink) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasCopiedLink(false);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [hasCopiedLink]);

  useEffect(() => {
    if (!session?.id || session.status === "closed" || !senderPeerId) {
      return;
    }

    const sessionId = session.id;
    let isCancelled = false;

    async function touchSession() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/touch`, {
          method: "POST",
        });

        const data: unknown = await response.json();

        if (!response.ok) {
          const errorMessage =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Failed to keep transfer session active.";

          throw new Error(errorMessage);
        }

        if (isCancelled) {
          return;
        }

        const nextSession = data as TransferSession;
        setSession(nextSession);
        setKeepaliveStatus("active");
        setLastKeepaliveAt(new Date().toISOString());

        setConnection((current) => ({
          ...current,
          sessionId: nextSession.id,
          localPeerId: senderPeerId,
          remotePeerId: nextSession.receiverPeerId,
          status:
            current.status === "transferring"
              ? "transferring"
              : current.status === "ready"
                ? "ready"
                : current.status === "syncing_metadata"
                  ? "syncing_metadata"
                  : current.status === "connected"
                    ? "connected"
                    : current.status === "closed" && nextSession.receiverPeerId
                      ? "closed"
                      : nextSession.receiverPeerId
                        ? "connecting"
                        : "waiting_for_peer",
          errorMessage: null,
        }));
      } catch {
        if (isCancelled) {
          return;
        }

        setSession((current) =>
          current
            ? {
                ...current,
                status: "closed",
                expiresAt: new Date().toISOString(),
              }
            : current,
        );

        setKeepaliveStatus("error");

        setConnection((current) => ({
          ...current,
          status: "closed",
          errorMessage: "Transfer session closed after keepalive failure.",
        }));
      }
    }

    const intervalId = window.setInterval(() => {
      void touchSession();
    }, SESSION_TOUCH_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [session?.id, session?.status, senderPeerId]);

  const resetSenderState = () => {
    setSession(null);
    setHasCopiedLink(false);
    setCreateLinkError(null);
    setIsClosingSession(false);
    setKeepaliveStatus("idle");
    setLastKeepaliveAt(null);

    setConnection((current) => ({
      ...current,
      sessionId: null,
      remotePeerId: null,
      status: senderPeerId ? "idle" : "connecting",
      errorMessage: browserPeer.errorMessage,
    }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files) {
      return;
    }

    setSelectedFiles(Array.from(files));
    resetSenderState();
  };

  const handleChooseFiles = () => {
    fileInputRef.current?.click();
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
    resetSenderState();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateLink = async () => {
    if (selectedFiles.length === 0 || isCreatingLink || !senderPeerId) {
      return;
    }

    setIsCreatingLink(true);
    setCreateLinkError(null);
    setHasCopiedLink(false);
    setKeepaliveStatus("idle");
    setLastKeepaliveAt(null);

    setConnection((current) => ({
      ...current,
      status: "connecting",
      errorMessage: null,
    }));

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderPeerId,
          files: selectedFiles.map(toTransferFileSummary),
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to create transfer link.";

        throw new Error(errorMessage);
      }

      const nextSession = data as TransferSession;
      setSession(nextSession);
      setKeepaliveStatus("active");
      setLastKeepaliveAt(new Date().toISOString());

      setConnection((current) => ({
        ...current,
        sessionId: nextSession.id,
        localPeerId: senderPeerId,
        remotePeerId: nextSession.receiverPeerId,
        status: nextSession.receiverPeerId ? "connecting" : "waiting_for_peer",
        errorMessage: null,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create transfer link.";

      setSession(null);
      setCreateLinkError(errorMessage);
      setKeepaliveStatus("error");
      setLastKeepaliveAt(null);

      setConnection((current) => ({
        ...current,
        sessionId: null,
        remotePeerId: null,
        status: "failed",
        errorMessage,
      }));
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session?.id || session.status === "closed" || isClosingSession) {
      return;
    }

    setIsClosingSession(true);

    try {
      const response = await fetch(`/api/sessions/${session.id}/close`, {
        method: "POST",
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to close transfer session.";

          throw new Error(errorMessage);
      }

      const nextSession = data as TransferSession;
      setSession(nextSession);
      setKeepaliveStatus("idle");

      setConnection((current) => ({
        ...current,
        sessionId: nextSession.id,
        localPeerId: senderPeerId,
        remotePeerId: null,
        status: "closed",
        errorMessage: null,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to close transfer session.";

      setConnection((current) => ({
        ...current,
        status: "failed",
        errorMessage,
      }));
    } finally {
      setIsClosingSession(false);
    }
  };

  const handleCopyLink = async () => {
    if (!session?.shareUrl || session.status === "closed") {
      return;
    }

    await navigator.clipboard.writeText(session.shareUrl);
    setHasCopiedLink(true);
  };

  const isReadyToCreateLink =
    selectedFiles.length > 0 &&
    !isCreatingLink &&
    browserPeer.status === "open" &&
    !!senderPeerId &&
    session?.status !== "closed";

  return (
    <PageShell>
      <section className="w-full rounded-3xl border border-zinc-800 bg-zinc-900/60 px-6 py-10 shadow-xl sm:px-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            Sender
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
            Send files directly
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Select files on this device, generate a share link, and prepare for
            direct browser-to-browser delivery.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handleChooseFiles}
              className="inline-flex items-center rounded-full bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
            >
              Choose files
            </button>

            <button
              type="button"
              onClick={handleClearSelection}
              disabled={selectedFiles.length === 0}
              className="inline-flex items-center rounded-full border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-200 transition disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500 enabled:hover:border-zinc-500 enabled:hover:bg-zinc-900"
            >
              Clear selection
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFiles.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">No files selected yet.</p>
          ) : (
            <FileList
              files={selectedFiles}
              totalSizeLabel={formatBytes(totalSize)}
              formatBytes={formatBytes}
            />
          )}

          <TransferCard
            canCreateLink={isReadyToCreateLink}
            isCreatingLink={isCreatingLink}
            shareUrl={session?.status === "closed" ? null : session?.shareUrl ?? null}
            onCreateLink={handleCreateLink}
            onCopyLink={handleCopyLink}
            hasCopiedLink={hasCopiedLink}
            errorMessage={createLinkError}
          />

          <TransferConnectionCard connection={connection} />

          {session && isTransferReadyToStart(connection.status) && (
            <TransferReadyCard
              connection={connection}
              fileCount={session.fileCount}
              totalSize={session.totalSize}
              formatBytes={formatBytes}
            />
          )}

          {session && senderTransferStream.status === "streaming" && (
            <div className="mt-6 w-full max-w-md rounded-2xl border border-blue-900/60 bg-blue-950/30 px-4 py-4 text-left">
              <p className="text-xs uppercase tracking-wide text-blue-400">
                Sender stream
              </p>

              <p className="mt-2 text-sm text-blue-100">
                Streaming file chunks and tracking receiver acknowledgements.
              </p>

              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-blue-200/70">File</span>
                  <span className="font-medium text-blue-100">
                    {senderTransferStream.fileName ?? "Unknown"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-blue-200/70">Bytes sent</span>
                  <span className="font-medium text-blue-100">
                    {formatBytes(senderTransferStream.bytesSent)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-blue-200/70">Bytes acknowledged</span>
                  <span className="font-medium text-blue-100">
                    {formatBytes(senderTransferStream.bytesAcknowledged)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-blue-200/70">Offset</span>
                  <span className="font-medium text-blue-100">
                    {senderTransferStream.offset}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs text-blue-200/80">
                This commit makes sender progress acknowledgement-driven. Multi-file
                sequencing and final transfer completion land next.
              </p>
            </div>
          )}

          {session && senderTransferStream.status === "failed" && (
            <div className="mt-6 w-full max-w-md rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-4 text-left">
              <p className="text-xs uppercase tracking-wide text-red-400">
                Sender stream
              </p>

              <p className="mt-2 text-sm text-red-100">
                {senderTransferStream.errorMessage ?? "Sender-side streaming failed."}
              </p>
            </div>
          )}

          {session && (
            <SessionSummaryCard
              session={session}
              formatBytes={formatBytes}
              keepaliveStatus={keepaliveStatus}
              lastKeepaliveAt={lastKeepaliveAt}
              isClosingSession={isClosingSession}
              onCloseSession={handleCloseSession}
            />
          )}
        </div>
      </section>
    </PageShell>
  );
}