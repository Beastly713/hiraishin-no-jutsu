import { TransferFileSummary } from "@/types/session";
import { formatBytes } from "@/lib/format";

type SessionFileListProps = {
  files: TransferFileSummary[];
};

export function SessionFileList({ files }: SessionFileListProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Files</p>

      <ul className="mt-3 space-y-2">
        {files.map((file) => (
          <li
            key={`${file.name}-${file.size}-${file.type}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate text-zinc-200">{file.name}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {file.type || "Unknown file type"}
              </p>
            </div>

            <span className="shrink-0 text-zinc-400">
              {formatBytes(file.size)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}