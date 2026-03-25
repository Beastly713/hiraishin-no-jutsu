type TransferCardProps = {
  canCreateLink: boolean;
};

export function TransferCard({ canCreateLink }: TransferCardProps) {
  return (
    <div className="mt-8 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-left">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-200">Transfer link</p>
          <p className="mt-1 text-xs text-zinc-400">
            Link creation will be wired up in upcoming commits.
          </p>
        </div>

        <button
          type="button"
          disabled={!canCreateLink}
          className="inline-flex items-center rounded-full px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 enabled:bg-zinc-100 enabled:text-zinc-950 enabled:hover:bg-zinc-200"
        >
          Create link
        </button>
      </div>
    </div>
  );
}