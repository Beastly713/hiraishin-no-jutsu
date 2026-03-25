"use client";

import { ChangeEvent, useState } from "react";

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files) {
      return;
    }

    setSelectedFiles(Array.from(files));
  };

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

            <input
              id="file-upload"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            {selectedFiles.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-500">
                No files selected yet.
              </p>
            ) : (
              <div className="mt-8 w-full max-w-md text-left">
                <p className="mb-3 text-sm font-medium text-zinc-300">
                  Selected files
                </p>

                <ul className="space-y-2">
                  {selectedFiles.map((file) => (
                    <li
                      key={`${file.name}-${file.size}`}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200"
                    >
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}