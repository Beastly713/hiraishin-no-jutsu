import { NextRequest, NextResponse } from "next/server";
import { isValidSessionId } from "@/lib/session";
import { verifyTransferSessionPassword } from "@/lib/session-store";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

type VerifyPasswordRequestBody = {
  password?: unknown;
};

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  const { sessionId } = await params;

  if (!isValidSessionId(sessionId)) {
    return NextResponse.json(
      { error: "Invalid transfer session id." },
      { status: 400 },
    );
  }

  let body: VerifyPasswordRequestBody;

  try {
    body = (await request.json()) as VerifyPasswordRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (typeof body.password !== "string") {
    return NextResponse.json(
      { error: "A password is required." },
      { status: 400 },
    );
  }

  const result = verifyTransferSessionPassword(sessionId, body.password);

  if (result === null) {
    return NextResponse.json(
      { error: "Transfer session not found." },
      { status: 404 },
    );
  }

  if (!result) {
    return NextResponse.json(
      { error: "Incorrect password." },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}