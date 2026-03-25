import { PageShell } from "@/components/page-shell";

type ReceivePageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ReceivePage({ params }: ReceivePageProps) {
  const { sessionId } = await params;

  return (
    <PageShell maxWidth="xl">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
          Receiver
        </p>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
          Incoming transfer
        </h1>

        <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base">
          This page will connect to the sender and download files in upcoming
          commits.
        </p>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Session ID
          </p>
          <p className="mt-2 break-all text-sm text-zinc-200">{sessionId}</p>
        </div>
      </div>
    </PageShell>
  );
}