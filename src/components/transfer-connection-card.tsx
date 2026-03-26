import {
  getTransferConnectionStatusLabel,
  isTerminalTransferConnectionStatus,
} from "@/lib/transfer-connection";
import { TransferConnectionState } from "@/types/transfer-connection";

type TransferConnectionCardProps = {
  connection: TransferConnectionState;
};

function getConnectionHint(connection: TransferConnectionState) {
  switch (connection.status) {
    case "waiting_for_peer":
      return "Waiting for the other browser to join this transfer session.";
    case "connecting":
      return "The receiver is attempting to open the live PeerJS data channel.";
    case "connected":
      return "The browser-to-browser data channel is open. The first metadata handshake is next.";
    case "syncing_metadata":
      return "The receiver has requested transfer info and the sender is responding with file metadata.";
    case "ready":
      return "The live channel and initial metadata handshake are complete. Transfer start can be wired next.";
    case "closed":
      return "The live peer channel closed before transfer started.";
    default:
      return "The live channel hit a transport or protocol error before transfer started.";
  }
}

export function TransferConnectionCard({
  connection,
}: TransferConnectionCardProps) {
  const statusLabel = getTransferConnectionStatusLabel(connection.status);
  const showRemotePeer =
    connection.remotePeerId !== null || connection.status !== "idle";

  return (
    <div className="mt-6 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-left">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        Connection
      </p>

      <div className="mt-3 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Role</span>
          <span className="font-medium capitalize text-zinc-200">
            {connection.role}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Status</span>
          <span className="font-medium text-zinc-200">{statusLabel}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Local peer</span>
          <span className="font-medium text-zinc-200">
            {connection.localPeerId ?? "Not assigned"}
          </span>
        </div>

        {showRemotePeer && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Remote peer</span>
            <span className="font-medium text-zinc-200">
              {connection.remotePeerId ?? "Waiting..."}
            </span>
          </div>
        )}

        {connection.sessionId && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">Session</span>
            <span className="font-medium text-zinc-200">
              {connection.sessionId}
            </span>
          </div>
        )}
      </div>

      {connection.errorMessage && (
        <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3">
          <p className="text-sm text-red-200">{connection.errorMessage}</p>
        </div>
      )}

      {!isTerminalTransferConnectionStatus(connection.status) && (
        <p className="mt-4 text-xs text-zinc-500">
          {getConnectionHint(connection)}
        </p>
      )}
    </div>
  );
}