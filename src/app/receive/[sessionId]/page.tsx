import { PageShell } from "@/components/page-shell";
import { SessionFileList } from "@/components/session-file-list";
import { formatBytes } from "@/lib/format";
import { getTransferSession } from "@/lib/session-store";
import { isValidSessionId } from "@/lib/session";

type ReceivePageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ReceivePage({ params }: ReceivePageProps) {
  const { sessionId } = await params;

  const isValidId = isValidSessionId(sessionId);
  const session = isValidId ? getTransferSession(sessionId) : null;
  const isMissingSession = isValidId && !session;

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
          Resolve the shared session and prepare for the upcoming direct transfer
          flow.
        </p>

        <div className="mt-8 grid gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Session ID
            </p>
            <p className="mt-2 break-all text-sm text-zinc-200">{sessionId}</p>
          </div>

          {!isValidId && (
            <div className="rounded-2xl border border-amber-900/60 bg-amber-950/40 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-amber-400">
                Status
              </p>
              <p className="mt-2 text-sm text-amber-100">
                Invalid transfer link.
              </p>
              <p className="mt-1 text-xs text-amber-200/80">
                This session id does not match the expected link format.
              </p>
            </div>
          )}

          {isMissingSession && (
            <div className="rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-red-400">
                Status
              </p>
              <p className="mt-2 text-sm text-red-100">
                Transfer session not found.
              </p>
              <p className="mt-1 text-xs text-red-200/80">
                The link may be expired, invalid, or no longer available.
              </p>
            </div>
          )}

          {session && (
            <>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Status
                </p>
                <p className="mt-2 text-sm text-zinc-200">
                  Waiting for sender...
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Session metadata resolved. Peer connection setup comes next.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Session summary
                </p>

                <div className="mt-3 grid gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Files</span>
                    <span className="font-medium text-zinc-200">
                      {session.fileCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Total size</span>
                    <span className="font-medium text-zinc-200">
                      {formatBytes(session.totalSize)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Expires</span>
                    <span className="font-medium text-zinc-200">
                      {new Date(session.expiresAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <SessionFileList files={session.files} />
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}