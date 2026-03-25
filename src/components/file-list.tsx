type FileListProps = {
  files: File[];
  totalSizeLabel: string;
  formatBytes: (bytes: number) => string;
};

export function FileList({
  files,
  totalSizeLabel,
  formatBytes,
}: FileListProps) {
  return (
    <div className="mt-8 w-full max-w-md text-left">
      <div className="mb-4 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">
        <span className="text-zinc-300">
          {files.length} file{files.length > 1 ? "s" : ""} selected
        </span>
        <span className="text-zinc-400">{totalSizeLabel}</span>
      </div>

      <ul className="space-y-2">
        {files.map((file) => (
          <li
            key={`${file.name}-${file.size}`}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm"
          >
            <span className="truncate pr-4 text-zinc-200">{file.name}</span>
            <span className="shrink-0 text-zinc-400">
              {formatBytes(file.size)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}