import { NextRequest, NextResponse } from "next/server";
import { isValidPeerId } from "@/lib/peer";
import { isValidSessionId } from "@/lib/session";
import { joinTransferSession } from "@/lib/session-store";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

type JoinSessionRequestBody = {
  receiverPeerId?: unknown;
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

  let body: JoinSessionRequestBody;

  try {
    body = (await request.json()) as JoinSessionRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (
    typeof body.receiverPeerId !== "string" ||
    !isValidPeerId(body.receiverPeerId)
  ) {
    return NextResponse.json(
      { error: "A valid receiver peer id is required." },
      { status: 400 },
    );
  }

  const result = joinTransferSession(sessionId, body.receiverPeerId);

  if (!result.ok) {
    if (result.reason === "unauthorized") {
      return NextResponse.json(
        {
          error:
            "Password verification is required before joining this protected transfer session.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Transfer session not found." },
      { status: 404 },
    );
  }

  return NextResponse.json(result.session, { status: 200 });
}