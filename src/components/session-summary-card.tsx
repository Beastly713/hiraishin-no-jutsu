import { TransferSession } from "@/types/session";

type SessionSummaryCardProps = {
  session: TransferSession;
  formatBytes: (bytes: number) => string;
};

export function SessionSummaryCard({
  session,
  formatBytes,
}: SessionSummaryCardProps) {
  return (
    <div className="mt-6 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-left">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        Current session
      </p>

      <div className="mt-3 grid gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Session ID</span>
          <span className="font-medium text-zinc-200">{session.id}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Files</span>
          <span className="font-medium text-zinc-200">{session.fileCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Total size</span>
          <span className="font-medium text-zinc-200">
            {formatBytes(session.totalSize)}
          </span>
        </div>
      </div>
    </div>
  );
}