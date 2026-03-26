import { NextResponse } from "next/server";
import { isValidSessionId } from "@/lib/session";
import { closeTransferSession } from "@/lib/session-store";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { sessionId } = await params;

  if (!isValidSessionId(sessionId)) {
    return NextResponse.json(
      { error: "Invalid transfer session id." },
      { status: 400 },
    );
  }

  const session = closeTransferSession(sessionId);

  if (!session) {
    return NextResponse.json(
      { error: "Transfer session not found." },
      { status: 404 },
    );
  }

  return NextResponse.json(session, { status: 200 });
}