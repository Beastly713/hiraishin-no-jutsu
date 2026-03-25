import { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  maxWidth?: "xl" | "2xl";
};

const maxWidthClassName = {
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
};

export function PageShell({
  children,
  maxWidth = "2xl",
}: PageShellProps) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div
        className={`mx-auto flex min-h-screen w-full flex-col items-center justify-center px-6 py-12 ${maxWidthClassName[maxWidth]}`}
      >
        {children}
      </div>
    </main>
  );
}