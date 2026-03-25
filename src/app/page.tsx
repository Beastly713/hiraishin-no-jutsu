"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { FileList } from "@/components/file-list";
import { PageShell } from "@/components/page-shell";
import { TransferCard } from "@/components/transfer-card";
import { TransferSession } from "@/types/session";

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function createSessionId() {
  return crypto.randomUUID().slice(0, 8);
}

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [session, setSession] = useState<TransferSession | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalSize = useMemo(() => {
    return selectedFiles.reduce((sum, file) => sum + file.size, 0);
  }, [selectedFiles]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files) {
      return;
    }

    setSelectedFiles(Array.from(files));
    setSession(null);
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
    setSession(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateLink = () => {
    const id = createSessionId();

    setSession({
      id,
      shareUrl: `${window.location.origin}/receive/${id}`,
      fileCount: selectedFiles.length,
      totalSize,
      createdAt: new Date().toISOString(),
    });
  };

  const isReadyToCreateLink = selectedFiles.length > 0;

  return (
    <PageShell maxWidth="2xl">
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

          <div className="mt-8 flex items-center gap-3">
            <label
              htmlFor="file-upload"
              className="inline-flex cursor-pointer items-center rounded-full bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
            >
              Choose files
            </label>

            {selectedFiles.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="inline-flex items-center rounded-full border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
              >
                Clear selection
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {selectedFiles.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">No files selected yet.</p>
          ) : (
            <FileList
              files={selectedFiles}
              totalSizeLabel={formatBytes(totalSize)}
              formatBytes={formatBytes}
            />
          )}

          <TransferCard
            canCreateLink={isReadyToCreateLink}
            shareUrl={session?.shareUrl ?? null}
            onCreateLink={handleCreateLink}
          />
        </div>
      </section>
    </PageShell>
  );
}