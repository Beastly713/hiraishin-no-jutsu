import {
  SenderSessionKeepaliveStatus,
  TransferSession,
} from "@/types/session";

type SessionSummaryCardProps = {
  session: TransferSession;
  formatBytes: (bytes: number) => string;
  keepaliveStatus: SenderSessionKeepaliveStatus;
  lastKeepaliveAt: string | null;
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

export function SessionSummaryCard({
  session,
  formatBytes,
  keepaliveStatus,
  lastKeepaliveAt,
}: SessionSummaryCardProps) {
  return (
    <div className="mt-6 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-left">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        Current session
      </p>

      <div className="mt-3 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Session ID</span>
          <span className="font-medium text-zinc-200">{session.id}</span>
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

      {keepaliveStatus === "error" && (
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