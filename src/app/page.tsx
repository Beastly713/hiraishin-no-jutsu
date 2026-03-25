export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-zinc-400">
          hiraishin-no-jutsu
        </p>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Send files directly between browsers
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
          A peer-to-peer file sharing app. Fast,
          browser-based, and simple.
        </p>

        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-4 text-sm text-zinc-400 shadow-lg">
          Upload flow coming in the next commits.
        </div>
      </div>
    </main>
  );
}