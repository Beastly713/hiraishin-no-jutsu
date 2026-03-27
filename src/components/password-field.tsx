type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function PasswordField({
  value,
  onChange,
  disabled = false,
}: PasswordFieldProps) {
  return (
    <div className="mt-6 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-left">
      <div>
        <p className="text-sm font-medium text-zinc-200">
          Password protection
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Optionally require a password before a receiver can start the transfer.
        </p>
      </div>

      <div className="mt-4">
        <label
          htmlFor="transfer-password"
          className="mb-2 block text-xs uppercase tracking-wide text-zinc-500"
        >
          Password (optional)
        </label>
        <input
          id="transfer-password"
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder="Enter a password"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-60 focus:border-zinc-600"
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-zinc-500">
        This is sender-side UI only for now. Protection will be enforced in the
        next commits.
      </p>
    </div>
  );
}