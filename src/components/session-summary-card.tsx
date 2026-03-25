import {
  SenderSessionKeepaliveStatus,
  TransferSession,
} from "@/types/session";

type SessionSummaryCardProps = {
  session: TransferSession;
  formatBytes: (bytes: number) => string;
  keepaliveStatus: SenderSessionKeepaliveStatus;
  lastKeepaliveAt: string | null;
  isClosingSession: boolean;
  onCloseSession: () => void;
};

function getKeepaliveStatusLabel(status: SenderSessionKeepaliveStatus) {
  switch (status) {
    case "idle":
      return "Idle";
    case "active":
      return "Active";
    case "error":
      return "Error";
  }
}

function getSessionStatusLabel(status: TransferSession["status"]) {
  switch (status) {
    case "ready":
      return "Ready";
    case "closed":
      return "Closed";
  }
}

export function SessionSummaryCard({
  session,
  formatBytes,
  keepaliveStatus,
  lastKeepaliveAt,
  isClosingSession,
  onCloseSession,
}: SessionSummaryCardProps) {
  const canCloseSession = session.status !== "closed" && !isClosingSession;

  return (
    <div className="mt-6 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-left">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          Current session
        </p>

        <button
          type="button"
          onClick={onCloseSession}
          disabled={!canCloseSession}
          className="inline-flex items-center rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500 enabled:hover:border-zinc-500 enabled:hover:bg-zinc-950"
        >
          {session.status === "closed"
            ? "Closed"
            : isClosingSession
              ? "Closing..."
              : "Close session"}
        </button>
      </div>

      <div className="mt-3 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Session ID</span>
          <span className="font-medium text-zinc-200">{session.id}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Status</span>
          <span className="font-medium text-zinc-200">
            {getSessionStatusLabel(session.status)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Sender peer</span>
          <span className="font-medium text-zinc-200">
            {session.senderPeerId}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Files</span>
          <span className="font-medium text-zinc-200">{session.fileCount}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Total size</span>
          <span className="font-medium text-zinc-200">
            {formatBytes(session.totalSize)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Keepalive</span>
          <span className="font-medium text-zinc-200">
            {getKeepaliveStatusLabel(keepaliveStatus)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Last renewed</span>
          <span className="font-medium text-zinc-200">
            {lastKeepaliveAt
              ? new Date(lastKeepaliveAt).toLocaleTimeString()
              : "Not yet"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Expires</span>
          <span className="font-medium text-zinc-200">
            {new Date(session.expiresAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {session.status === "closed" && (
        <div className="mt-4 rounded-xl border border-amber-900/60 bg-amber-950/40 px-4 py-3">
          <p className="text-sm text-amber-200">
            This transfer session is closed and no longer available to
            receivers.
          </p>
        </div>
      )}

      {keepaliveStatus === "error" && session.status !== "closed" && (
        <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3">
          <p className="text-sm text-red-200">
            Session keepalive failed. The link may expire unless it is renewed
            again.
          </p>
        </div>
      )}
    </div>
  );
}