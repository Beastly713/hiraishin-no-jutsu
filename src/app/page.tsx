export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-zinc-400">
            hiraishin-no-jutsu
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Send files directly between browsers
          </h1>

          <p className="mt-6 text-base leading-7 text-zinc-300 sm:text-lg">
            A peer-to-peer file sharing app. Fast,
            browser-based, and simple.
          </p>
        </div>

        <section className="mt-12 w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/40 px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Upload files
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
              Choose one or more files to prepare a shareable transfer link.
            </p>

            <label
              htmlFor="file-upload"
              className="mt-8 inline-flex cursor-pointer items-center rounded-full bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
            >
              Choose files
            </label>

            <input id="file-upload" type="file" multiple className="hidden" />

            <p className="mt-4 text-xs text-zinc-500">
              File selection will be wired up in the next commit.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}