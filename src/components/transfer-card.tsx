type TransferCardProps = {
  canCreateLink: boolean;
  isCreatingLink: boolean;
  shareUrl: string | null;
  onCreateLink: () => void;
  onCopyLink: () => void;
  hasCopiedLink: boolean;
  errorMessage: string | null;
};

export function TransferCard({
  canCreateLink,
  isCreatingLink,
  shareUrl,
  onCreateLink,
  onCopyLink,
  hasCopiedLink,
  errorMessage,
}: TransferCardProps) {
  return (
    <div className="mt-8 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-left">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-200">Transfer link</p>
          <p className="mt-1 text-xs text-zinc-400">
            {shareUrl
              ? "Share link created and ready to send."
              : "Create a temporary transfer link for this file selection."}
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateLink}
          disabled={!canCreateLink}
          className="inline-flex items-center rounded-full px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 enabled:bg-zinc-100 enabled:text-zinc-950 enabled:hover:bg-zinc-200"
        >
          {isCreatingLink ? "Creating..." : "Create link"}
        </button>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3">
          <p className="text-sm text-red-200">{errorMessage}</p>
        </div>
      )}

      {shareUrl && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Share URL
          </p>

          <p className="mt-2 break-all text-sm text-zinc-200">{shareUrl}</p>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onCopyLink}
              className="inline-flex items-center rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
            >
              Copy link
            </button>

            {hasCopiedLink && (
              <span className="text-xs font-medium text-zinc-400">Copied!</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}