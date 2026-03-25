import { NextRequest, NextResponse } from "next/server";
import { createTransferSession } from "@/lib/session-store";
import { TransferFileSummary } from "@/types/session";

type CreateSessionRequestBody = {
  files?: unknown;
};

function isValidFileSummary(value: unknown): value is TransferFileSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.name === "string" &&
    candidate.name.length > 0 &&
    typeof candidate.size === "number" &&
    Number.isFinite(candidate.size) &&
    candidate.size >= 0 &&
    typeof candidate.type === "string"
  );
}

export async function POST(request: NextRequest) {
  let body: CreateSessionRequestBody;

  try {
    body = (await request.json()) as CreateSessionRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json(
      { error: "At least one file is required to create a session." },
      { status: 400 },
    );
  }

  if (!body.files.every(isValidFileSummary)) {
    return NextResponse.json(
      { error: "Each file must include a valid name, size, and type." },
      { status: 400 },
    );
  }

  const origin = request.nextUrl.origin;

  const session = createTransferSession({
    files: body.files,
    origin,
  });

  return NextResponse.json(session, { status: 201 });
}