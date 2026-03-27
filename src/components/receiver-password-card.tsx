type ReceiverPasswordCardProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

export function ReceiverPasswordCard({
  value,
  onChange,
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}: ReceiverPasswordCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        Password required
      </p>
      <p className="mt-2 text-sm text-zinc-200">
        This transfer is protected. Enter the password from the sender to continue.
      </p>

      <div className="mt-4">
        <label
          htmlFor="receiver-transfer-password"
          className="mb-2 block text-xs uppercase tracking-wide text-zinc-500"
        >
          Password
        </label>
        <input
          id="receiver-transfer-password"
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter transfer password"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-600"
        />
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3">
          <p className="text-sm text-red-200">{errorMessage}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || value.length === 0}
          className="inline-flex items-center rounded-full bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {isSubmitting ? "Checking..." : "Unlock transfer"}
        </button>
        <span className="inline-flex items-center rounded-full border border-zinc-800 px-4 py-3 text-xs text-zinc-400">
          UI only for now
        </span>
      </div>
    </div>
  );
}