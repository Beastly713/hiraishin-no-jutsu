import { TransferConnectionState } from "@/types/transfer-connection";

type TransferReadyCardProps = {
  connection: TransferConnectionState;
  fileCount: number;
  totalSize: number;
  formatBytes: (bytes: number) => string;
};

function getDeviceLabel(connection: TransferConnectionState) {
  if (!connection.deviceInfo) {
    return "Unknown device";
  }

  const { browserName, osName } = connection.deviceInfo;

  if (browserName === "Unknown" && osName === "Unknown") {
    return "Unknown device";
  }

  if (browserName === "Unknown") {
    return osName;
  }

  if (osName === "Unknown") {
    return browserName;
  }

  return `${browserName} on ${osName}`;
}

export function TransferReadyCard({
  connection,
  fileCount,
  totalSize,
  formatBytes,
}: TransferReadyCardProps) {
  return (
    <div className="mt-6 w-full max-w-2xl rounded-2xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-4 text-left">
      <p className="text-xs uppercase tracking-wide text-emerald-400">
        Transfer readiness
      </p>

      <p className="mt-2 text-sm text-emerald-100">
        Live peer channel and initial metadata handshake are complete.
      </p>

      <p className="mt-1 text-xs text-emerald-200/80">
        This finishes phase 2. The next phase can begin from transfer start and
        file streaming.
      </p>

      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-200/70">Status</span>
          <span className="font-medium text-emerald-100">Ready</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-200/70">Local peer</span>
          <span className="font-medium text-emerald-100">
            {connection.localPeerId ?? "Unknown"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-200/70">Remote peer</span>
          <span className="font-medium text-emerald-100">
            {connection.remotePeerId ?? "Unknown"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-200/70">Remote device</span>
          <span className="font-medium text-emerald-100">
            {getDeviceLabel(connection)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-200/70">Files announced</span>
          <span className="font-medium text-emerald-100">{fileCount}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-200/70">Total size</span>
          <span className="font-medium text-emerald-100">
            {formatBytes(totalSize)}
          </span>
        </div>
      </div>
    </div>
  );
}