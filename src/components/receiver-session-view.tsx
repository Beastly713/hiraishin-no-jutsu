"use client";

import { useEffect, useMemo, useState } from "react";
import { SessionFileList } from "@/components/session-file-list";
import { TransferConnectionCard } from "@/components/transfer-connection-card";
import { formatBytes } from "@/lib/format";
import { createPeerId } from "@/lib/peer";
import { createTransferConnectionState } from "@/lib/transfer-connection";
import { isValidSessionId } from "@/lib/session";
import { TransferSession } from "@/types/session";
import { TransferConnectionState } from "@/types/transfer-connection";

type ReceiverSessionViewProps = {
  sessionId: string;
};

const SESSION_POLL_INTERVAL_MS = 5000;

export function ReceiverSessionView({
  sessionId,
}: ReceiverSessionViewProps) {
  const [receiverPeerId] = useState(() => createPeerId());
  const [session, setSession] = useState<TransferSession | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [connection, setConnection] = useState<TransferConnectionState>(() => ({
    ...createTransferConnectionState({
      role: "receiver",
      sessionId,
    }),
    localPeerId: receiverPeerId,
  }));

  const isValidId = useMemo(() => isValidSessionId(sessionId), [sessionId]);

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

    let isCancelled = false;
    let intervalId: number | null = null;

    async function loadSession() {
      setConnection((current) => ({
        ...current,
        status: current.status === "waiting_for_peer" ? current.status : "resolving_session",
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
        setConnection((current) => ({
          ...current,
          sessionId: nextSession.id,
          localPeerId: receiverPeerId,
          remotePeerId: nextSession.senderPeerId,
          status: "waiting_for_peer",
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
  }, [isValidId, receiverPeerId, sessionId]);

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

        {session && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Session status
            </p>
            <p className="mt-2 text-sm text-zinc-200">
              Waiting for sender...
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Checking session availability every 5 seconds.
            </p>
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
                  <span className="text-zinc-400">Sender peer</span>
                  <span className="font-medium text-zinc-200">
                    {session.senderPeerId}
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